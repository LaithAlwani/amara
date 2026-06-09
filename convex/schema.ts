import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Amara ecommerce — Slice 1 schema.
// Conventions: money is stored as integer cents (CAD). Every table that is
// queried has a named `by_*` index; we never `.filter()` in queries. Child
// rows live in their own tables (no unbounded arrays inside documents).

// Reusable address shape (orders, settings ship-from, pickup locations build their own).
const addressValidator = v.object({
  name: v.string(),
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  province: v.string(),
  postalCode: v.string(),
  country: v.string(),
  phone: v.optional(v.string()),
});

export default defineSchema({
  // --- Identity -----------------------------------------------------------
  users: defineTable({
    tokenIdentifier: v.string(), // canonical owner key from ctx.auth.getUserIdentity()
    clerkUserId: v.string(), // Clerk `subject`
    email: v.string(), // lowercased
    emailVerified: v.boolean(),
    name: v.optional(v.string()),
    role: v.union(v.literal("customer"), v.literal("admin")),
    stripeCustomerId: v.optional(v.string()), // for recurring billing
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_clerkUserId", ["clerkUserId"]),

  // --- Catalog ------------------------------------------------------------
  products: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    shortDescription: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("draft"),
      v.literal("archived"),
    ),
    // Display images: remote/seed URLs and/or uploaded Convex storage ids.
    imageUrls: v.array(v.string()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    priceCents: v.number(), // display price; authoritative price is per-variant
    compareAtCents: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["status"],
    }),

  productVariants: defineTable({
    productId: v.id("products"),
    sku: v.string(),
    title: v.string(), // e.g. "50ml / Lavender"
    optionValues: v.optional(
      v.object({
        size: v.optional(v.string()),
        scent: v.optional(v.string()),
        packageType: v.optional(v.string()),
      }),
    ),
    priceCents: v.number(),
    compareAtCents: v.optional(v.number()),
    inventoryQty: v.number(),
    weightGrams: v.number(), // for the parcel built when an admin buys a label
    lengthCm: v.optional(v.number()),
    widthCm: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    active: v.boolean(),
  })
    .index("by_product", ["productId"])
    .index("by_sku", ["sku"]),

  collections: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("manual"), v.literal("rule")), // manual only for now
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    published: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["published"]),

  collectionProducts: defineTable({
    collectionId: v.id("collections"),
    productId: v.id("products"),
    position: v.number(),
  })
    .index("by_collection_and_position", ["collectionId", "position"])
    .index("by_product", ["productId"]),

  // --- Cart ---------------------------------------------------------------
  carts: defineTable({
    ownerKind: v.union(v.literal("user"), v.literal("anon")),
    tokenIdentifier: v.optional(v.string()), // set for logged-in carts
    anonId: v.optional(v.string()), // opaque guest cookie value
    status: v.union(
      v.literal("open"),
      v.literal("converted"),
      v.literal("abandoned"),
    ),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_anonId", ["anonId"]),

  cartItems: defineTable({
    cartId: v.id("carts"),
    variantId: v.id("productVariants"),
    productId: v.id("products"),
    quantity: v.number(),
    unitPriceCentsSnapshot: v.number(), // for display; re-validated at checkout
  })
    .index("by_cart", ["cartId"])
    .index("by_cart_and_variant", ["cartId", "variantId"]),

  // --- Orders -------------------------------------------------------------
  orders: defineTable({
    orderNumber: v.string(), // e.g. AMARA-1042
    userId: v.optional(v.id("users")), // nullable; guests have none until claimed
    email: v.string(), // lowercased; the guest-claim key
    emailVerifiedAtPurchase: v.boolean(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("fulfilled"),
      v.literal("cancelled"),
      v.literal("refunded"),
    ),
    fulfillmentMethod: v.union(v.literal("ship"), v.literal("pickup")),
    fulfillmentStatus: v.union(
      v.literal("unfulfilled"),
      v.literal("ready_for_pickup"),
      v.literal("picked_up"),
      v.literal("label_created"),
      v.literal("shipped"),
      v.literal("delivered"),
    ),
    subtotalCents: v.number(),
    shippingCents: v.number(), // flat 1199 for ship, 0 for pickup
    taxCents: v.number(),
    totalCents: v.number(),
    currency: v.literal("CAD"),
    shippingAddress: v.optional(addressValidator), // required for ship
    pickupLocationId: v.optional(v.id("pickupLocations")), // set for pickup
    cartId: v.optional(v.id("carts")), // source cart, cleared when paid
    discountCode: v.optional(v.string()),
    discountCents: v.optional(v.number()),
    pointsRedeemed: v.optional(v.number()), // loyalty points spent (1 pt = 1¢)
    giftCardCode: v.optional(v.string()),
    giftCardRedeemedCents: v.optional(v.number()),
    subscriptionId: v.optional(v.id("subscriptions")), // set for renewal orders
    stripeInvoiceId: v.optional(v.string()), // subscription cycle idempotency
    stripeCheckoutSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_orderNumber", ["orderNumber"])
    .index("by_stripeCheckoutSessionId", ["stripeCheckoutSessionId"])
    .index("by_stripeInvoiceId", ["stripeInvoiceId"])
    .index("by_status", ["status"]),

  // --- Subscriptions (Subscribe & Save box, via Stripe Billing) -----------
  // A subscription is a recurring "box" of one or more items (subscriptionItems).
  // Created as `draft` before redirecting to Stripe, then activated by webhook.
  subscriptions: defineTable({
    userId: v.id("users"),
    email: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()), // set on activation
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("past_due"),
      v.literal("canceled"),
    ),
    intervalCount: v.number(), // months between deliveries
    subtotalCents: v.number(), // sum of discounted item line totals
    shippingCents: v.number(), // flat, or 0 when over the free-ship threshold
    shippingAddress: v.optional(addressValidator),
    cartId: v.optional(v.id("carts")), // source cart, cleared on activation
    currentPeriodEnd: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  subscriptionItems: defineTable({
    subscriptionId: v.id("subscriptions"),
    productId: v.id("products"),
    variantId: v.id("productVariants"),
    nameSnapshot: v.string(),
    variantTitleSnapshot: v.string(),
    skuSnapshot: v.string(),
    quantity: v.number(),
    unitPriceCents: v.number(), // discounted per-unit price
    weightGramsSnapshot: v.number(),
  }).index("by_subscription", ["subscriptionId"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    variantId: v.id("productVariants"),
    productId: v.id("products"),
    nameSnapshot: v.string(),
    variantTitleSnapshot: v.string(),
    skuSnapshot: v.string(),
    quantity: v.number(),
    unitPriceCents: v.number(),
    lineTotalCents: v.number(),
    weightGramsSnapshot: v.number(),
  }).index("by_order", ["orderId"]),

  // --- Customer ----------------------------------------------------------
  wishlists: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_product", ["userId", "productId"]),

  // Loyalty: 1 point earned per $1 of subtotal; 100 points = $1 at checkout.
  rewardAccounts: defineTable({
    userId: v.id("users"),
    points: v.number(),
  }).index("by_user", ["userId"]),

  rewardTransactions: defineTable({
    userId: v.id("users"),
    delta: v.number(), // + earned, - redeemed
    reason: v.union(v.literal("earned"), v.literal("redeemed")),
    orderId: v.optional(v.id("orders")),
  }).index("by_user", ["userId"]),

  // --- Fulfillment --------------------------------------------------------
  shipments: defineTable({
    orderId: v.id("orders"),
    provider: v.string(), // "shippo" | future adapters
    status: v.union(
      v.literal("rate_selected"),
      v.literal("label_purchased"),
      v.literal("in_transit"),
      v.literal("delivered"),
      v.literal("error"),
    ),
    rateId: v.optional(v.string()),
    carrier: v.optional(v.string()),
    service: v.optional(v.string()),
    costCents: v.optional(v.number()), // actual carrier cost (may differ from $11.99)
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    labelUrl: v.optional(v.string()), // provider-hosted PDF
    labelStorageId: v.optional(v.id("_storage")), // archived copy
    providerShipmentId: v.optional(v.string()),
    providerTransactionId: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_order", ["orderId"])
    .index("by_trackingNumber", ["trackingNumber"]),

  pickupLocations: defineTable({
    name: v.string(),
    addressLine1: v.string(),
    city: v.string(),
    province: v.string(),
    postalCode: v.string(),
    country: v.string(),
    instructions: v.optional(v.string()),
    active: v.boolean(),
  }).index("by_active", ["active"]),

  // --- Marketing ----------------------------------------------------------
  discountCodes: defineTable({
    code: v.string(), // normalized UPPERCASE
    kind: v.union(v.literal("percent"), v.literal("fixed")),
    value: v.number(), // percent points (10 = 10%) or cents off
    active: v.boolean(),
    minSubtotalCents: v.optional(v.number()),
    usageLimit: v.optional(v.number()), // max paid redemptions
    usedCount: v.number(),
    expiresAt: v.optional(v.number()),
  }).index("by_code", ["code"]),

  giftCards: defineTable({
    code: v.string(), // e.g. AMARA-GIFT-XXXXXX
    initialCents: v.number(),
    balanceCents: v.number(),
    active: v.boolean(),
    purchaserEmail: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    message: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()), // idempotent creation guard
  })
    .index("by_code", ["code"])
    .index("by_stripeSessionId", ["stripeSessionId"]),

  // One row per paid redemption — enforces "once per customer" (matched by
  // account id and/or guest email).
  discountRedemptions: defineTable({
    code: v.string(),
    userId: v.optional(v.id("users")),
    email: v.string(), // lowercased
    orderId: v.id("orders"),
  })
    .index("by_code_and_user", ["code", "userId"])
    .index("by_code_and_email", ["code", "email"]),

  // --- CMS ----------------------------------------------------------------
  // Singleton (key "home") of admin-editable homepage copy + brand accent.
  siteContent: defineTable({
    key: v.literal("home"),
    heroEyebrow: v.string(),
    heroTitle: v.string(),
    heroSubtitle: v.string(),
    heroCtaLabel: v.string(),
    heroCtaHref: v.string(),
    ctaTitle: v.string(),
    ctaBody: v.string(),
    accentHex: v.string(), // overrides the --clay brand accent
    primaryHex: v.optional(v.string()), // overrides the --primary forest green
    backgroundHex: v.optional(v.string()), // overrides --background
    foregroundHex: v.optional(v.string()), // overrides --foreground (text)
  }).index("by_key", ["key"]),

  // --- Config & ops -------------------------------------------------------
  settings: defineTable({
    key: v.literal("global"), // singleton row
    flatRateShippingCents: v.number(),
    freeShippingThresholdCents: v.optional(v.number()),
    defaultParcel: v.object({
      lengthCm: v.number(),
      widthCm: v.number(),
      heightCm: v.number(),
      gramsFallback: v.number(),
    }),
    shipFromAddress: v.object({
      name: v.string(),
      company: v.optional(v.string()),
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      province: v.string(),
      postalCode: v.string(),
      country: v.string(),
      phone: v.string(),
      email: v.string(),
    }),
    taxRatePpm: v.optional(v.number()), // parts-per-million; 130000 = 13% HST
    activeShippingProvider: v.union(v.literal("shippo")),
    orderSeq: v.optional(v.number()), // running counter for human order numbers
    subscriptionDiscountPercent: v.optional(v.number()), // Subscribe & Save %
  }).index("by_key", ["key"]),

  webhookEvents: defineTable({
    source: v.union(v.literal("stripe"), v.literal("shipping")),
    eventId: v.string(),
    processedAt: v.number(),
  }).index("by_source_and_eventId", ["source", "eventId"]),
});
