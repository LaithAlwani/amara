import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// The server-side authorization boundary for every admin operation. Route
// guards (proxy.ts) only ensure a user is signed in — actual admin access is
// enforced here, so even a hand-crafted client call is rejected.
async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  if (!user || user.role !== "admin") throw new Error("Not authorized");
  return user;
}

// Lightweight check so the admin UI can decide whether to render or redirect,
// without leaking an error. Returns false for guests and non-admins.
export const amIAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    return user?.role === "admin";
  },
});

const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("fulfilled"),
  v.literal("cancelled"),
  v.literal("refunded"),
);

// Admin order list, newest first. Optional status filter (uses by_status).
// Excludes pending drafts by default — they're not real orders to act on.
export const listOrders = query({
  args: { status: v.optional(orderStatusValidator) },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);

    const orders = status
      ? await ctx.db
          .query("orders")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .take(200)
      : (
          await ctx.db.query("orders").order("desc").take(200)
        ).filter((o) => o.status !== "pending");

    return orders.map((o) => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      createdAt: o._creationTime,
      email: o.email,
      status: o.status,
      fulfillmentMethod: o.fulfillmentMethod,
      fulfillmentStatus: o.fulfillmentStatus,
      totalCents: o.totalCents,
    }));
  },
});

// Full order detail for the admin order view.
export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    await requireAdmin(ctx);

    const order = await ctx.db.get("orders", orderId);
    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .take(200);

    let pickupLocation = null;
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
      _id: order._id,
      orderNumber: order.orderNumber,
      createdAt: order._creationTime,
      email: order.email,
      status: order.status,
      fulfillmentMethod: order.fulfillmentMethod,
      fulfillmentStatus: order.fulfillmentStatus,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      paidAt: order.paidAt ?? null,
      stripePaymentIntentId: order.stripePaymentIntentId ?? null,
      shippingAddress: order.shippingAddress ?? null,
      pickupLocation,
      items: items.map((i) => ({
        nameSnapshot: i.nameSnapshot,
        variantTitleSnapshot: i.variantTitleSnapshot,
        skuSnapshot: i.skuSnapshot,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        lineTotalCents: i.lineTotalCents,
      })),
    };
  },
});

// Shared loader for fulfillment transitions: admin-gated, must be a paid order.
async function loadPaidOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
): Promise<Doc<"orders">> {
  await requireAdmin(ctx);
  const order = await ctx.db.get("orders", orderId);
  if (!order) throw new Error("Order not found.");
  if (order.status !== "paid" && order.status !== "fulfilled") {
    throw new Error("Only paid orders can be fulfilled.");
  }
  return order;
}

// Pickup: mark an order ready for the customer to collect.
export const markReadyForPickup = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await loadPaidOrder(ctx, orderId);
    if (order.fulfillmentMethod !== "pickup") {
      throw new Error("This order is not a pickup order.");
    }
    await ctx.db.patch("orders", orderId, {
      fulfillmentStatus: "ready_for_pickup",
    });
    await ctx.scheduler.runAfter(0, internal.emails.sendFulfillmentEmail, {
      orderId,
      kind: "ready_for_pickup",
    });
    return { ok: true };
  },
});

// Pickup: mark an order as collected → order is fulfilled.
export const markPickedUp = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await loadPaidOrder(ctx, orderId);
    if (order.fulfillmentMethod !== "pickup") {
      throw new Error("This order is not a pickup order.");
    }
    await ctx.db.patch("orders", orderId, {
      fulfillmentStatus: "picked_up",
      status: "fulfilled",
    });
    await ctx.scheduler.runAfter(0, internal.emails.sendFulfillmentEmail, {
      orderId,
      kind: "picked_up",
    });
    return { ok: true };
  },
});

// Ship: mark an order as shipped → order is fulfilled. (Real carrier labels +
// tracking arrive with the Shippo adapter in a later phase.)
export const markShipped = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await loadPaidOrder(ctx, orderId);
    if (order.fulfillmentMethod !== "ship") {
      throw new Error("This order is not a shipping order.");
    }
    await ctx.db.patch("orders", orderId, {
      fulfillmentStatus: "shipped",
      status: "fulfilled",
    });
    await ctx.scheduler.runAfter(0, internal.emails.sendFulfillmentEmail, {
      orderId,
      kind: "shipped",
    });
    return { ok: true };
  },
});
