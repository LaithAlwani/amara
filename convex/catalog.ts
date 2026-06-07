import { QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Shared catalog read helpers (not registered Convex functions).

// Resolve a product's primary display image: prefer uploaded storage images,
// fall back to seed/remote URLs.
export async function primaryImage(
  ctx: QueryCtx,
  product: Doc<"products">,
): Promise<string | null> {
  for (const id of product.imageStorageIds ?? []) {
    const url = await ctx.storage.getUrl(id);
    if (url) return url;
  }
  return product.imageUrls[0] ?? null;
}

// Full ordered gallery (storage images first, then remote URLs).
export async function allImages(
  ctx: QueryCtx,
  product: Doc<"products">,
): Promise<string[]> {
  const out: string[] = [];
  for (const id of product.imageStorageIds ?? []) {
    const url = await ctx.storage.getUrl(id);
    if (url) out.push(url);
  }
  return [...out, ...product.imageUrls];
}

export async function collectionImage(
  ctx: QueryCtx,
  collection: Doc<"collections">,
): Promise<string | null> {
  if (collection.imageStorageId) {
    const url = await ctx.storage.getUrl(collection.imageStorageId);
    if (url) return url;
  }
  return collection.imageUrl ?? null;
}

export type ProductCard = {
  _id: Id<"products">;
  slug: string;
  name: string;
  shortDescription?: string;
  priceCents: number;
  compareAtCents?: number;
  image: string | null;
};

export async function toProductCard(
  ctx: QueryCtx,
  product: Doc<"products">,
): Promise<ProductCard> {
  return {
    _id: product._id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents,
    image: await primaryImage(ctx, product),
  };
}
