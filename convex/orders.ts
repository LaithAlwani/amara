import {
  internalMutation,
  internalQuery,
  query,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// --- Stripe payment plumbing (internal; called from convex/payments.ts) ----

// Data needed to build a Stripe Checkout Session for an order.
export const getOrderForStripe = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get("orders", orderId);
    if (!order) return null;
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .take(200);
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      email: order.email,
      shippingCents: order.shippingCents,
      discountCents: order.discountCents ?? 0,
      discountCode: order.discountCode ?? null,
      taxCents: order.taxCents,
      items: items.map((i) => ({
        name: i.nameSnapshot,
        variantTitle: i.variantTitleSnapshot,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
      })),
    };
  },
});

export const attachStripeSession = internalMutation({
  args: { orderId: v.id("orders"), sessionId: v.string() },
  handler: async (ctx, { orderId, sessionId }) => {
    const order = await ctx.db.get("orders", orderId);
    if (!order || order.status !== "pending") return null;
    await ctx.db.patch("orders", orderId, {
      stripeCheckoutSessionId: sessionId,
    });
    return null;
  },
});

// Has this webhook event already been handled? (idempotency ledger)
async function alreadyProcessed(
  ctx: MutationCtx,
  eventId: string,
): Promise<boolean> {
  const existing = await ctx.db
    .query("webhookEvents")
    .withIndex("by_source_and_eventId", (q) =>
      q.eq("source", "stripe").eq("eventId", eventId),
    )
    .unique();
  return existing !== null;
}

// Idempotent: mark order paid, decrement inventory, and clear the source cart.
export const finalizeOrderPaid = internalMutation({
  args: {
    sessionId: v.string(),
    paymentIntentId: v.optional(v.string()),
    eventId: v.string(),
  },
  handler: async (ctx, { sessionId, paymentIntentId, eventId }) => {
    if (await alreadyProcessed(ctx, eventId)) return { ok: true, dup: true };

    const order = await ctx.db
      .query("orders")
      .withIndex("by_stripeCheckoutSessionId", (q) =>
        q.eq("stripeCheckoutSessionId", sessionId),
      )
      .unique();

    // Record the event regardless so retries are cheap no-ops.
    await ctx.db.insert("webhookEvents", {
      source: "stripe",
      eventId,
      processedAt: Date.now(),
    });

    if (!order) return { ok: true, missing: true };
    if (order.status !== "pending") return { ok: true, already: order.status };

    await ctx.db.patch("orders", order._id, {
      status: "paid",
      paidAt: Date.now(),
      stripePaymentIntentId: paymentIntentId,
    });

    // Decrement inventory from the immutable order snapshots.
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .take(200);
    for (const item of items) {
      const variant = await ctx.db.get("productVariants", item.variantId);
      if (variant) {
        await ctx.db.patch("productVariants", variant._id, {
          inventoryQty: Math.max(0, variant.inventoryQty - item.quantity),
        });
      }
    }

    // Count the discount redemption (only paid orders consume usage) and record
    // it per-customer so the code can't be reused by the same account/email.
    if (order.discountCode) {
      const code = await ctx.db
        .query("discountCodes")
        .withIndex("by_code", (q) => q.eq("code", order.discountCode!))
        .unique();
      if (code) {
        await ctx.db.patch("discountCodes", code._id, {
          usedCount: code.usedCount + 1,
        });
      }
      await ctx.db.insert("discountRedemptions", {
        code: order.discountCode,
        userId: order.userId,
        email: order.email,
        orderId: order._id,
      });
    }

    // Clear the cart this order came from.
    if (order.cartId) {
      const cartItems = await ctx.db
        .query("cartItems")
        .withIndex("by_cart", (q) => q.eq("cartId", order.cartId!))
        .take(200);
      for (const ci of cartItems) await ctx.db.delete("cartItems", ci._id);
      const cart = await ctx.db.get("carts", order.cartId);
      if (cart && cart.status === "open") {
        await ctx.db.patch("carts", cart._id, { status: "converted" });
      }
    }

    // Send the order-confirmation email out of band (Node runtime, so it can't
    // run inside this transaction). Scheduling is part of the transaction, so a
    // rollback would also drop the scheduled send — no orphan emails.
    await ctx.scheduler.runAfter(0, internal.emails.sendOrderConfirmation, {
      orderId: order._id,
    });
    return { ok: true };
  },
});

