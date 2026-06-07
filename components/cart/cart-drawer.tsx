"use client";

import Link from "next/link";
import { Handbag } from "@phosphor-icons/react";
import { useCart } from "@/components/providers/cart-context";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CartLineItems } from "@/components/cart/cart-line-items";
import { formatPrice } from "@/lib/format";

export function CartDrawer() {
  const { open, setOpen, cart, count, subtotalCents } = useCart();
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl tracking-tight">
            Your bag {count > 0 ? `(${count})` : ""}
          </SheetTitle>
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <Handbag className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Your bag is empty.</p>
            <Button asChild onClick={close}>
              <Link href="/shop">Shop the range</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              <CartLineItems onNavigate={close} />
            </div>
            <SheetFooter className="gap-3 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotalCents)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping and taxes calculated at checkout.
              </p>
              <Button asChild size="lg" onClick={close}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button asChild variant="outline" onClick={close}>
                <Link href="/cart">View bag</Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
