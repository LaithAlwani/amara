import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./admin";
import { collectionImage, primaryImage } from "./catalog";

async function memberLinks(ctx: QueryCtx, collectionId: Id<"collections">) {
  return await ctx.db
    .query("collectionProducts")
    .withIndex("by_collection_and_position", (q) =>
      q.eq("collectionId", collectionId),
    )
    .take(500);
}

async function assertSlugFree(
  ctx: QueryCtx,
  slug: string,
  exclude?: Id<"collections">,
) {
  const existing = await ctx.db
    .query("collections")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (existing && existing._id !== exclude) {
    throw new Error(`Slug "${slug}" is already in use.`);
  }
}

// --- Reads -------------------------------------------------------------------

export const listCollections = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const collections = await ctx.db.query("collections").take(200);
    collections.sort((a, b) => a.sortOrder - b.sortOrder);
    return await Promise.all(
      collections.map(async (c) => ({
        _id: c._id,
        title: c.title,
        slug: c.slug,
        published: c.published,
        sortOrder: c.sortOrder,
        productCount: (await memberLinks(ctx, c._id)).length,
        image: await collectionImage(ctx, c),
      })),
    );
  },
});

export const getCollection = query({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    await requireAdmin(ctx);
    const collection = await ctx.db.get("collections", collectionId);
    if (!collection) return null;

    const links = await memberLinks(ctx, collectionId);
    const members = [];
    for (const link of links) {
      const product = await ctx.db.get("products", link.productId);
      if (product) {
        members.push({
          productId: product._id,
          name: product.name,
          status: product.status,
          image: await primaryImage(ctx, product),
        });
      }
    }

    let coverImageUrl: string | null = null;
    if (collection.imageStorageId) {
      coverImageUrl = await ctx.storage.getUrl(collection.imageStorageId);
    }

    return {
      collection: {
        _id: collection._id,
        title: collection.title,
        slug: collection.slug,
        description: collection.description ?? "",
        published: collection.published,
        sortOrder: collection.sortOrder,
        hasUploadedCover: !!collection.imageStorageId,
        coverImageUrl: coverImageUrl ?? collection.imageUrl ?? null,
      },
      members,
    };
  },
});

// --- Collection mutations ----------------------------------------------------

export const createCollection = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    published: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("A slug is required.");
    await assertSlugFree(ctx, slug);
    const collectionId = await ctx.db.insert("collections", {
      title: args.title.trim(),
      slug,
      description: args.description?.trim() || undefined,
      type: "manual",
      published: args.published,
      sortOrder: args.sortOrder,
    });
    return { collectionId };
  },
});

export const updateCollection = mutation({
  args: {
    collectionId: v.id("collections"),
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    published: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("A slug is required.");
    await assertSlugFree(ctx, slug, args.collectionId);
    await ctx.db.patch("collections", args.collectionId, {
      title: args.title.trim(),
      slug,
      description: args.description?.trim() || undefined,
      published: args.published,
      sortOrder: args.sortOrder,
    });
    return { ok: true };
  },
});

export const deleteCollection = mutation({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    await requireAdmin(ctx);
    for (const link of await memberLinks(ctx, collectionId)) {
      await ctx.db.delete("collectionProducts", link._id);
    }
    const collection = await ctx.db.get("collections", collectionId);
    if (collection?.imageStorageId) {
      await ctx.storage.delete(collection.imageStorageId);
    }
    await ctx.db.delete("collections", collectionId);
    return { ok: true };
  },
});

// --- Membership --------------------------------------------------------------

export const addProduct = mutation({
  args: {
    collectionId: v.id("collections"),
    productId: v.id("products"),
  },
  handler: async (ctx, { collectionId, productId }) => {
    await requireAdmin(ctx);
    const links = await memberLinks(ctx, collectionId);
    if (links.some((l) => l.productId === productId)) {
      return { ok: true, already: true };
    }
    const position = links.reduce((max, l) => Math.max(max, l.position), -1) + 1;
    await ctx.db.insert("collectionProducts", {
      collectionId,
      productId,
      position,
    });
    return { ok: true };
  },
});

export const removeProduct = mutation({
  args: {
    collectionId: v.id("collections"),
    productId: v.id("products"),
  },
  handler: async (ctx, { collectionId, productId }) => {
    await requireAdmin(ctx);
    for (const link of await memberLinks(ctx, collectionId)) {
      if (link.productId === productId) {
        await ctx.db.delete("collectionProducts", link._id);
      }
    }
    return { ok: true };
  },
});

// Persist a new member order — productIds in the desired order.
export const reorderProducts = mutation({
  args: {
    collectionId: v.id("collections"),
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, { collectionId, productIds }) => {
    await requireAdmin(ctx);
    const links = await memberLinks(ctx, collectionId);
    const byProduct = new Map(links.map((l) => [l.productId, l._id]));
    for (let i = 0; i < productIds.length; i++) {
      const linkId = byProduct.get(productIds[i]);
      if (linkId) await ctx.db.patch("collectionProducts", linkId, { position: i });
    }
    return { ok: true };
  },
});

// --- Cover image -------------------------------------------------------------

// Set (or clear, with storageId null) the collection cover. Deletes the
// previous uploaded blob so storage doesn't leak. (Upload URL is shared with
// adminCatalog.generateUploadUrl.)
export const setCollectionImage = mutation({
  args: {
    collectionId: v.id("collections"),
    storageId: v.union(v.id("_storage"), v.null()),
  },
  handler: async (ctx, { collectionId, storageId }) => {
    await requireAdmin(ctx);
    const collection = await ctx.db.get("collections", collectionId);
    if (!collection) throw new Error("Collection not found.");
    if (
      collection.imageStorageId &&
      collection.imageStorageId !== storageId
    ) {
      await ctx.storage.delete(collection.imageStorageId);
    }
    await ctx.db.patch("collections", collectionId, {
      imageStorageId: storageId ?? undefined,
    });
    return { ok: true };
  },
});
