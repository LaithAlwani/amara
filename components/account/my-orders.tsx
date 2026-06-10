"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Package, SpinnerGap } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

type OrderStatus =
  | "pending"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

// Customer-facing fulfillment status (hide internal states like "unfulfilled").
function fulfillmentText(status: string): string | null {
  switch (status) {
    case "ready_for_pickup":
      return "Ready for pickup";
    case "picked_up":
      return "Picked up";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    default:
      return null;
  }
}

function statusBadge(status: OrderStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "paid":
      return { label: "Paid", className: "bg-clay/15 text-clay" };
    case "fulfilled":
      return { label: "Fulfilled", className: "bg-clay/15 text-clay" };
    case "pending":
      return {
        label: "Awaiting payment",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      };
    case "cancelled":
      return { label: "Cancelled", className: "bg-muted text-muted-foreground" };
    case "refunded":
      return { label: "Refunded", className: "bg-muted text-muted-foreground" };
  }
}

export function MyOrders() {
  const orders = useQuery(api.orders.listMyOrders);

  if (orders === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <SpinnerGap className="size-6 animate-spin" />
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
        <Package className="size-10 text-muted-foreground" />
        <div>
          <h2 className="font-heading text-xl tracking-tight">No orders yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When you place an order, it will show up here.
          </p>
        </div>
        <Button asChild>
          <Link href="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((order) => {
        const badge = statusBadge(order.status);
        return (
          <li
            key={order._id}
            className="rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {dateFmt.format(order.createdAt)} ·{" "}
                  {order.fulfillmentMethod === "pickup"
                    ? "Local pickup"
                    : "Shipping"}
                </p>
              </div>
              <Badge className={badge.className}>{badge.label}</Badge>
            </div>

            <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
              {order.items.map((item, i) => (
                <li
                  key={i}
                  className="flex justify-between gap-3 text-sm text-muted-foreground"
                >
                  <span>
                    {item.nameSnapshot}
                    <span className="text-muted-foreground/70">
                      {" "}
                      ({item.variantTitleSnapshot}) ×{item.quantity}
                    </span>
                  </span>
                  <span className="whitespace-nowrap">
                    {formatPrice(item.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>

            {fulfillmentText(order.fulfillmentStatus) ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm">
                <span className="text-muted-foreground">
                  {fulfillmentText(order.fulfillmentStatus)}
                  {order.trackingNumber ? (
                    <span className="text-muted-foreground/70">
                      {" "}
                      · {order.trackingNumber}
                    </span>
                  ) : null}
                </span>
                {order.trackingUrl ? (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-clay underline-offset-2 hover:underline"
                  >
                    Track parcel
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm font-medium">
              <span>Total</span>
              <span>{formatPrice(order.totalCents)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
