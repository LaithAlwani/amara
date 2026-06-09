import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { findOpenCart } from "./cart";
import { primaryImage } from "./catalog";
import { evaluateDiscount } from "./discounts";
import { getPointsBalance } from "./rewards";
import { evaluateGiftCard } from "./giftCards";

const fulfillmentValidator = v.union(v.literal("ship"), v.literal("pickup"));

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

async function getSettings(ctx: QueryCtx) {
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
  if (!settings) throw new Error("Store settings are not configured.");
  return settings;
}

async function getActivePickup(ctx: QueryCtx): Promise<Doc<"pickupLocations"> | null> {
  return await ctx.db
    .query("pickupLocations")
    .withIndex("by_active", (q) => q.eq("active", true))
    .first();
}

type Line = {
  item: Doc<"cartItems">;
  variant: Doc<"productVariants">;
  product: Doc<"products">;
};

async function loadLines(ctx: QueryCtx, cartId: Id<"carts">): Promise<Line[]> {
  const items = await ctx.db
    .query("cartItems")
    .withIndex("by_cart", (q) => q.eq("cartId", cartId))
    .take(200);
  const lines: Line[] = [];
  for (const item of items) {
    const variant = await ctx.db.get("productVariants", item.variantId);
    const product = await ctx.db.get("products", item.productId);
    if (variant && product) lines.push({ item, variant, product });
  }
  return lines;
}

function computeTotals(
  subtotalCents: number,
  method: "ship" | "pickup",
  settings: Doc<"settings">,
  discountCents: number = 0,
) {
  const shippingCents =
    method === "ship" ? settings.flatRateShippingCents : 0;
  // Discount applies to the subtotal; tax is then computed on the discounted
  // base plus shipping.
  const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
  const taxableBase = discountedSubtotal + shippingCents;
  const taxCents = settings.taxRatePpm
    ? Math.round((taxableBase * settings.taxRatePpm) / 1_000_000)
    : 0;
  return {
    shippingCents,
    discountCents,
    taxCents,
    totalCents: discountedSubtotal + shippingCents + taxCents,
  };
}

