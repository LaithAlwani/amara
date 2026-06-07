"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { CheckCircle, SpinnerGap, Warning } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

export function OrderConfirmation({ orderId }: { orderId: string }) {
  const order = useQuery(api.checkout.getOrderConfirmation, {
    orderId: orderId as Id<"orders">,
  });

  if (order === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <SpinnerGap className="size-6 animate-spin" />
        <p>Loading your order...</p>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <Warning className="size-10 text-muted-foreground" />
        <h1 className="font-heading text-2xl tracking-tight">
          We could not find that order
        </h1>
        <Button asChild>
          <Link href="/shop">Back to shop</Link>
        </Button>
      </div>
    );
  }

  const paid = order.status === "paid" || order.status === "fulfilled";
  const cancelled = order.status === "cancelled";

  return (
    <>
      <div className="flex flex-col items-center text-center">
        {cancelled ? (
          <Warning weight="fill" className="size-12 text-muted-foreground" />
        ) : paid ? (
          <CheckCircle weight="fill" className="size-12 text-clay" />
        ) : (
          <SpinnerGap className="size-12 animate-spin text-clay" />
        )}
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
          {cancelled ? "Order cancelled" : paid ? "Thank you" : "Almost there"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Order{" "}
          <span className="font-medium text-foreground">
            {order.orderNumber}
          </span>
          {cancelled
            ? " was cancelled."
            : paid
              ? ` is confirmed. A receipt is on its way to ${order.email}.`
              : " — confirming your payment, this updates automatically."}
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <ul className="space-y-3">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {item.nameSnapshot}
                <span className="text-muted-foreground/70">
                  {" "}
                  ({item.variantTitleSnapshot}) x{item.quantity}
                </span>
              </span>
              <span>{formatPrice(item.lineTotalCents)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
          <Line label="Subtotal" value={formatPrice(order.subtotalCents)} />
          <Line
            label="Shipping"
            value={
              order.shippingCents === 0
                ? "Free"
                : formatPrice(order.shippingCents)
            }
          />
          <Line label="Tax (HST)" value={formatPrice(order.taxCents)} />
          <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
            <span>Total</span>
            <span>{formatPrice(order.totalCents)}</span>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-sm">
          {order.fulfillmentMethod === "pickup" && order.pickupLocation ? (
            <>
              <p className="font-medium">Pickup</p>
              <p className="mt-1 text-muted-foreground">
                {order.pickupLocation.name}, {order.pickupLocation.addressLine1},{" "}
                {order.pickupLocation.city}, {order.pickupLocation.province}{" "}
                {order.pickupLocation.postalCode}
              </p>
            </>
          ) : order.shippingAddress ? (
            <>
              <p className="font-medium">Shipping to</p>
              <p className="mt-1 text-muted-foreground">
                {order.shippingAddress.name}, {order.shippingAddress.line1},{" "}
                {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                {order.shippingAddress.postalCode}
              </p>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Button asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/orders">View my orders</Link>
        </Button>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
