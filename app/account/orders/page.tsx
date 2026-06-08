import type { Metadata } from "next";
import { MyOrders } from "@/components/account/my-orders";

export const metadata: Metadata = {
  title: "My orders",
};

export default function AccountOrdersPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        My orders
      </h1>
      <p className="mt-2 text-muted-foreground">
        Track and review everything you&apos;ve ordered from Amara.
      </p>
      <div className="mt-10">
        <MyOrders />
      </div>
    </div>
  );
}
