import type { Metadata } from "next";
import { MyRewards } from "@/components/account/my-rewards";

export const metadata: Metadata = {
  title: "My rewards",
};

export default function AccountRewardsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Rewards
      </h1>
      <p className="mt-2 text-muted-foreground">
        Earn points on every order and redeem them for money off.
      </p>
      <div className="mt-10">
        <MyRewards />
      </div>
    </div>
  );
}
