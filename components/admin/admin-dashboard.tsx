"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Warning, SpinnerGap } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { orderStatusBadge, type OrderStatus } from "./order-status";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
});

const WINDOWS: { label: string; days?: number }[] = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time" },
];

export function AdminDashboard() {
  // Default to the 30-day window.
  const [win, setWin] = useState(1);
  const data = useQuery(api.adminAnalytics.getOverview, {
    sinceDays: WINDOWS[win].days,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <div className="flex gap-1">
          {WINDOWS.map((w, i) => (
            <button
              key={w.label}
              onClick={() => setWin(i)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                i === win
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {data === undefined ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <SpinnerGap className="size-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Revenue" value={formatPrice(data.revenueCents)} />
            <Kpi label="Orders" value={String(data.orderCount)} />
            <Kpi label="Avg order" value={formatPrice(data.aovCents)} />
            <Kpi label="Units sold" value={String(data.unitsSold)} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Top products */}
            <Card title="Top products">
              {data.topProducts.length === 0 ? (
                <Empty>No sales in this period.</Empty>
              ) : (
                <ul className="space-y-3">
                  {data.topProducts.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{p.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {p.units} sold · {formatPrice(p.revenueCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Low stock */}
            <Card title="Low stock">
              {data.lowStock.length === 0 ? (
                <Empty>Everything is well stocked.</Empty>
              ) : (
                <ul className="space-y-3">
                  {data.lowStock.map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">
                        {s.productName}
                        <span className="text-muted-foreground/70">
                          {" "}
                          ({s.variantTitle})
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-amber-700 dark:text-amber-400">
                        <Warning className="size-3.5" weight="fill" />
                        {s.qty} left
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Recent orders */}
          <Card title="Recent orders" className="mt-6">
            {data.recentOrders.length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentOrders.map((o) => {
                  const badge = orderStatusBadge(o.status as OrderStatus);
                  return (
                    <li key={o._id}>
                      <Link
                        href={`/admin/orders/${o._id}`}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm hover:opacity-80"
                      >
                        <span className="font-medium">{o.orderNumber}</span>
                        <span className="hidden flex-1 truncate text-muted-foreground sm:block">
                          {o.email}
                        </span>
                        <Badge className={badge.className}>{badge.label}</Badge>
                        <span className="w-16 text-right text-muted-foreground">
                          {dateFmt.format(o.createdAt)}
                        </span>
                        <span className="w-16 text-right">
                          {formatPrice(o.totalCents)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function Card({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <h2 className="mb-4 text-sm font-medium">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-muted-foreground">{children}</p>;
}