// Live, authoritative quote for the current cart under a chosen fulfillment
// method. Drives the checkout summary and flags any stock problems.
export const quoteCart = query({
  args: {
    anonId: v.optional(v.string()),
    fulfillmentMethod: fulfillmentValidator,
    discountCode: v.optional(v.string()),
    email: v.optional(v.string()),
    pointsToRedeem: v.optional(v.number()),
    giftCardCode: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      anonId,
      fulfillmentMethod,
      discountCode,
      email,
      pointsToRedeem,
      giftCardCode,
    },
  ) => {
    const settings = await getSettings(ctx);
    const pickup = await getActivePickup(ctx);
    const pickupLocation = pickup
      ? {
          _id: pickup._id,
          name: pickup.name,
          addressLine1: pickup.addressLine1,
          city: pickup.city,
          province: pickup.province,
          postalCode: pickup.postalCode,
          country: pickup.country,
          instructions: pickup.instructions ?? null,
        }
      : null;

    const cart = await findOpenCart(ctx, anonId);
    if (!cart) {
      return {
        empty: true,
        items: [],
        subtotalCents: 0,
        shippingCents: 0,
        discountCents: 0,
        appliedCode: null as string | null,
        discountError: null as string | null,
        pointsBalance: 0,
        pointsRedeemed: 0,
        giftCardCode: null as string | null,
        giftCardRedeemedCents: 0,
        giftCardError: null as string | null,
        amountDueCents: 0,
        taxCents: 0,
        totalCents: 0,
        issues: [] as { name: string; reason: string }[],
        pickupLocation,
      };
    }

    const lines = await loadLines(ctx, cart._id);
    let subtotalCents = 0;
    const items = [];
    const issues: { name: string; reason: string }[] = [];

    for (const { item, variant, product } of lines) {
      const lineTotalCents = variant.priceCents * item.quantity;
      subtotalCents += lineTotalCents;
      items.push({
        name: product.name,
        variantTitle: variant.title,
        quantity: item.quantity,
        unitPriceCents: variant.priceCents,
        lineTotalCents,
        image: await primaryImage(ctx, product),
      });
      if (!variant.active || variant.inventoryQty <= 0) {
        issues.push({ name: product.name, reason: "Out of stock" });
      } else if (variant.inventoryQty < item.quantity) {
        issues.push({
          name: product.name,
          reason: `Only ${variant.inventoryQty} left`,
        });
      }
    }

    // Resolve the shopper (account and/or entered email) so the once-per-
    // customer rule can be checked live in the quote.
    const identity = await ctx.auth.getUserIdentity();
    let userId: Id<"users"> | undefined;
    let custEmail = email?.trim().toLowerCase() || undefined;
    if (identity) {
      const u = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier),
        )
        .unique();
      userId = u?._id;
      if (!custEmail) custEmail = (identity.email ?? "").toLowerCase() || undefined;
    }

    const discount = await evaluateDiscount(ctx, discountCode, subtotalCents, {
      userId,
      email: custEmail,
    });
    const codeDiscount = discount.discountCents;

    // Loyalty: redeem points (1 pt = 1¢), capped by balance and the remaining
    // subtotal after any code discount.
    const balance = userId ? await getPointsBalance(ctx, userId) : 0;
    const pointsRedeemed = Math.min(
      Math.max(0, Math.floor(pointsToRedeem ?? 0)),
      balance,
      Math.max(0, subtotalCents - codeDiscount),
    );

    const totals = computeTotals(
      subtotalCents,
      fulfillmentMethod,
      settings,
      codeDiscount + pointsRedeemed,
    );

    // Gift card applies to the order total (post-tax), leaving a small charge.
    const gift = await evaluateGiftCard(ctx, giftCardCode, totals.totalCents);

    return {
      empty: items.length === 0,
      items,
      subtotalCents,
      shippingCents: totals.shippingCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      discountCents: codeDiscount,
      appliedCode: discount.code?.code ?? null,
      discountError: discount.error,
      pointsBalance: balance,
      pointsRedeemed,
      giftCardCode: gift.card?.code ?? null,
      giftCardRedeemedCents: gift.redeemCents,
      giftCardError: gift.error,
      amountDueCents: totals.totalCents - gift.redeemCents,
      issues,
      pickupLocation,
    };
  },
});

export const getActivePickupLocation = query({
  args: {},
  handler: async (ctx) => {
    const pickup = await getActivePickup(ctx);
    if (!pickup) return null;
    return {
      _id: pickup._id,
      name: pickup.name,
      addressLine1: pickup.addressLine1,
      city: pickup.city,
      province: pickup.province,
      postalCode: pickup.postalCode,
      country: pickup.country,
      instructions: pickup.instructions ?? null,
    };
  },
});

