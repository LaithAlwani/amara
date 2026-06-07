import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Checkout cancelled",
};

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-28 text-center">
      <XCircle weight="fill" className="size-12 text-muted-foreground" />
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Payment cancelled
      </h1>
      <p className="max-w-sm text-muted-foreground">
        No charge was made and your bag is still saved. You can pick up right
        where you left off.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/checkout">Return to checkout</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/cart">View bag</Link>
        </Button>
      </div>
    </div>
  );
}
