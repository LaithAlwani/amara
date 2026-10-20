import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./admin";

// Defaults mirror the original hardcoded homepage, so the site renders fully
// before anything is saved in the admin.
const DEFAULTS = {
  heroEyebrow: "Plant-led skincare",
  heroTitle: "Quiet rituals for considered skin",
  heroSubtitle:
    "Small-batch botanicals made in Ottawa. Shipped flat-rate across Canada, or ready for local pickup the same week.",
  heroCtaLabel: "Shop the range",
  heroCtaHref: "/shop",
  ctaTitle: "Build a routine that feels like yours",
  ctaBody:
    "Start with a best seller, or explore the full range of small-batch botanicals.",
  accentHex: "#c56a45",
  primaryHex: "#1f3d2b",
  backgroundHex: "#f4f1ea",
  foregroundHex: "#14241a",
};

export const getSiteContent = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", "home"))
      .unique();
    const heroImageUrl = row?.heroImageStorageId
      ? await ctx.storage.getUrl(row.heroImageStorageId)
      : null;
    if (!row) return { ...DEFAULTS, heroImageUrl };
    const { _id, _creationTime, key, heroImageStorageId, ...content } = row;
    void _id;
    void _creationTime;
    void key;
    void heroImageStorageId;
    // Merge over defaults so newly-added fields (e.g. primaryHex) are filled.
    return {
      ...DEFAULTS,
      ...content,
      primaryHex: content.primaryHex ?? DEFAULTS.primaryHex,
      backgroundHex: content.backgroundHex ?? DEFAULTS.backgroundHex,
      foregroundHex: content.foregroundHex ?? DEFAULTS.foregroundHex,
      heroImageUrl,
    };
  },
});

// Set (or clear) the homepage hero image. Deletes the previous blob so storage
// never leaks. Pass no storageId to remove the current image.
export const setHeroImage = mutation({
  args: { storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { storageId }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", "home"))
      .unique();

    const prev = existing?.heroImageStorageId;
    if (prev && prev !== storageId) {
      await ctx.storage.delete(prev);
    }

    if (existing) {
      await ctx.db.patch("siteContent", existing._id, {
        heroImageStorageId: storageId,
      });
    } else {
      await ctx.db.insert("siteContent", {
        key: "home",
        heroImageStorageId: storageId,
        ...DEFAULTS,
      });
    }
    return { ok: true };
  },
});

export const updateSiteContent = mutation({
  args: {
    heroEyebrow: v.string(),
    heroTitle: v.string(),
    heroSubtitle: v.string(),
    heroCtaLabel: v.string(),
    heroCtaHref: v.string(),
    ctaTitle: v.string(),
    ctaBody: v.string(),
    accentHex: v.string(),
    primaryHex: v.string(),
    backgroundHex: v.string(),
    foregroundHex: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const safeHex = (value: string, fallback: string) =>
      /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
    const doc = {
      key: "home" as const,
      ...args,
      accentHex: safeHex(args.accentHex, DEFAULTS.accentHex),
      primaryHex: safeHex(args.primaryHex, DEFAULTS.primaryHex),
      backgroundHex: safeHex(args.backgroundHex, DEFAULTS.backgroundHex),
      foregroundHex: safeHex(args.foregroundHex, DEFAULTS.foregroundHex),
    };
    const existing = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", "home"))
      .unique();
    if (existing) {
      await ctx.db.patch("siteContent", existing._id, doc);
    } else {
      await ctx.db.insert("siteContent", doc);
    }
    return { ok: true };
  },
});
