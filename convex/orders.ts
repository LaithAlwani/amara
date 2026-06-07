import {
  internalMutation,
  internalQuery,
  MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";

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

    // TODO(Phase 10): schedule order-confirmation email here.
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
