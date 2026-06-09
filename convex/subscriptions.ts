import {
  query,
  internalQuery,
  internalMutation,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { findOpenCart } from "./cart";
import { awardPoints, pointsEarnedFor } from "./rewards";

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
  v.literal("draft"),
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

function discountedUnit(priceCents: number, percent: number): number {
  return Math.round((priceCents * (100 - percent)) / 100);
}

// Shipping for a subscription box: flat, or free once the subtotal clears the
// configured threshold.
function boxShipping(subtotalCents: number, settings: Doc<"settings">): number {
  const threshold = settings.freeShippingThresholdCents;
  if (threshold !== undefined && subtotalCents >= threshold) return 0;
  return settings.flatRateShippingCents;
}

async function userByIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
}

async function loadItems(ctx: QueryCtx, subscriptionId: Id<"subscriptions">) {
  return await ctx.db
    .query("subscriptionItems")
    .withIndex("by_subscription", (q) => q.eq("subscriptionId", subscriptionId))
    .take(200);
}

// --- Checkout: live subscription quote (read-only) --------------------------

// Mirrors createSubscriptionDraft's pricing without writing — drives the
// "Subscribe & Save" summary on the checkout page.
export const quoteSubscription = query({
  args: { anonId: v.optional(v.string()) },
  handler: async (ctx, { anonId }) => {
    const settings = await getSettings(ctx);
    const percent = settings.subscriptionDiscountPercent ?? 0;
    const threshold = settings.freeShippingThresholdCents ?? null;

    const cart = await findOpenCart(ctx, anonId);
    const items: {
      name: string;
      variantTitle: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
    }[] = [];
    let subtotalCents = 0;
    if (cart) {
      const cartItems = await ctx.db
        .query("cartItems")
        .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
        .take(200);
      for (const ci of cartItems) {
        const variant = await ctx.db.get("productVariants", ci.variantId);
        const product = await ctx.db.get("products", ci.productId);
        if (!variant || !product) continue;
        const unit = discountedUnit(variant.priceCents, percent);
        const line = unit * ci.quantity;
        subtotalCents += line;
        items.push({
          name: product.name,
          variantTitle: variant.title,
          quantity: ci.quantity,
          unitPriceCents: unit,
          lineTotalCents: line,
        });
      }
    }

    const shippingCents = boxShipping(subtotalCents, settings);
    const taxCents = settings.taxRatePpm
      ? Math.round(((subtotalCents + shippingCents) * settings.taxRatePpm) / 1_000_000)
      : 0;
    return {
      empty: items.length === 0,
      items,
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents: subtotalCents + shippingCents + taxCents,
      percent,
      freeShipThreshold: threshold,
      freeShipApplied: shippingCents === 0 && threshold !== null,
    };
  },
});

// --- Account: my subscriptions ----------------------------------------------

export const mySubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await userByIdentity(ctx);
    if (!user) return [];
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    return await Promise.all(
      subs
        .filter((s) => s.status !== "draft")
        .map(async (s) => {
          const items = await loadItems(ctx, s._id);
          return {
            _id: s._id,
            status: s.status,
            intervalCount: s.intervalCount,
            subtotalCents: s.subtotalCents,
            shippingCents: s.shippingCents,
            currentPeriodEnd: s.currentPeriodEnd ?? null,
            items: items.map((i) => ({
              nameSnapshot: i.nameSnapshot,
              variantTitleSnapshot: i.variantTitleSnapshot,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
            })),
          };
        }),
    );
  },
});

export const getOwnedSubscription = internalQuery({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const user = await userByIdentity(ctx);
    if (!user) return null;
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub || sub.userId !== user._id || !sub.stripeSubscriptionId) {
      return null;
    }
    return { stripeSubscriptionId: sub.stripeSubscriptionId };
  },
});

// --- Checkout: create the draft box -----------------------------------------

