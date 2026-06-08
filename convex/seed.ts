import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Dev-only catalog seed. Run with:  npx convex run seed:seedCatalog
// Idempotent: re-running patches settings and skips rows that already exist.

type SeedVariant = {
  sku: string;
  title: string;
  priceCents: number;
  compareAtCents?: number;
  inventoryQty: number;
  weightGrams: number;
  optionValues?: { size?: string; scent?: string; packageType?: string };
};

type SeedProduct = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  compareAtCents?: number;
  variants: SeedVariant[];
  collections: string[]; // collection slugs
};

const COLLECTIONS = [
  {
    slug: "best-sellers",
    title: "Best Sellers",
    description: "Our most-loved botanicals.",
    sortOrder: 1,
  },
  {
    slug: "skincare",
    title: "Skincare",
    description: "Serums, masks and creams for a considered routine.",
    sortOrder: 2,
  },
];

const PRODUCTS: SeedProduct[] = [
  {
    slug: "rosehydra-facial-serum",
    name: "Rosehydra Facial Serum",
    shortDescription: "Lightweight hydration with rosehip and hyaluronic acid.",
    description:
      "A daily serum that pairs cold-pressed rosehip oil with plant-derived hyaluronic acid to plump and calm skin. Absorbs fast, layers cleanly under moisturizer.",
    priceCents: 4800,
    variants: [
      {
        sku: "RHS-30",
        title: "30 ml",
        priceCents: 4800,
        inventoryQty: 40,
        weightGrams: 120,
        optionValues: { size: "30 ml" },
      },
      {
        sku: "RHS-50",
        title: "50 ml",
        priceCents: 6800,
        inventoryQty: 25,
        weightGrams: 165,
        optionValues: { size: "50 ml" },
      },
    ],
    collections: ["best-sellers", "skincare"],
  },
  {
    slug: "botanical-repair-hair-oil",
    name: "Botanical Repair Hair Oil",
    shortDescription: "Argan and camellia oil for shine without weight.",
    description:
      "A fast-absorbing blend of argan, camellia and jojoba that smooths frizz and protects ends. A few drops on damp or dry hair.",
    priceCents: 3600,
    variants: [
      {
        sku: "BRH-100",
        title: "100 ml",
        priceCents: 3600,
        inventoryQty: 30,
        weightGrams: 210,
        optionValues: { size: "100 ml" },
      },
    ],
    collections: ["best-sellers"],
  },
  {
    slug: "bloom-body-butter",
    name: "Bloom Body Butter",
    shortDescription: "Whipped shea butter with a soft floral finish.",
    description:
      "Rich shea and cocoa butter whipped to a cloud-light texture. Deeply nourishing, never greasy.",
    priceCents: 3200,
    variants: [
      {
        sku: "BBB-200-NEUTRAL",
        title: "200 ml / Unscented",
        priceCents: 3200,
        inventoryQty: 35,
        weightGrams: 260,
        optionValues: { size: "200 ml", scent: "Unscented" },
      },
      {
        sku: "BBB-200-ROSE",
        title: "200 ml / Wild Rose",
        priceCents: 3400,
        inventoryQty: 20,
        weightGrams: 260,
        optionValues: { size: "200 ml", scent: "Wild Rose" },
      },
    ],
    collections: ["best-sellers"],
  },
  {
    slug: "clarity-clay-mask",
    name: "Clarity Clay Mask",
    shortDescription: "French green clay to draw out and refine.",
    description:
      "A weekly treatment of French green clay and willow bark that decongests pores and leaves skin smooth. Rinse after ten minutes.",
    priceCents: 2900,
    compareAtCents: 3400,
    variants: [
      {
        sku: "CCM-75",
        title: "75 ml",
        priceCents: 2900,
        compareAtCents: 3400,
        inventoryQty: 28,
        weightGrams: 180,
        optionValues: { size: "75 ml" },
      },
    ],
    collections: ["skincare"],
  },
  {
    slug: "renew-eye-cream",
    name: "Renew Eye Cream",
    shortDescription: "Caffeine and peptides for the eye area.",
    description:
      "A gentle cream with caffeine, peptides and squalane to brighten and de-puff. Pat a small amount morning and night.",
    priceCents: 5200,
    variants: [
      {
        sku: "REC-15",
        title: "15 ml",
        priceCents: 5200,
        inventoryQty: 18,
        weightGrams: 90,
        optionValues: { size: "15 ml" },
      },
    ],
    collections: ["skincare"],
  },
  {
    slug: "soothe-lip-balm",
    name: "Soothe Lip Balm",
    shortDescription: "Beeswax-free balm with candelilla and mint.",
    description:
      "A plant-wax balm that softens and protects with candelilla, shea and a whisper of peppermint.",
    priceCents: 1400,
    variants: [
      {
        sku: "SLB-MINT",
        title: "Peppermint",
        priceCents: 1400,
        inventoryQty: 60,
        weightGrams: 30,
        optionValues: { scent: "Peppermint" },
      },
    ],
    collections: ["best-sellers"],
  },
];

