import {
  query,
  internalQuery,
  internalMutation,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAdmin } from "./admin";

// Keep a little chargeable remainder so the Stripe total never hits $0.
const MIN_CHARGE_CENTS = 50;

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `AMARA-GIFT-${s}`;
}

export type GiftCardEvaluation = {
  card: Doc<"giftCards"> | null;
  redeemCents: number;
  error: string | null;
};

// How much of `orderTotalCents` this gift card can cover (leaving a small
// chargeable remainder).
export async function evaluateGiftCard(
  ctx: QueryCtx | MutationCtx,
  codeRaw: string | undefined,
  orderTotalCents: number,
): Promise<GiftCardEvaluation> {
  const code = normalizeCode(codeRaw ?? "");
  if (!code) return { card: null, redeemCents: 0, error: null };
  const card = await ctx.db
    .query("giftCards")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();
  if (!card || !card.active || card.balanceCents <= 0) {
    return { card: null, redeemCents: 0, error: "That gift card isn't valid." };
  }
  // Cover the whole order when possible (→ $0 due, finalized without Stripe).
  // Otherwise spend the balance, but never leave a remainder Stripe can't
  // charge (its minimum is $0.50) — in that case keep exactly the minimum.
  let redeemCents: number;
  if (card.balanceCents >= orderTotalCents) {
    redeemCents = orderTotalCents;
  } else {
    redeemCents = card.balanceCents;
    if (orderTotalCents - redeemCents < MIN_CHARGE_CENTS) {
      redeemCents = Math.max(0, orderTotalCents - MIN_CHARGE_CENTS);
    }
  }
  return { card, redeemCents, error: null };
}

export async function redeemGiftCardBalance(
  ctx: MutationCtx,
  code: string,
  cents: number,
): Promise<void> {
  if (cents <= 0) return;
  const card = await ctx.db
    .query("giftCards")
    .withIndex("by_code", (q) => q.eq("code", normalizeCode(code)))
    .unique();
  if (!card) return;
  const newBalance = Math.max(0, card.balanceCents - cents);
  await ctx.db.patch("giftCards", card._id, {
    balanceCents: newBalance,
    active: newBalance > 0,
  });
}

// --- Purchase (webhook) ------------------------------------------------------

export const createFromPurchase = internalMutation({
  args: {
    stripeSessionId: v.string(),
    amountCents: v.number(),
    purchaserEmail: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("giftCards")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .unique();
    if (existing) return { ok: true, dup: true };

    let code = randomCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query("giftCards")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!clash) break;
      code = randomCode();
    }

    const giftCardId = await ctx.db.insert("giftCards", {
      code,
      initialCents: args.amountCents,
      balanceCents: args.amountCents,
      active: true,
      purchaserEmail: args.purchaserEmail,
      recipientEmail: args.recipientEmail,
      message: args.message,
      stripeSessionId: args.stripeSessionId,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendGiftCardEmail, {
      giftCardId,
    });
    return { ok: true, giftCardId };
  },
});

export const getForEmail = internalQuery({
  args: { giftCardId: v.id("giftCards") },
  handler: async (ctx, { giftCardId }) => {
    const card = await ctx.db.get("giftCards", giftCardId);
    if (!card) return null;
    return {
      code: card.code,
      initialCents: card.initialCents,
      recipientEmail: card.recipientEmail ?? null,
      purchaserEmail: card.purchaserEmail ?? null,
      message: card.message ?? null,
    };
  },
});

// --- Storefront: check a balance --------------------------------------------

export const checkBalance = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const normalized = normalizeCode(code);
    if (!normalized) return null;
    const card = await ctx.db
      .query("giftCards")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();
    if (!card) return { found: false as const };
    return {
      found: true as const,
      balanceCents: card.balanceCents,
      active: card.active && card.balanceCents > 0,
    };
  },
});

// --- Admin -------------------------------------------------------------------

export const listGiftCards = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const cards = await ctx.db.query("giftCards").order("desc").take(200);
    return cards.map((c) => ({
      _id: c._id,
      code: c.code,
      initialCents: c.initialCents,
      balanceCents: c.balanceCents,
      active: c.active,
      recipientEmail: c.recipientEmail ?? null,
      createdAt: c._creationTime,
    }));
  },
});
