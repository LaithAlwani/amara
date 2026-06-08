import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { toProductCard } from "./catalog";

// Wishlists are account-bound — guests can't save favorites (blueprint §3).
async function currentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
}

// The set of product ids the current user has saved. Drives the heart's filled
// state on cards/PDP. Returns [] for guests (so hearts render empty).
export const myWishlistIds = query({
  args: {},
  handler: async (ctx): Promise<Id<"products">[]> => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("wishlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(500);
    return rows.map((r) => r.productId);
  },
});

// Add/remove a product from the current user's wishlist. Returns the new state.
export const toggleWishlist = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error("Sign in to save favorites.");

    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_user_and_product", (q) =>
        q.eq("userId", user._id).eq("productId", productId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete("wishlists", existing._id);
      return { wishlisted: false };
    }
    await ctx.db.insert("wishlists", { userId: user._id, productId });
    return { wishlisted: true };
  },
});

// Full wishlist as product cards (skips any product since archived/deleted),
// newest-saved first. For the /account/wishlist page.
export const getWishlist = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("wishlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);

    const cards = [];
    for (const row of rows) {
      const product = await ctx.db.get("products", row.productId);
      if (product && product.status === "active") {
        cards.push(await toProductCard(ctx, product));
      }
    }
    return cards;
  },
});
