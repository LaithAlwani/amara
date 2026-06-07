import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { Id } from "@/convex/_generated/dataModel";

export const metadata: Metadata = {
  title: "Order confirmed",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  if (!orderId) notFound();

  const order = await fetchQuery(api.checkout.getOrderConfirmation, {
    orderId: orderId as Id<"orders">,
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <CheckCircle weight="fill" className="size-12 text-clay" />
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
          Thank you
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your order <span className="font-medium text-foreground">{order.orderNumber}</span>{" "}
          is confirmed. A receipt is on its way to {order.email}.
        </p>
        {order.status === "pending" ? (
          <p className="mt-2 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            Status: awaiting payment (payment step arrives in the next phase)
          </p>
        ) : null}
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
    </div>
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
