"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { ArrowLeft, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { orderStatusBadge, fulfillmentLabel } from "./order-status";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const id = orderId as Id<"orders">;
  const order = useQuery(api.admin.getOrder, { orderId: id });
  const markReadyForPickup = useMutation(api.admin.markReadyForPickup);
  const markPickedUp = useMutation(api.admin.markPickedUp);
  const markShipped = useMutation(api.admin.markShipped);
  const [busy, setBusy] = useState(false);

  if (order === undefined) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <SpinnerGap className="size-6 animate-spin" />
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">That order could not be found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const badge = orderStatusBadge(order.status);

  async function run(
    action: (args: { orderId: Id<"orders"> }) => Promise<unknown>,
    success: string,
  ) {
    setBusy(true);
    try {
      await action({ orderId: id });
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // Which fulfillment actions are available for this order's current state.
  const actionable = order.status === "paid" || order.status === "fulfilled";
  const isPickup = order.fulfillmentMethod === "pickup";
  const fs = order.fulfillmentStatus;
  const canReady = actionable && isPickup && fs === "unfulfilled";
  const canPickup = actionable && isPickup && fs === "ready_for_pickup";
  const canShip =
    actionable && !isPickup && fs !== "shipped" && fs !== "delivered";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {order.orderNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {dateFmt.format(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={badge.className}>{badge.label}</Badge>
          <span className="text-xs text-muted-foreground">
            {fulfillmentLabel(order.fulfillmentStatus)}
          </span>
        </div>
      </div>

      {/* Fulfillment actions */}
      {(canReady || canPickup || canShip) && (
        <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4">
          {canReady && (
            <Button
              disabled={busy}
              onClick={() =>
                run(markReadyForPickup, "Marked ready — customer notified")
              }
            >
              Mark ready for pickup
            </Button>
          )}
          {canPickup && (
            <Button
              disabled={busy}
              onClick={() => run(markPickedUp, "Marked picked up")}
            >
              Mark picked up
            </Button>
          )}
          {canShip && (
            <Button
              disabled={busy}
              onClick={() => run(markShipped, "Marked shipped — customer notified")}
            >
              Mark shipped
            </Button>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <InfoCard title="Customer">
          <p>{order.email}</p>
        </InfoCard>
        <InfoCard
          title={order.fulfillmentMethod === "pickup" ? "Pickup" : "Ship to"}
        >
          {order.fulfillmentMethod === "pickup" && order.pickupLocation ? (
            <p className="text-muted-foreground">
              {order.pickupLocation.name}, {order.pickupLocation.addressLine1},{" "}
              {order.pickupLocation.city}, {order.pickupLocation.province}{" "}
              {order.pickupLocation.postalCode}
            </p>
          ) : order.shippingAddress ? (
            <p className="text-muted-foreground">
              {order.shippingAddress.name}, {order.shippingAddress.line1},{" "}
              {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
              {order.shippingAddress.postalCode}
            </p>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </InfoCard>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <ul className="space-y-2">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {item.nameSnapshot}
                <span className="text-muted-foreground/70">
                  {" "}
                  ({item.variantTitleSnapshot}) · {item.skuSnapshot} ×
                  {item.quantity}
                </span>
              </span>
              <span className="whitespace-nowrap">
                {formatPrice(item.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
          <Row label="Subtotal" value={formatPrice(order.subtotalCents)} />
          <Row
            label="Shipping"
            value={
              order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)
            }
          />
          <Row label="Tax (HST)" value={formatPrice(order.taxCents)} />
          <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
            <span>Total</span>
            <span>{formatPrice(order.totalCents)}</span>
          </div>
        </div>
        {order.paidAt && (
          <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
            Paid {dateFmt.format(order.paidAt)}
            {order.stripePaymentIntentId
              ? ` · ${order.stripePaymentIntentId}`
              : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm">
      <p className="font-medium">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
