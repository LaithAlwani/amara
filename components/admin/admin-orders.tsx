"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { SpinnerGap } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import {
  orderStatusBadge,
  fulfillmentLabel,
  type OrderStatus,
} from "./order-status";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type Filter = { label: string; status?: OrderStatus };
const FILTERS: Filter[] = [
  { label: "All" },
  { label: "Paid", status: "paid" },
  { label: "Fulfilled", status: "fulfilled" },
  { label: "Cancelled", status: "cancelled" },
];

export function AdminOrders() {
  const [active, setActive] = useState(0);
  const orders = useQuery(api.admin.listOrders, {
    status: FILTERS[active].status,
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Orders
      </h1>

      <div className="mt-5 flex gap-1">
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setActive(i)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              i === active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders === undefined ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <SpinnerGap className="size-6 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">
          No orders here yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-160 text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  Customer
                </th>
                <th className="px-4 py-2.5 font-medium">Method</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const badge = orderStatusBadge(o.status);
                return (
                  <tr
                    key={o._id}
                    className="border-t border-border hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/orders/${o._id}`}
                        className="hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {dateFmt.format(o.createdAt)}
                    </td>
                    <td className="hidden max-w-56 truncate px-4 py-3 text-muted-foreground sm:table-cell">
                      {o.email}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {o.fulfillmentMethod}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <Badge className={badge.className}>{badge.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {fulfillmentLabel(o.fulfillmentStatus)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPrice(o.totalCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
