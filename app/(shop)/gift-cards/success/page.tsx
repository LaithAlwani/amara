import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Gift card on its way",
};

export default function GiftCardSuccessPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-28 text-center">
      <CheckCircle weight="fill" className="size-12 text-clay" />
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Gift card sent
      </h1>
      <p className="max-w-sm text-muted-foreground">
        Thank you! The gift card code is on its way to the recipient&apos;s
        inbox. They can redeem it at checkout.
      </p>
      <Button asChild size="lg">
        <Link href="/shop">Continue shopping</Link>
      </Button>
    </div>
  );
}