export const seedCatalog = internalMutation({
  args: {},
  handler: async (ctx) => {
    // --- settings singleton (upsert) ---
    const existingSettings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    const settingsDoc = {
      key: "global" as const,
      flatRateShippingCents: 1199,
      freeShippingThresholdCents: 9000,
      defaultParcel: {
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        gramsFallback: 300,
      },
      shipFromAddress: {
        name: "Amara",
        company: "Amara Beauty Co.",
        line1: "123 Bank Street",
        city: "Ottawa",
        province: "ON",
        postalCode: "K1P 1A1",
        country: "CA",
        phone: "613-555-0142",
        email: "shipping@amara.example",
      },
      taxRatePpm: 130000, // 13% Ontario HST
      activeShippingProvider: "shippo" as const,
      subscriptionDiscountPercent: 15, // Subscribe & Save
    };
    if (existingSettings) {
      await ctx.db.patch("settings", existingSettings._id, settingsDoc);
    } else {
      await ctx.db.insert("settings", settingsDoc);
    }

    // --- pickup location (upsert one active row) ---
    const pickupDoc = {
      name: "Amara Studio - Ottawa",
      addressLine1: "123 Bank Street",
      city: "Ottawa",
      province: "ON",
      postalCode: "K1P 1A1",
      country: "CA",
      instructions:
        "Pickup in the lobby, weekdays 10am-6pm. Bring your order number.",
      active: true,
    };
    const existingPickup = await ctx.db
      .query("pickupLocations")
      .withIndex("by_active", (q) => q.eq("active", true))
      .first();
    if (existingPickup) {
      await ctx.db.patch("pickupLocations", existingPickup._id, pickupDoc);
    } else {
      await ctx.db.insert("pickupLocations", pickupDoc);
    }

    // --- collections (skip existing by slug) ---
    const collectionIdBySlug: Record<string, Id<"collections">> = {};
    for (const c of COLLECTIONS) {
      const existing = await ctx.db
        .query("collections")
        .withIndex("by_slug", (q) => q.eq("slug", c.slug))
        .unique();
      if (existing) {
        collectionIdBySlug[c.slug] = existing._id;
        continue;
      }
      collectionIdBySlug[c.slug] = await ctx.db.insert("collections", {
        slug: c.slug,
        title: c.title,
        description: c.description,
        type: "manual",
        imageUrl: `https://picsum.photos/seed/amara-${c.slug}/1200/800`,
        published: true,
        sortOrder: c.sortOrder,
      });
    }

    // --- products + variants + collection membership (skip existing by slug) ---
    let created = 0;
    for (const p of PRODUCTS) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", p.slug))
        .unique();
      if (existing) continue;

      const productId = await ctx.db.insert("products", {
        slug: p.slug,
        name: p.name,
        description: p.description,
        shortDescription: p.shortDescription,
        status: "active",
        imageUrls: [
          `https://picsum.photos/seed/amara-${p.slug}/1200/1500`,
          `https://picsum.photos/seed/amara-${p.slug}-2/1200/1500`,
        ],
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents,
      });

      for (const variant of p.variants) {
        await ctx.db.insert("productVariants", {
          productId,
          sku: variant.sku,
          title: variant.title,
          optionValues: variant.optionValues,
          priceCents: variant.priceCents,
          compareAtCents: variant.compareAtCents,
          inventoryQty: variant.inventoryQty,
          weightGrams: variant.weightGrams,
          active: true,
        });
      }

      for (let i = 0; i < p.collections.length; i++) {
        const collectionId = collectionIdBySlug[p.collections[i]];
        if (!collectionId) continue;
        await ctx.db.insert("collectionProducts", {
          collectionId,
          productId,
          position: created,
        });
      }
      created++;
    }

    return { ok: true, productsCreated: created };
  },
});
