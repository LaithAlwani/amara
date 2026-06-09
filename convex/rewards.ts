import { query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// 1 point per $1 of subtotal; redeemed at 1 point = 1¢ (100 points = $1).
export const POINT_VALUE_CENTS = 1;

export function pointsEarnedFor(subtotalCents: number): number {
  return Math.floor(subtotalCents / 100);
}

export async function getPointsBalance(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<number> {
  const account = await ctx.db
    .query("rewardAccounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return account?.points ?? 0;
}

export async function awardPoints(
  ctx: MutationCtx,
  userId: Id<"users">,
  points: number,
  orderId?: Id<"orders">,
): Promise<void> {
  if (points <= 0) return;
  const account = await ctx.db
    .query("rewardAccounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (account) {
    await ctx.db.patch("rewardAccounts", account._id, {
      points: account.points + points,
    });
  } else {
    await ctx.db.insert("rewardAccounts", { userId, points });
  }
  await ctx.db.insert("rewardTransactions", {
    userId,
    delta: points,
    reason: "earned",
    orderId,
  });
}

// Spend points (clamped to the balance). Returns the points actually redeemed.
export async function redeemPoints(
  ctx: MutationCtx,
  userId: Id<"users">,
  points: number,
  orderId?: Id<"orders">,
): Promise<number> {
  if (points <= 0) return 0;
  const account = await ctx.db
    .query("rewardAccounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const balance = account?.points ?? 0;
  const spend = Math.min(points, balance);
  if (spend <= 0) return 0;
  await ctx.db.patch("rewardAccounts", account!._id, {
    points: balance - spend,
  });
  await ctx.db.insert("rewardTransactions", {
    userId,
    delta: -spend,
    reason: "redeemed",
    orderId,
  });
  return spend;
}

// --- Account: my rewards -----------------------------------------------------

export const myRewards = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return null;

    const balance = await getPointsBalance(ctx, user._id);
    const txns = await ctx.db
      .query("rewardTransactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return {
      balance,
      valueCents: balance * POINT_VALUE_CENTS,
      transactions: await Promise.all(
        txns.map(async (t) => {
          let orderNumber: string | null = null;
          if (t.orderId) {
            const order = await ctx.db.get("orders", t.orderId);
            orderNumber = order?.orderNumber ?? null;
          }
          return {
            _id: t._id,
            delta: t.delta,
            reason: t.reason,
            orderNumber,
            createdAt: t._creationTime,
          };
        }),
      ),
    };
  },
});
