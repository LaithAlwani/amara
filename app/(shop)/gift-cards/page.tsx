import type { Metadata } from "next";
import { GiftCardBuy } from "@/components/shop/gift-card-buy";
import { GiftCardBalance } from "@/components/shop/gift-card-balance";

export const metadata: Metadata = {
  title: "Gift cards",
  description: "Give the gift of clean, plant-led beauty.",
};

export default function GiftCardsPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Gift cards
      </h1>
      <p className="mt-2 text-muted-foreground">
        Give the gift of clean, plant-led beauty. Delivered by email with a code
        to redeem at checkout.
      </p>
      <div className="mt-10">
        <GiftCardBuy />
      </div>

      <div className="mt-14 border-t border-border pt-10">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Check a balance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Have a gift card? Enter the code to see what&apos;s left.
        </p>
        <div className="mt-5 max-w-md">
          <GiftCardBalance />
        </div>
      </div>
    </div>
  );
}
