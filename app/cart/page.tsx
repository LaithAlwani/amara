"use client";

import Link from "next/link";
import { Handbag } from "@phosphor-icons/react";
import { useCart } from "@/components/providers/cart-context";
import { CartLineItems } from "@/components/cart/cart-line-items";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { cart, subtotalCents, count, loading } = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-28 text-center">
        <Handbag className="size-12 text-muted-foreground" />
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {loading ? "Loading your bag" : "Your bag is empty"}
        </h1>
        {!loading ? (
          <>
            <p className="max-w-sm text-muted-foreground">
              Explore small-batch botanicals made in Ottawa.
            </p>
            <Button asChild size="lg">
              <Link href="/shop">Shop the range</Link>
            </Button>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">
        Your bag
      </h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div>
          <CartLineItems />
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium">Order summary</h2>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Subtotal ({count} item{count === 1 ? "" : "s"})
            </span>
            <span className="font-medium">{formatPrice(subtotalCents)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Shipping and taxes calculated at checkout.
          </p>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href="/checkout">Checkout</Link>
          </Button>
          <Button asChild variant="ghost" className="mt-2 w-full">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
