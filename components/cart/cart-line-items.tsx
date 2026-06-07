"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, X } from "@phosphor-icons/react";
import { useCart } from "@/components/providers/cart-context";
import { formatPrice } from "@/lib/format";

export function CartLineItems({ onNavigate }: { onNavigate?: () => void }) {
  const { cart, updateQty, removeItem } = useCart();

  return (
    <ul className="divide-y divide-border">
      <AnimatePresence initial={false}>
        {cart.items.map((item) => (
          <motion.li
            key={item.cartItemId}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex gap-4 overflow-hidden py-4"
          >
            <Link
              href={`/products/${item.slug}`}
              onClick={onNavigate}
              className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-secondary"
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : null}
            </Link>

            <div className="flex flex-1 flex-col">
              <div className="flex justify-between gap-2">
                <div>
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={onNavigate}
                    className="text-sm font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.variantTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.cartItemId)}
                  aria-label={`Remove ${item.name}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-auto flex items-center justify-between pt-3">
                <div className="flex items-center rounded-full border border-border">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => updateQty(item.cartItemId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="flex size-8 items-center justify-center rounded-full hover:bg-accent disabled:opacity-40"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateQty(item.cartItemId, item.quantity + 1)}
                    disabled={item.quantity >= item.maxQty}
                    className="flex size-8 items-center justify-center rounded-full hover:bg-accent disabled:opacity-40"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <span className="text-sm">{formatPrice(item.lineTotalCents)}</span>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
