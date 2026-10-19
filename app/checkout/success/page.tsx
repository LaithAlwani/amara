import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";

export const metadata: Metadata = {
  title: "Order confirmed",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  // Our Convex order id is passed as `order` (Square appends its own `orderId`).
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <OrderConfirmation orderId={order} />
    </div>
  );
}