// Create a PENDING order from the cart. No payment is taken here — Phase 6
// attaches a Stripe Checkout Session and the webhook flips it to paid.
export const createDraftOrder = mutation({
  args: {
    anonId: v.optional(v.string()),
    email: v.string(),
    fulfillmentMethod: fulfillmentValidator,
    shippingAddress: v.optional(addressArg),
    pickupLocationId: v.optional(v.id("pickupLocations")),
    discountCode: v.optional(v.string()),
    pointsToRedeem: v.optional(v.number()),
    giftCardCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("A valid email is required.");
    }

    const cart = await findOpenCart(ctx, args.anonId);
    if (!cart) throw new Error("Your cart is empty.");
    const lines = await loadLines(ctx, cart._id);
    if (lines.length === 0) throw new Error("Your cart is empty.");

    // Re-validate inventory and recompute the subtotal from live prices.
    let subtotalCents = 0;
    for (const { variant, product, item } of lines) {
      if (!variant.active || variant.inventoryQty < item.quantity) {
        throw new Error(`${product.name} is no longer available in that quantity.`);
      }
      subtotalCents += variant.priceCents * item.quantity;
    }

    // Identity (optional): link order to the account if signed in.
    const identity = await ctx.auth.getUserIdentity();
    let userId: Id<"users"> | undefined;
    let emailVerifiedAtPurchase = false;
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier),
        )
        .unique();
      userId = user?._id;
      emailVerifiedAtPurchase =
        identity.emailVerified === true &&
        (identity.email ?? "").toLowerCase() === email;
    }

    // Re-validate the discount authoritatively at order time, including the
    // once-per-customer rule (by account id and/or checkout email).
    const discount = await evaluateDiscount(ctx, args.discountCode, subtotalCents, {
      userId,
      email,
    });
    if (discount.error) throw new Error(discount.error);

    // Loyalty redemption (1 pt = 1¢), capped by balance and remaining subtotal.
    const codeDiscount = discount.discountCents;
    const balance = userId ? await getPointsBalance(ctx, userId) : 0;
    const pointsRedeemed = Math.min(
      Math.max(0, Math.floor(args.pointsToRedeem ?? 0)),
      balance,
      Math.max(0, subtotalCents - codeDiscount),
    );

    const settings = await getSettings(ctx);
    const { shippingCents, taxCents, totalCents } = computeTotals(
      subtotalCents,
      args.fulfillmentMethod,
      settings,
      codeDiscount + pointsRedeemed,
    );

    // Gift card redemption against the order total.
    const gift = await evaluateGiftCard(ctx, args.giftCardCode, totalCents);

    // Fulfillment-specific requirements.
    let pickupLocationId: Id<"pickupLocations"> | undefined;
    let shippingAddress = undefined;
    if (args.fulfillmentMethod === "ship") {
      if (!args.shippingAddress) throw new Error("A shipping address is required.");
      shippingAddress = args.shippingAddress;
    } else {
      const pickup = args.pickupLocationId
        ? await ctx.db.get("pickupLocations", args.pickupLocationId)
        : await getActivePickup(ctx);
      if (!pickup || !pickup.active) throw new Error("Pickup is unavailable.");
      pickupLocationId = pickup._id;
    }

    // Human order number via a running counter on the settings singleton.
    const seq = (settings.orderSeq ?? 1000) + 1;
    await ctx.db.patch("settings", settings._id, { orderSeq: seq });
    const orderNumber = `AMARA-${seq}`;

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      userId,
      email,
      emailVerifiedAtPurchase,
      status: "pending",
      fulfillmentMethod: args.fulfillmentMethod,
      fulfillmentStatus: "unfulfilled",
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents,
      currency: "CAD",
      shippingAddress,
      pickupLocationId,
      cartId: cart._id,
      discountCode: discount.code?.code,
      discountCents: codeDiscount || undefined,
      pointsRedeemed: pointsRedeemed || undefined,
      giftCardCode: gift.card?.code,
      giftCardRedeemedCents: gift.redeemCents || undefined,
    });

    for (const { variant, product, item } of lines) {
      await ctx.db.insert("orderItems", {
        orderId,
        variantId: variant._id,
        productId: product._id,
        nameSnapshot: product.name,
        variantTitleSnapshot: variant.title,
        skuSnapshot: variant.sku,
        quantity: item.quantity,
        unitPriceCents: variant.priceCents,
        lineTotalCents: variant.priceCents * item.quantity,
        weightGramsSnapshot: variant.weightGrams,
      });
    }

    return { orderId, orderNumber };
  },
});

// Order confirmation by id (the id is an unguessable capability, so this is
// readable without auth for the post-checkout screen).
export const getOrderConfirmation = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
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
      orderNumber: order.orderNumber,
      status: order.status,
      fulfillmentMethod: order.fulfillmentMethod,
      email: order.email,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      discountCode: order.discountCode ?? null,
      discountCents: order.discountCents ?? 0,
      pointsRedeemed: order.pointsRedeemed ?? 0,
      giftCardRedeemedCents: order.giftCardRedeemedCents ?? 0,
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