export const getUserForCheckout = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await userByIdentity(ctx);
    if (!user) return null;
    return {
      userId: user._id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId ?? null,
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

// Snapshot the signed-in user's cart into a draft subscription + items, priced
// with the Subscribe & Save discount. Returns the line data the Stripe action
// needs. The cart is cleared later, on activation.
export const createSubscriptionDraft = internalMutation({
  args: {
    anonId: v.optional(v.string()),
    intervalCount: v.number(),
    email: v.string(),
    stripeCustomerId: v.string(),
    shippingAddress: addressArg,
  },
  handler: async (ctx, args) => {
    const user = await userByIdentity(ctx);
    if (!user) throw new Error("Please sign in to subscribe.");

    const cart = await findOpenCart(ctx, args.anonId);
    if (!cart) throw new Error("Your cart is empty.");
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .take(200);
    if (cartItems.length === 0) throw new Error("Your cart is empty.");

    const settings = await getSettings(ctx);
    const percent = settings.subscriptionDiscountPercent ?? 0;

    type Snap = {
      productId: Id<"products">;
      variantId: Id<"productVariants">;
      nameSnapshot: string;
      variantTitleSnapshot: string;
      skuSnapshot: string;
      quantity: number;
      unitPriceCents: number;
      weightGramsSnapshot: number;
    };
    const snaps: Snap[] = [];
    let subtotalCents = 0;
    for (const ci of cartItems) {
      const variant = await ctx.db.get("productVariants", ci.variantId);
      const product = await ctx.db.get("products", ci.productId);
      if (!variant || !product) continue;
      if (!variant.active || variant.inventoryQty < ci.quantity) {
        throw new Error(`${product.name} is not available in that quantity.`);
      }
      const unit = discountedUnit(variant.priceCents, percent);
      subtotalCents += unit * ci.quantity;
      snaps.push({
        productId: product._id,
        variantId: variant._id,
        nameSnapshot: product.name,
        variantTitleSnapshot: variant.title,
        skuSnapshot: variant.sku,
        quantity: ci.quantity,
        unitPriceCents: unit,
        weightGramsSnapshot: variant.weightGrams,
      });
    }
    if (snaps.length === 0) throw new Error("Your cart is empty.");

    const shippingCents = boxShipping(subtotalCents, settings);
    const taxCents = settings.taxRatePpm
      ? Math.round(((subtotalCents + shippingCents) * settings.taxRatePpm) / 1_000_000)
      : 0;

    // Drop any earlier abandoned drafts for this user so they don't pile up.
    const oldDrafts = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(100);
    for (const d of oldDrafts) {
      if (d.status === "draft") {
        for (const it of await loadItems(ctx, d._id)) {
          await ctx.db.delete("subscriptionItems", it._id);
        }
        await ctx.db.delete("subscriptions", d._id);
      }
    }

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: user._id,
      email: args.email,
      stripeCustomerId: args.stripeCustomerId,
      status: "draft",
      intervalCount: args.intervalCount,
      subtotalCents,
      shippingCents,
      shippingAddress: args.shippingAddress,
      cartId: cart._id,
    });
    for (const s of snaps) {
      await ctx.db.insert("subscriptionItems", { subscriptionId, ...s });
    }

    return {
      subscriptionId,
      lines: snaps.map((s) => ({
        name: `${s.nameSnapshot} (${s.variantTitleSnapshot})`,
        unitPriceCents: s.unitPriceCents,
        quantity: s.quantity,
      })),
      shippingCents,
      taxCents,
    };
  },
});

// --- Activation + lifecycle (webhook-driven) --------------------------------

export const activateSubscription = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    stripeSubscriptionId: v.string(),
    status: statusArg,
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get("subscriptions", args.subscriptionId);
    if (!sub) return null;
    await ctx.db.patch("subscriptions", args.subscriptionId, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: args.status === "draft" ? "active" : args.status,
      currentPeriodEnd: args.currentPeriodEnd,
    });
    // Clear the source cart once.
    if (sub.cartId) {
      const cartItems = await ctx.db
        .query("cartItems")
        .withIndex("by_cart", (q) => q.eq("cartId", sub.cartId!))
        .take(200);
      for (const ci of cartItems) await ctx.db.delete("cartItems", ci._id);
      const cart = await ctx.db.get("carts", sub.cartId);
      if (cart && cart.status === "open") {
        await ctx.db.patch("carts", cart._id, { status: "converted" });
      }
      await ctx.db.patch("subscriptions", args.subscriptionId, {
        cartId: undefined,
      });
    }
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

// Create a paid fulfillment order for one billing cycle of the whole box.
// Idempotent by Stripe invoice id.
export const createCycleOrder = internalMutation({
  args: { stripeSubscriptionId: v.string(), stripeInvoiceId: v.string() },
  handler: async (ctx, { stripeSubscriptionId, stripeInvoiceId }) => {
    const existing = await ctx.db
      .query("orders")
      .withIndex("by_stripeInvoiceId", (q) =>
        q.eq("stripeInvoiceId", stripeInvoiceId),
      )
      .unique();
    if (existing) return { ok: true, dup: true };

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId),
      )
      .unique();
    if (!sub) return { ok: false, missing: true };

    const items = await loadItems(ctx, sub._id);
    if (items.length === 0) return { ok: false, missing: true };

    const settings = await getSettings(ctx);
    const subtotalCents = items.reduce(
      (acc, i) => acc + i.unitPriceCents * i.quantity,
      0,
    );
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

    for (const it of items) {
      await ctx.db.insert("orderItems", {
        orderId,
        variantId: it.variantId,
        productId: it.productId,
        nameSnapshot: it.nameSnapshot,
        variantTitleSnapshot: it.variantTitleSnapshot,
        skuSnapshot: it.skuSnapshot,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
        lineTotalCents: it.unitPriceCents * it.quantity,
        weightGramsSnapshot: it.weightGramsSnapshot,
      });
      const variant = await ctx.db.get("productVariants", it.variantId);
      if (variant) {
        await ctx.db.patch("productVariants", variant._id, {
          inventoryQty: Math.max(0, variant.inventoryQty - it.quantity),
        });
      }
    }

    await awardPoints(ctx, sub.userId, pointsEarnedFor(subtotalCents), orderId);

    await ctx.scheduler.runAfter(0, internal.emails.sendOrderConfirmation, {
      orderId,
    });
    return { ok: true, orderId };
  },
});
