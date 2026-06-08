import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./admin";

export type DiscountCustomer = { userId?: Id<"users">; email?: string };

// Has this customer already redeemed this code (by account or by email)?
async function customerHasRedeemed(
  ctx: QueryCtx | MutationCtx,
  code: string,
  customer: DiscountCustomer,
): Promise<boolean> {
  if (customer.userId) {
    const byUser = await ctx.db
      .query("discountRedemptions")
      .withIndex("by_code_and_user", (q) =>
        q.eq("code", code).eq("userId", customer.userId),
      )
      .first();
    if (byUser) return true;
  }
  const email = customer.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await ctx.db
      .query("discountRedemptions")
      .withIndex("by_code_and_email", (q) =>
        q.eq("code", code).eq("email", email),
      )
      .first();
    if (byEmail) return true;
  }
  return false;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export type DiscountEvaluation = {
  code: Doc<"discountCodes"> | null;
  discountCents: number;
  error: string | null;
};

// Authoritative discount evaluation, shared by the live quote and order
// creation. An empty/blank code is "no discount, no error".
export async function evaluateDiscount(
  ctx: QueryCtx | MutationCtx,
  codeRaw: string | undefined,
  subtotalCents: number,
  customer?: DiscountCustomer,
): Promise<DiscountEvaluation> {
  const code = normalizeCode(codeRaw ?? "");
  if (!code) return { code: null, discountCents: 0, error: null };

  const row = await ctx.db
    .query("discountCodes")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();

  if (!row || !row.active) {
    return { code: null, discountCents: 0, error: "That code isn't valid." };
  }
  if (row.expiresAt && Date.now() > row.expiresAt) {
    return { code: null, discountCents: 0, error: "That code has expired." };
  }
  if (row.usageLimit !== undefined && row.usedCount >= row.usageLimit) {
    return {
      code: null,
      discountCents: 0,
      error: "That code has reached its limit.",
    };
  }
  if (
    row.minSubtotalCents !== undefined &&
    subtotalCents < row.minSubtotalCents
  ) {
    return {
      code: null,
      discountCents: 0,
      error: `Spend at least ${dollars(row.minSubtotalCents)} to use this code.`,
    };
  }
  if (customer && (await customerHasRedeemed(ctx, code, customer))) {
    return {
      code: null,
      discountCents: 0,
      error: "You've already used this code.",
    };
  }

  const raw =
    row.kind === "percent"
      ? Math.round((subtotalCents * row.value) / 100)
      : row.value;
  const discountCents = Math.min(raw, subtotalCents); // never exceed subtotal
  return { code: row, discountCents, error: null };
}

// --- Admin -------------------------------------------------------------------

export const listCodes = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("discountCodes").order("desc").take(200);
  },
});

export const createCode = mutation({
  args: {
    code: v.string(),
    kind: v.union(v.literal("percent"), v.literal("fixed")),
    value: v.number(),
    minSubtotalCents: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const code = normalizeCode(args.code);
    if (!code) throw new Error("A code is required.");
    if (args.value <= 0) throw new Error("Value must be greater than zero.");
    if (args.kind === "percent" && args.value > 100) {
      throw new Error("Percent cannot exceed 100.");
    }
    const existing = await ctx.db
      .query("discountCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (existing) throw new Error(`Code "${code}" already exists.`);

    await ctx.db.insert("discountCodes", {
      code,
      kind: args.kind,
      value: args.value,
      active: true,
      minSubtotalCents: args.minSubtotalCents,
      usageLimit: args.usageLimit,
      usedCount: 0,
      expiresAt: args.expiresAt,
    });
    return { ok: true };
  },
});

export const setCodeActive = mutation({
  args: { codeId: v.id("discountCodes"), active: v.boolean() },
  handler: async (ctx, { codeId, active }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("discountCodes", codeId, { active });
    return { ok: true };
  },
});

export const deleteCode = mutation({
  args: { codeId: v.id("discountCodes") },
  handler: async (ctx, { codeId }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("discountCodes", codeId);
    return { ok: true };
  },
});
