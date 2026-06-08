import {
  query,
  internalQuery,
  internalMutation,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const addressArg = v.object({
  name: v.string(),
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  province: v.string(),
  postalCode: v.string(),
  country: v.string(),
  phone: v.optional(v.string()),
});

const statusArg = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("past_due"),
  v.literal("canceled"),
);

async function getSettings(ctx: QueryCtx) {
  const s = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
  if (!s) throw new Error("Store settings are not configured.");
  return s;
}

// Discounted Subscribe & Save unit price for a variant.
function discountedUnit(priceCents: number, percent: number): number {
  return Math.round((priceCents * (100 - percent)) / 100);
}

// --- Account: my subscriptions ----------------------------------------------

export const mySubscriptions = query({
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

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    return subs.map((s) => ({
      _id: s._id,
      status: s.status,
      nameSnapshot: s.nameSnapshot,
      variantTitleSnapshot: s.variantTitleSnapshot,
      quantity: s.quantity,
      intervalCount: s.intervalCount,
      unitPriceCents: s.unitPriceCents,
      shippingCents: s.shippingCents,
      currentPeriodEnd: s.currentPeriodEnd ?? null,
    }));
  },
});

// Ownership-checked lookup used by the pause/resume/cancel actions.
export const getOwnedSubscription = internalQuery({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return null;
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub || sub.userId !== user._id) return null;
    return { stripeSubscriptionId: sub.stripeSubscriptionId };
  },
});

// --- Stripe action helpers (called via ctx.runQuery / runMutation) ----------

// The signed-in user + their Stripe customer id (if any), for checkout.
export const getUserForCheckout = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return null;
    return {
      userId: user._id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId ?? null,
    };
  },
});

// Pricing context for building the Stripe recurring line items.
export const getVariantContext = internalQuery({
  args: { variantId: v.id("productVariants") },
  handler: async (ctx, { variantId }) => {
    const variant = await ctx.db.get("productVariants", variantId);
    if (!variant || !variant.active) return null;
    const product = await ctx.db.get("products", variant.productId);
    if (!product || product.status !== "active") return null;
    const settings = await getSettings(ctx);
    const percent = settings.subscriptionDiscountPercent ?? 0;
    return {
      productId: product._id,
      productName: product.name,
      variantTitle: variant.title,
      unitPriceCents: discountedUnit(variant.priceCents, percent),
      shippingCents: settings.flatRateShippingCents,
      taxRatePpm: settings.taxRatePpm ?? 0,
    };
  },
});

export const saveStripeCustomerId = internalMutation({
  args: { userId: v.id("users"), stripeCustomerId: v.string() },
  handler: async (ctx, { userId, stripeCustomerId }) => {
    await ctx.db.patch("users", userId, { stripeCustomerId });
    return null;
  },
});

export const getSubscriptionByStripeId = internalQuery({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, { stripeSubscriptionId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId),
      )
      .unique();
  },
});

// Create or update our subscription record from Stripe. Idempotent by
// stripeSubscriptionId. Prices are derived from the live variant + settings.
export const upsertSubscription = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    userId: v.id("users"),
    email: v.string(),
    variantId: v.id("productVariants"),
    quantity: v.number(),
    intervalCount: v.number(),
    status: statusArg,
    shippingAddress: v.optional(addressArg),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get("productVariants", args.variantId);
    const product = variant
      ? await ctx.db.get("products", variant.productId)
      : null;
    if (!variant || !product) throw new Error("Variant/product missing.");
    const settings = await getSettings(ctx);
    const percent = settings.subscriptionDiscountPercent ?? 0;

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .unique();

    const fields = {
      userId: args.userId,
      email: args.email,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: args.status,
      productId: product._id,
      variantId: variant._id,
      nameSnapshot: product.name,
      variantTitleSnapshot: variant.title,
      quantity: args.quantity,
      intervalCount: args.intervalCount,
      unitPriceCents: discountedUnit(variant.priceCents, percent),
      shippingCents: settings.flatRateShippingCents,
      shippingAddress: args.shippingAddress,
      currentPeriodEnd: args.currentPeriodEnd,
    };

    if (existing) {
      await ctx.db.patch("subscriptions", existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("subscriptions", fields);
  },
});

export const setSubscriptionStatus = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: statusArg,
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, { stripeSubscriptionId, status, currentPeriodEnd }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId),
      )
      .unique();
    if (!sub) return null;
    await ctx.db.patch("subscriptions", sub._id, {
      status,
      ...(currentPeriodEnd !== undefined ? { currentPeriodEnd } : {}),
    });
    return null;
  },
});

// Create a paid fulfillment order for one billing cycle. Idempotent by Stripe
// invoice id; decrements inventory and emails the customer (reusing the
// one-off order-confirmation flow).
export const createCycleOrder = internalMutation({
  args: { stripeSubscriptionId: v.string(), stripeInvoiceId: v.string() },
  handler: async (ctx, { stripeSubscriptionId, stripeInvoiceId }) => {
    const existingOrder = await ctx.db
      .query("orders")
      .withIndex("by_stripeInvoiceId", (q) =>
        q.eq("stripeInvoiceId", stripeInvoiceId),
      )
      .unique();
    if (existingOrder) return { ok: true, dup: true };

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId),
      )
      .unique();
    if (!sub) return { ok: false, missing: true };

    const settings = await getSettings(ctx);
    const subtotalCents = sub.unitPriceCents * sub.quantity;
    const shippingCents = sub.shippingCents;
    const taxCents = settings.taxRatePpm
      ? Math.round(((subtotalCents + shippingCents) * settings.taxRatePpm) / 1_000_000)
      : 0;
    const totalCents = subtotalCents + shippingCents + taxCents;

    const seq = (settings.orderSeq ?? 1000) + 1;
    await ctx.db.patch("settings", settings._id, { orderSeq: seq });

    const orderId = await ctx.db.insert("orders", {
      orderNumber: `AMARA-${seq}`,
      userId: sub.userId,
      email: sub.email,
      emailVerifiedAtPurchase: true,
      status: "paid",
      fulfillmentMethod: "ship",
      fulfillmentStatus: "unfulfilled",
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents,
      currency: "CAD",
      shippingAddress: sub.shippingAddress,
      subscriptionId: sub._id,
      stripeInvoiceId,
      paidAt: Date.now(),
    });

    const variant = await ctx.db.get("productVariants", sub.variantId);
    await ctx.db.insert("orderItems", {
      orderId,
      variantId: sub.variantId,
      productId: sub.productId,
      nameSnapshot: sub.nameSnapshot,
      variantTitleSnapshot: sub.variantTitleSnapshot,
      skuSnapshot: variant?.sku ?? "",
      quantity: sub.quantity,
      unitPriceCents: sub.unitPriceCents,
      lineTotalCents: subtotalCents,
      weightGramsSnapshot: variant?.weightGrams ?? 0,
    });

    if (variant) {
      await ctx.db.patch("productVariants", variant._id, {
        inventoryQty: Math.max(0, variant.inventoryQty - sub.quantity),
      });
    }

    await ctx.scheduler.runAfter(0, internal.emails.sendOrderConfirmation, {
      orderId,
    });
    return { ok: true, orderId };
  },
});
