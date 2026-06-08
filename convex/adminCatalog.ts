import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./admin";

// Variants at or below this on-hand count are surfaced as "low stock".
export const LOW_STOCK_THRESHOLD = 5;

const productStatus = v.union(
  v.literal("active"),
  v.literal("draft"),
  v.literal("archived"),
);

const optionValues = v.object({
  size: v.optional(v.string()),
  scent: v.optional(v.string()),
  packageType: v.optional(v.string()),
});

async function loadVariants(ctx: QueryCtx, productId: Id<"products">) {
  return await ctx.db
    .query("productVariants")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .take(100);
}

// --- Reads -------------------------------------------------------------------

// All products (any status) with stock/price rollups for the admin list.
export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const products = await ctx.db.query("products").order("desc").take(200);

    return await Promise.all(
      products.map(async (p) => {
        const variants = await loadVariants(ctx, p._id);
        const prices = variants.map((v) => v.priceCents);
        const totalStock = variants.reduce((s, v) => s + v.inventoryQty, 0);
        const lowStock = variants.filter(
          (v) => v.active && v.inventoryQty <= LOW_STOCK_THRESHOLD,
        ).length;
        return {
          _id: p._id,
          name: p.name,
          slug: p.slug,
          status: p.status,
          image: p.imageUrls[0] ?? null,
          variantCount: variants.length,
          totalStock,
          lowStock,
          minPriceCents: prices.length ? Math.min(...prices) : p.priceCents,
          maxPriceCents: prices.length ? Math.max(...prices) : p.priceCents,
        };
      }),
    );
  },
});

// One product with its full variant list + resolved image URLs, for the edit
// screen. Images come from `imageStorageIds` (uploaded to Convex storage).
export const getProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get("products", productId);
    if (!product) return null;
    const variants = await loadVariants(ctx, productId);

    const images: { storageId: Id<"_storage">; url: string }[] = [];
    for (const id of product.imageStorageIds ?? []) {
      const url = await ctx.storage.getUrl(id);
      if (url) images.push({ storageId: id, url });
    }

    return { product, variants, images };
  },
});

// --- Product mutations -------------------------------------------------------

async function assertSlugFree(
  ctx: QueryCtx,
  slug: string,
  exclude?: Id<"products">,
) {
  const existing = await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (existing && existing._id !== exclude) {
    throw new Error(`Slug "${slug}" is already in use.`);
  }
}

export const createProduct = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    shortDescription: v.optional(v.string()),
    status: productStatus,
    priceCents: v.number(),
    compareAtCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("A slug is required.");
    await assertSlugFree(ctx, slug);
    // Images are added on the edit screen via uploads (imageStorageIds).
    const productId = await ctx.db.insert("products", {
      name: args.name.trim(),
      slug,
      description: args.description,
      shortDescription: args.shortDescription,
      status: args.status,
      priceCents: args.priceCents,
      compareAtCents: args.compareAtCents,
      imageUrls: [],
    });
    return { productId };
  },
});

// Note: images are managed separately (setProductImages) and intentionally not
// touched here, so saving product fields never disturbs the gallery.
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    shortDescription: v.optional(v.string()),
    status: productStatus,
    priceCents: v.number(),
    compareAtCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("A slug is required.");
    await assertSlugFree(ctx, slug, args.productId);
    await ctx.db.patch("products", args.productId, {
      name: args.name.trim(),
      slug,
      description: args.description,
      shortDescription: args.shortDescription,
      status: args.status,
      priceCents: args.priceCents,
      compareAtCents: args.compareAtCents,
    });
    return { ok: true };
  },
});

// --- Image uploads -----------------------------------------------------------

// Short-lived URL the admin client POSTs an image file to; the POST returns a
// `storageId` which is then saved via setProductImages.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Replace a product's ordered image list (index 0 = cover). Any storage object
// dropped from the list is deleted so we don't leak orphaned blobs.
export const setProductImages = mutation({
  args: {
    productId: v.id("products"),
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { productId, storageIds }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get("products", productId);
    if (!product) throw new Error("Product not found.");
    const previous = product.imageStorageIds ?? [];
    for (const id of previous) {
      if (!storageIds.includes(id)) await ctx.storage.delete(id);
    }
    await ctx.db.patch("products", productId, { imageStorageIds: storageIds });
    return { ok: true };
  },
});

// Quick status flip (activate / unpublish to draft / archive) from the list.
export const setProductStatus = mutation({
  args: { productId: v.id("products"), status: productStatus },
  handler: async (ctx, { productId, status }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("products", productId, { status });
    return { ok: true };
  },
});

// --- Variant mutations -------------------------------------------------------

export const createVariant = mutation({
  args: {
    productId: v.id("products"),
    sku: v.string(),
    title: v.string(),
    optionValues: v.optional(optionValues),
    priceCents: v.number(),
    compareAtCents: v.optional(v.number()),
    inventoryQty: v.number(),
    weightGrams: v.number(),
    lengthCm: v.optional(v.number()),
    widthCm: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get("products", args.productId);
    if (!product) throw new Error("Product not found.");
    const { productId, ...rest } = args;
    const variantId = await ctx.db.insert("productVariants", {
      productId,
      ...rest,
    });
    return { variantId };
  },
});

export const updateVariant = mutation({
  args: {
    variantId: v.id("productVariants"),
    sku: v.string(),
    title: v.string(),
    optionValues: v.optional(optionValues),
    priceCents: v.number(),
    compareAtCents: v.optional(v.number()),
    inventoryQty: v.number(),
    weightGrams: v.number(),
    lengthCm: v.optional(v.number()),
    widthCm: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { variantId, ...rest } = args;
    await ctx.db.patch("productVariants", variantId, rest);
    return { ok: true };
  },
});

export const deleteVariant = mutation({
  args: { variantId: v.id("productVariants") },
  handler: async (ctx, { variantId }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("productVariants", variantId);
    return { ok: true };
  },
});
