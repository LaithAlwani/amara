import type { Metadata } from "next";
import { MySubscriptions } from "@/components/account/my-subscriptions";

export const metadata: Metadata = {
  title: "My subscriptions",
};

export default function AccountSubscriptionsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        My subscriptions
      </h1>
      <p className="mt-2 text-muted-foreground">
        Manage your recurring deliveries — pause, resume, or cancel anytime.
      </p>
      <div className="mt-10">
        <MySubscriptions />
      </div>
    </div>
  );
}
