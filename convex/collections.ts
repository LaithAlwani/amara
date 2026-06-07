import { query } from "./_generated/server";
import { v } from "convex/values";
import { collectionImage, toProductCard } from "./catalog";

// Published collections for the collections index (and homepage features).
export const listCollections = query({
  args: {},
  handler: async (ctx) => {
    const collections = await ctx.db
      .query("collections")
      .withIndex("by_published", (q) => q.eq("published", true))
      .take(50);
    collections.sort((a, b) => a.sortOrder - b.sortOrder);
    return Promise.all(
      collections.map(async (c) => ({
        _id: c._id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        image: await collectionImage(ctx, c),
      })),
    );
  },
});

// A single collection plus its products (used by /collections/[slug] and the
// homepage "best sellers" rail).
export const getCollectionBySlug = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const collection = await ctx.db
      .query("collections")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!collection || !collection.published) return null;

    const links = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_and_position", (q) =>
        q.eq("collectionId", collection._id),
      )
      .take(limit ?? 48);

    const products = [];
    for (const link of links) {
      const product = await ctx.db.get("products", link.productId);
      if (product && product.status === "active") {
        products.push(await toProductCard(ctx, product));
      }
    }

    return {
      collection: {
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        image: await collectionImage(ctx, collection),
      },
      products,
    };
  },
});
