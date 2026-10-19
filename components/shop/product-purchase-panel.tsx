"use client";

import { useState } from "react";
import { Minus, Plus, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/components/providers/cart-context";

type Variant = {
  _id: string;
  sku: string;
  title: string;
  priceCents: number;
  compareAtCents?: number;
  inStock: boolean;
};

export function ProductPurchasePanel({ variants }: { variants: Variant[] }) {
  const [selectedId, setSelectedId] = useState(variants[0]?._id);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const { addItem } = useCart();

  const selected = variants.find((v) => v._id === selectedId) ?? variants[0];
  const multiple = variants.length > 1;
  const onSale =
    selected?.compareAtCents != null &&
    selected.compareAtCents > selected.priceCents;

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground">
        This product is not available right now.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-medium">
          {formatPrice(selected.priceCents)}
        </span>
        {onSale ? (
          <>
            <span className="text-base text-muted-foreground line-through">
              {formatPrice(selected.compareAtCents!)}
            </span>
            <span className="rounded-full bg-clay px-2.5 py-1 text-xs font-medium text-clay-foreground">
              Save {formatPrice(selected.compareAtCents! - selected.priceCents)}
            </span>
          </>
        ) : null}
      </div>

      {multiple ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Option</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant._id}
                type="button"
                onClick={() => setSelectedId(variant._id)}
                disabled={!variant.inStock}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  variant._id === selected._id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-foreground",
                  !variant.inStock && "cursor-not-allowed opacity-40",
                )}
              >
                {variant.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex size-10 items-center justify-center rounded-full hover:bg-accent"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => q + 1)}
            className="flex size-10 items-center justify-center rounded-full hover:bg-accent"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <Button
          size="lg"
          className="flex-1"
          disabled={!selected.inStock || adding}
          onClick={async () => {
            setAdding(true);
            try {
              await addItem(selected._id, qty);
            } finally {
              setAdding(false);
            }
          }}
        >
          {adding ? (
            <SpinnerGap className="size-4 animate-spin" />
          ) : selected.inStock ? (
            "Add to bag"
          ) : (
            "Out of stock"
          )}
        </Button>
      </div>
    </div>
  );
}
