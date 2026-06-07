import { mutation, query, QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

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
// signed in. Later phases extend this to claim guest orders (Phase 8) and merge
// the anonymous cart (Phase 4).
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
      return existing._id;
    }

    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.subject,
      email,
      emailVerified,
      name,
      role: "customer",
    });
  },
});
