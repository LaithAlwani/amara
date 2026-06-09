import {
  query,
  action,
  internalQuery,
  internalMutation,
  ActionCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./admin";
import { shippoProvider } from "./shipping/shippo";
import type { ShipAddress, Parcel } from "./shipping/types";

function shippoToken(): string {
  const t = process.env.SHIPPO_API_KEY;
  if (!t) throw new Error("SHIPPO_API_KEY is not set on the deployment.");
  return t;
}

// --- Admin: read a shipment --------------------------------------------------

export const getShipment = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    await requireAdmin(ctx);
    const shipment = await ctx.db
      .query("shipments")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .first();
    if (!shipment) return null;
    const archivedUrl = shipment.labelStorageId
      ? await ctx.storage.getUrl(shipment.labelStorageId)
      : null;
    return {
      status: shipment.status,
      carrier: shipment.carrier ?? null,
      service: shipment.service ?? null,
      costCents: shipment.costCents ?? null,
      trackingNumber: shipment.trackingNumber ?? null,
      trackingUrl: shipment.trackingUrl ?? null,
      labelUrl: archivedUrl ?? shipment.labelUrl ?? null,
    };
  },
});

// --- Internal: rate-request context for an order -----------------------------

export const getShippingContext = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get("orders", orderId);
    if (!order) throw new Error("Order not found.");
    if (order.fulfillmentMethod !== "ship" || !order.shippingAddress) {
      throw new Error("This order is not a shipping order.");
    }
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    if (!settings) throw new Error("Store settings are not configured.");

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .take(200);
    const weightGrams =
      items.reduce((s, i) => s + i.weightGramsSnapshot * i.quantity, 0) ||
      settings.defaultParcel.gramsFallback;

    const a = order.shippingAddress;
    const sf = settings.shipFromAddress;
    const from: ShipAddress = {
      name: sf.name,
      street1: sf.line1,
      street2: sf.line2,
      city: sf.city,
      state: sf.province,
      zip: sf.postalCode,
      country: sf.country,
      phone: sf.phone,
      email: sf.email,
    };
    const to: ShipAddress = {
      name: a.name,
      street1: a.line1,
      street2: a.line2,
      city: a.city,
      state: a.province,
      zip: a.postalCode,
      country: a.country,
      phone: a.phone,
      email: order.email,
    };
    const parcel: Parcel = {
      lengthCm: settings.defaultParcel.lengthCm,
      widthCm: settings.defaultParcel.widthCm,
      heightCm: settings.defaultParcel.heightCm,
      weightGrams,
    };
    return { from, to, parcel };
  },
});

// --- Internal: persist a purchased label -------------------------------------

export const saveBoughtLabel = internalMutation({
  args: {
    orderId: v.id("orders"),
    carrier: v.string(),
    service: v.string(),
    costCents: v.number(),
    trackingNumber: v.string(),
    trackingUrl: v.optional(v.string()),
    labelUrl: v.string(),
    labelStorageId: v.optional(v.id("_storage")),
    providerTransactionId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("shipments")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .first();
    const fields = {
      orderId: args.orderId,
      provider: "shippo",
      status: "label_purchased" as const,
      carrier: args.carrier,
      service: args.service,
      costCents: args.costCents,
      trackingNumber: args.trackingNumber,
      trackingUrl: args.trackingUrl,
      labelUrl: args.labelUrl,
      labelStorageId: args.labelStorageId,
      providerTransactionId: args.providerTransactionId,
    };
    if (existing) {
      await ctx.db.patch("shipments", existing._id, fields);
    } else {
      await ctx.db.insert("shipments", fields);
    }

    // Move the order to shipped and notify the customer with tracking.
    const order = await ctx.db.get("orders", args.orderId);
    if (order && order.status === "paid") {
      await ctx.db.patch("orders", args.orderId, {
        fulfillmentStatus: "shipped",
        status: "fulfilled",
      });
      await ctx.scheduler.runAfter(0, internal.emails.sendFulfillmentEmail, {
        orderId: args.orderId,
        kind: "shipped",
        trackingNumber: args.trackingNumber || undefined,
        trackingUrl: args.trackingUrl,
      });
    }
    return { ok: true };
  },
});

// --- Admin actions: rates + buy label ---------------------------------------

async function assertAdmin(ctx: ActionCtx) {
  const ok = await ctx.runQuery(api.admin.amIAdmin, {});
  if (!ok) throw new Error("Not authorized.");
}

export const getOrderRates = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    await assertAdmin(ctx);
    const { from, to, parcel } = await ctx.runQuery(
      internal.shipments.getShippingContext,
      { orderId },
    );
    const provider = shippoProvider(shippoToken());
    const rates = await provider.getRates({ from, to, parcel });
    return rates.sort((a, b) => a.amountCents - b.amountCents);
  },
});

export const purchaseLabel = action({
  args: { orderId: v.id("orders"), rateId: v.string() },
  handler: async (ctx, { orderId, rateId }) => {
    await assertAdmin(ctx);
    const provider = shippoProvider(shippoToken());
    const label = await provider.buyLabel(rateId);

    // Archive the label PDF in Convex storage.
    let labelStorageId: Id<"_storage"> | undefined;
    try {
      if (label.labelUrl) {
        const res = await fetch(label.labelUrl);
        if (res.ok) {
          const blob = await res.blob();
          labelStorageId = await ctx.storage.store(blob);
        }
      }
    } catch {
      // Non-fatal: keep the provider-hosted URL if archiving fails.
    }

    await ctx.runMutation(internal.shipments.saveBoughtLabel, {
      orderId,
      carrier: label.carrier,
      service: label.service,
      costCents: label.costCents,
      trackingNumber: label.trackingNumber,
      trackingUrl: label.trackingUrl ?? undefined,
      labelUrl: label.labelUrl,
      labelStorageId,
      providerTransactionId: label.providerTransactionId,
    });
    return { ok: true, trackingNumber: label.trackingNumber };
  },
});
