import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./admin";

async function getSettings(ctx: QueryCtx) {
  const s = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
  if (!s) throw new Error("Store settings are not configured.");
  return s;
}

async function activePickup(ctx: QueryCtx) {
  return await ctx.db
    .query("pickupLocations")
    .withIndex("by_active", (q) => q.eq("active", true))
    .first();
}

// --- Read --------------------------------------------------------------------

export const getStoreSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await getSettings(ctx);
    const pickup = await activePickup(ctx);
    return {
      shipFrom: settings.shipFromAddress,
      pickup: pickup
        ? {
            name: pickup.name,
            addressLine1: pickup.addressLine1,
            city: pickup.city,
            province: pickup.province,
            postalCode: pickup.postalCode,
            country: pickup.country,
            instructions: pickup.instructions ?? "",
          }
        : null,
    };
  },
});

// --- Pickup location ---------------------------------------------------------

export const updatePickupLocation = mutation({
  args: {
    name: v.string(),
    addressLine1: v.string(),
    city: v.string(),
    province: v.string(),
    postalCode: v.string(),
    country: v.string(),
    instructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const doc = {
      name: args.name.trim(),
      addressLine1: args.addressLine1.trim(),
      city: args.city.trim(),
      province: args.province.trim(),
      postalCode: args.postalCode.trim(),
      country: args.country.trim() || "CA",
      instructions: args.instructions?.trim() || undefined,
      active: true,
    };
    const existing = await activePickup(ctx);
    if (existing) {
      await ctx.db.patch("pickupLocations", existing._id, doc);
    } else {
      await ctx.db.insert("pickupLocations", doc);
    }
    return { ok: true };
  },
});

// --- Ship-from (warehouse) for shipping labels -------------------------------

export const updateShipFrom = mutation({
  args: {
    name: v.string(),
    company: v.optional(v.string()),
    line1: v.string(),
    line2: v.optional(v.string()),
    city: v.string(),
    province: v.string(),
    postalCode: v.string(),
    country: v.string(),
    phone: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const settings = await getSettings(ctx);
    await ctx.db.patch("settings", settings._id, {
      shipFromAddress: {
        name: args.name.trim(),
        company: args.company?.trim() || undefined,
        line1: args.line1.trim(),
        line2: args.line2?.trim() || undefined,
        city: args.city.trim(),
        province: args.province.trim(),
        postalCode: args.postalCode.trim(),
        country: args.country.trim() || "CA",
        phone: args.phone.trim(),
        email: args.email.trim(),
      },
    });
    return { ok: true };
  },
});
