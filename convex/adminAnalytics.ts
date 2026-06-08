import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./admin";
import { LOW_STOCK_THRESHOLD } from "./adminCatalog";

// Admin dashboard overview. Computed from orders/products on read — fine at MVP
// scale (bounded scans); revisit with rollups if volume grows.
export const getOverview = query({
  args: { sinceDays: v.optional(v.number()) },
  handler: async (ctx, { sinceDays }) => {
    await requireAdmin(ctx);

    const cutoff =
      sinceDays && sinceDays > 0 ? Date.now() - sinceDays * 86_400_000 : 0;

    // Revenue orders = paid or fulfilled within the window.
    const paid = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .order("desc")
      .take(1000);
    const fulfilled = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "fulfilled"))
      .order("desc")
      .take(1000);
    const revenueOrders = [...paid, ...fulfilled].filter(
      (o) => o._creationTime >= cutoff,
    );

    let revenueCents = 0;
    let unitsSold = 0;
    const productAgg = new Map<
      Id<"products">,
      { name: string; units: number; revenueCents: number }
    >();

    for (const order of revenueOrders) {
      revenueCents += order.totalCents;
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .take(200);
      for (const it of items) {
        unitsSold += it.quantity;
        const cur = productAgg.get(it.productId) ?? {
          name: it.nameSnapshot,
          units: 0,
          revenueCents: 0,
        };
        cur.units += it.quantity;
        cur.revenueCents += it.lineTotalCents;
        productAgg.set(it.productId, cur);
      }
    }

    const orderCount = revenueOrders.length;
    const topProducts = [...productAgg.values()]
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 5);

    // Low stock (active variants at/below threshold).
    const variants = await ctx.db.query("productVariants").take(1000);
    const lowStock: { productName: string; variantTitle: string; qty: number }[] =
      [];
    for (const variant of variants) {
      if (!variant.active || variant.inventoryQty > LOW_STOCK_THRESHOLD) continue;
      const product = await ctx.db.get("products", variant.productId);
      lowStock.push({
        productName: product?.name ?? "(deleted)",
        variantTitle: variant.title,
        qty: variant.inventoryQty,
      });
      if (lowStock.length >= 20) break;
    }
    lowStock.sort((a, b) => a.qty - b.qty);

    // Recent real orders (any non-pending status).
    const recent = await ctx.db
      .query("orders")
      .order("desc")
      .take(40);
    const recentOrders = recent
      .filter((o) => o.status !== "pending")
      .slice(0, 8)
      .map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        email: o.email,
        totalCents: o.totalCents,
        status: o.status,
        createdAt: o._creationTime,
      }));

    return {
      revenueCents,
      orderCount,
      aovCents: orderCount > 0 ? Math.round(revenueCents / orderCount) : 0,
      unitsSold,
      topProducts,
      lowStock,
      recentOrders,
    };
  },
});
