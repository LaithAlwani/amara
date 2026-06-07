import { query } from "./_generated/server";
import { v } from "convex/values";
import { allImages, toProductCard } from "./catalog";

// Storefront product grid (active products, newest first).
export const listProducts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(limit ?? 24);
    return Promise.all(products.map((p) => toProductCard(ctx, p)));
  },
});

// Product detail page: product + its active variants.
export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!product || product.status !== "active") return null;

    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .take(50);

    return {
      _id: product._id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      priceCents: product.priceCents,
      compareAtCents: product.compareAtCents,
      images: await allImages(ctx, product),
      variants: variants
        .filter((variant) => variant.active)
        .map((variant) => ({
          _id: variant._id,
          sku: variant.sku,
          title: variant.title,
          optionValues: variant.optionValues,
          priceCents: variant.priceCents,
          compareAtCents: variant.compareAtCents,
          inStock: variant.inventoryQty > 0,
        })),
    };
  },
});

// Instant search over product names (active only).
export const searchProducts = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    const term = q.trim();
    if (!term) return [];
    const results = await ctx.db
      .query("products")
      .withSearchIndex("search_name", (s) =>
        s.search("name", term).eq("status", "active"),
      )
      .take(20);
    return Promise.all(results.map((p) => toProductCard(ctx, p)));
  },
});
