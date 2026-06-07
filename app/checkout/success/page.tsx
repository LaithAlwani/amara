import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <OrderConfirmation orderId={orderId} />
    </div>
  );
}