// Cancel a still-pending order whose Stripe session expired or failed.
export const cancelPendingOrder = internalMutation({
  args: { sessionId: v.string(), eventId: v.string() },
  handler: async (ctx, { sessionId, eventId }) => {
    if (await alreadyProcessed(ctx, eventId)) return { ok: true, dup: true };
    await ctx.db.insert("webhookEvents", {
      source: "stripe",
      eventId,
      processedAt: Date.now(),
    });
    const order = await ctx.db
      .query("orders")
      .withIndex("by_stripeCheckoutSessionId", (q) =>
        q.eq("stripeCheckoutSessionId", sessionId),
      )
      .unique();
    if (order && order.status === "pending") {
      await ctx.db.patch("orders", order._id, { status: "cancelled" });
    }
    return { ok: true };
  },
});

// --- Account: order history --------------------------------------------------

async function loadOrderItems(ctx: QueryCtx, orderId: Id<"orders">) {
  return await ctx.db
    .query("orderItems")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .take(200);
}

// The signed-in customer's orders, newest first. Identity-derived — never takes
// a userId argument. Returns [] for guests / users with no linked orders.
export const listMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return [];

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    // Only surface orders that actually went through. A `pending` order is just
    // a pre-payment draft; an order cancelled before payment (abandoned at
    // Stripe) never had money attached. We show anything that was ever paid
    // (incl. later refunded/cancelled), keyed off `paidAt`.
    const realOrders = orders
      .filter(
        (o) =>
          o.status === "paid" ||
          o.status === "fulfilled" ||
          o.status === "refunded" ||
          o.paidAt !== undefined,
      )
      .slice(0, 50);

    return await Promise.all(
      realOrders.map(async (order) => {
        const items = await loadOrderItems(ctx, order._id);
        return {
          _id: order._id,
          orderNumber: order.orderNumber,
          createdAt: order._creationTime,
          status: order.status,
          fulfillmentMethod: order.fulfillmentMethod,
          fulfillmentStatus: order.fulfillmentStatus,
          subtotalCents: order.subtotalCents,
          shippingCents: order.shippingCents,
          taxCents: order.taxCents,
          totalCents: order.totalCents,
          items: items.map((i) => ({
            nameSnapshot: i.nameSnapshot,
            variantTitleSnapshot: i.variantTitleSnapshot,
            quantity: i.quantity,
            lineTotalCents: i.lineTotalCents,
          })),
        };
      }),
    );
  },
});

// --- Email: full data for the order-confirmation message --------------------

// Internal: everything the confirmation email needs. Called from the Node
// email action via ctx.runQuery (the action can't touch the db directly).
export const getOrderForEmail = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get("orders", orderId);
    if (!order) return null;

    const items = await loadOrderItems(ctx, orderId);

    let pickupLocation: {
      name: string;
      addressLine1: string;
      city: string;
      province: string;
      postalCode: string;
      instructions: string | null;
    } | null = null;
    if (order.pickupLocationId) {
      const pickup = await ctx.db.get("pickupLocations", order.pickupLocationId);
      if (pickup) {
        pickupLocation = {
          name: pickup.name,
          addressLine1: pickup.addressLine1,
          city: pickup.city,
          province: pickup.province,
          postalCode: pickup.postalCode,
          instructions: pickup.instructions ?? null,
        };
      }
    }

    return {
      orderNumber: order.orderNumber,
      email: order.email,
      status: order.status,
      fulfillmentMethod: order.fulfillmentMethod,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      discountCode: order.discountCode ?? null,
      discountCents: order.discountCents ?? 0,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      shippingAddress: order.shippingAddress ?? null,
      pickupLocation,
      items: items.map((i) => ({
        nameSnapshot: i.nameSnapshot,
        variantTitleSnapshot: i.variantTitleSnapshot,
        quantity: i.quantity,
        lineTotalCents: i.lineTotalCents,
      })),
    };
  },
});
