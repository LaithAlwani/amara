import {
  mutation,
  query,
  internalMutation,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Resolve the local `users` row for the authenticated identity, if any.
async function userByIdentity(
  ctx: QueryCtx,
  tokenIdentifier: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", tokenIdentifier),
    )
    .unique();
}

// Link any unclaimed guest orders for this email to the account. Claiming only
// happens on a VERIFIED email match (blueprint §38), so a malicious unverified
// signup can't hijack someone else's guest order history.
async function claimGuestOrders(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string,
  emailVerified: boolean,
): Promise<void> {
  if (!emailVerified || !email) return;
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_email", (q) => q.eq("email", email))
    .take(100);
  for (const order of orders) {
    if (order.userId === undefined) {
      await ctx.db.patch("orders", order._id, { userId });
    }
  }
}

// Returns the current user's local row (or null if signed out / not yet stored).
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await userByIdentity(ctx, identity.tokenIdentifier);
  },
});

// Upsert the local user row from the Clerk identity. Called on app load when
// signed in. Also claims any guest orders placed with this verified email.
// (The anonymous cart merge lives in cart.mergeAnonCartIntoUser, Phase 4.)
export const getOrCreateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const email = (identity.email ?? "").toLowerCase();
    const emailVerified = identity.emailVerified === true;
    const name = identity.name ?? undefined;

    const existing = await userByIdentity(ctx, identity.tokenIdentifier);
    if (existing) {
      // Keep mutable identity fields fresh without clobbering role.
      const patch: Partial<Doc<"users">> = {};
      if (existing.email !== email && email) patch.email = email;
      if (existing.emailVerified !== emailVerified)
        patch.emailVerified = emailVerified;
      if (name && existing.name !== name) patch.name = name;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch("users", existing._id, patch);
      }
      // Email may have just become verified (or new guest orders placed since
      // last login) — try claiming on every sign-in, not just first creation.
      await claimGuestOrders(ctx, existing._id, email, emailVerified);
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.subject,
      email,
      emailVerified,
      name,
      role: "customer",
    });
    await claimGuestOrders(ctx, userId, email, emailVerified);
    return userId;
  },
});

// Ops: set a user's role by email. Internal-only (run from the Convex CLI/
// dashboard) — there's no self-serve role management until the admin UI grows
// one. E.g. `npx convex run users:setUserRole '{"email":"x@y.com","role":"admin"}'`.
export const setUserRole = internalMutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("customer"), v.literal("admin")),
  },
  handler: async (ctx, { email, role }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .unique();
    if (!user) throw new Error(`No user with email ${email}`);
    await ctx.db.patch("users", user._id, { role });
    return { ok: true, userId: user._id, role };
  },
});
