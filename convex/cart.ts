import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { primaryImage } from "./catalog";

// --- cart resolution ----------------------------------------------------

// Find the caller's open cart (read-only). Logged-in users are keyed by their
// Clerk tokenIdentifier; guests by the anon cookie value. Returns null if none.
async function findOpenCart(
  ctx: QueryCtx,
  anonId?: string,
): Promise<Doc<"carts"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const carts = await ctx.db
      .query("carts")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")
      .take(10);
    return carts.find((c) => c.status === "open") ?? null;
  }
  if (anonId) {
    const carts = await ctx.db
      .query("carts")
      .withIndex("by_anonId", (q) => q.eq("anonId", anonId))
      .order("desc")
      .take(10);
    return carts.find((c) => c.status === "open") ?? null;
  }
  return null;
}

// Same as above but creates the cart if missing (mutations only).
async function getOrCreateOpenCart(
  ctx: MutationCtx,
  anonId?: string,
): Promise<Doc<"carts">> {
  const existing = await findOpenCart(ctx, anonId);
  if (existing) return existing;

  const identity = await ctx.auth.getUserIdentity();
  let id: Id<"carts">;
  if (identity) {
    id = await ctx.db.insert("carts", {
      ownerKind: "user",
      tokenIdentifier: identity.tokenIdentifier,
      status: "open",
    });
  } else if (anonId) {
    id = await ctx.db.insert("carts", {
      ownerKind: "anon",
      anonId,
      status: "open",
    });
  } else {
    throw new Error("No cart owner: sign in or provide an anonId.");
  }
  const created = await ctx.db.get("carts", id);
  if (!created) throw new Error("Failed to create cart.");
  return created;
}

// --- queries ------------------------------------------------------------

export const getCart = query({
  args: { anonId: v.optional(v.string()) },
  handler: async (ctx, { anonId }) => {
    const cart = await findOpenCart(ctx, anonId);
    if (!cart) {
      return { cartId: null, items: [], count: 0, subtotalCents: 0 };
    }

    const rows = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .take(200);

    const items = [];
    let subtotalCents = 0;
    let count = 0;

    for (const row of rows) {
      const variant = await ctx.db.get("productVariants", row.variantId);
      const product = await ctx.db.get("products", row.productId);
      if (!variant || !product) continue;

      const unitPriceCents = variant.priceCents;
      const lineTotalCents = unitPriceCents * row.quantity;
      subtotalCents += lineTotalCents;
      count += row.quantity;

      items.push({
        cartItemId: row._id,
        productId: product._id,
        variantId: variant._id,
        slug: product.slug,
        name: product.name,
        variantTitle: variant.title,
        image: await primaryImage(ctx, product),
        unitPriceCents,
        quantity: row.quantity,
        lineTotalCents,
        maxQty: variant.inventoryQty,
      });
    }

    return { cartId: cart._id, items, count, subtotalCents };
  },
});

// --- mutations ----------------------------------------------------------

export const addItem = mutation({
  args: {
    variantId: v.id("productVariants"),
    quantity: v.optional(v.number()),
    anonId: v.optional(v.string()),
  },
  handler: async (ctx, { variantId, quantity, anonId }) => {
    const qty = Math.max(1, Math.floor(quantity ?? 1));
    const variant = await ctx.db.get("productVariants", variantId);
    if (!variant || !variant.active) throw new Error("Variant unavailable.");

    const cart = await getOrCreateOpenCart(ctx, anonId);

    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_cart_and_variant", (q) =>
        q.eq("cartId", cart._id).eq("variantId", variantId),
      )
      .unique();

    const desired = (existing?.quantity ?? 0) + qty;
    const clamped = Math.min(desired, Math.max(0, variant.inventoryQty));
    if (clamped <= 0) throw new Error("Out of stock.");

    if (existing) {
      await ctx.db.patch("cartItems", existing._id, {
        quantity: clamped,
        unitPriceCentsSnapshot: variant.priceCents,
      });
    } else {
      await ctx.db.insert("cartItems", {
        cartId: cart._id,
        variantId,
        productId: variant.productId,
        quantity: clamped,
        unitPriceCentsSnapshot: variant.priceCents,
      });
    }
    return null;
  },
});

// Verify a cart item belongs to the caller's cart before touching it.
async function ownedCartItem(
  ctx: MutationCtx,
  cartItemId: Id<"cartItems">,
  anonId?: string,
): Promise<Doc<"cartItems">> {
  const cart = await findOpenCart(ctx, anonId);
  if (!cart) throw new Error("No cart.");
  const item = await ctx.db.get("cartItems", cartItemId);
  if (!item || item.cartId !== cart._id) throw new Error("Item not in cart.");
  return item;
}

export const updateItemQty = mutation({
  args: {
    cartItemId: v.id("cartItems"),
    quantity: v.number(),
    anonId: v.optional(v.string()),
  },
  handler: async (ctx, { cartItemId, quantity, anonId }) => {
    const item = await ownedCartItem(ctx, cartItemId, anonId);
    const variant = await ctx.db.get("productVariants", item.variantId);
    const max = variant ? variant.inventoryQty : 0;
    const qty = Math.min(Math.max(1, Math.floor(quantity)), Math.max(1, max));
    await ctx.db.patch("cartItems", item._id, { quantity: qty });
    return null;
  },
});

export const removeItem = mutation({
  args: { cartItemId: v.id("cartItems"), anonId: v.optional(v.string()) },
  handler: async (ctx, { cartItemId, anonId }) => {
    const item = await ownedCartItem(ctx, cartItemId, anonId);
    await ctx.db.delete("cartItems", item._id);
    return null;
  },
});

export const clearCart = mutation({
  args: { anonId: v.optional(v.string()) },
  handler: async (ctx, { anonId }) => {
    const cart = await findOpenCart(ctx, anonId);
    if (!cart) return null;
    const rows = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .take(200);
    for (const row of rows) await ctx.db.delete("cartItems", row._id);
    return null;
  },
});

// On login, fold the guest's anon cart into the user's open cart, then retire
// the anon cart. Idempotent: once converted, re-running finds no open anon cart.
export const mergeAnonCartIntoUser = mutation({
  args: { anonId: v.string() },
  handler: async (ctx, { anonId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const anonCarts = await ctx.db
      .query("carts")
      .withIndex("by_anonId", (q) => q.eq("anonId", anonId))
      .order("desc")
      .take(10);
    const anonCart = anonCarts.find((c) => c.status === "open");
    if (!anonCart) return null;

    const anonItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", anonCart._id))
      .take(200);

    if (anonItems.length > 0) {
      const userCart = await getOrCreateOpenCart(ctx);
      for (const item of anonItems) {
        const variant = await ctx.db.get("productVariants", item.variantId);
        const max = variant ? variant.inventoryQty : 0;
        const existing = await ctx.db
          .query("cartItems")
          .withIndex("by_cart_and_variant", (q) =>
            q.eq("cartId", userCart._id).eq("variantId", item.variantId),
          )
          .unique();
        const desired = (existing?.quantity ?? 0) + item.quantity;
        const clamped = Math.min(desired, Math.max(0, max));
        if (clamped <= 0) {
          await ctx.db.delete("cartItems", item._id);
          continue;
        }
        if (existing) {
          await ctx.db.patch("cartItems", existing._id, { quantity: clamped });
          await ctx.db.delete("cartItems", item._id);
        } else {
          await ctx.db.patch("cartItems", item._id, { cartId: userCart._id });
        }
      }
    }

    await ctx.db.patch("carts", anonCart._id, { status: "converted" });
    return null;
  },
});
