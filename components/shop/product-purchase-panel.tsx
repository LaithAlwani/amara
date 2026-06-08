"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { Minus, Plus, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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

type Mode = "one-time" | "subscribe";

const INTERVALS = [
  { count: 1, label: "Monthly" },
  { count: 2, label: "Every 2 months" },
  { count: 3, label: "Every 3 months" },
];

function subPrice(cents: number, percent: number): number {
  return Math.round((cents * (100 - percent)) / 100);
}

export function ProductPurchasePanel({
  variants,
  subscriptionDiscountPercent,
}: {
  variants: Variant[];
  subscriptionDiscountPercent: number;
}) {
  const [selectedId, setSelectedId] = useState(variants[0]?._id);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<Mode>("one-time");
  const [interval, setInterval] = useState(1);
  const [subscribing, setSubscribing] = useState(false);
  const { addItem } = useCart();
  const { isSignedIn } = useUser();
  const router = useRouter();
  const startSubscription = useAction(api.payments.createSubscriptionCheckout);

  const selected = variants.find((v) => v._id === selectedId) ?? variants[0];
  const multiple = variants.length > 1;
  const subscribable = subscriptionDiscountPercent > 0;
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

  const subscriptionUnit = subPrice(
    selected.priceCents,
    subscriptionDiscountPercent,
  );

  async function subscribe() {
    if (!isSignedIn) {
      toast.message("Sign in to subscribe");
      router.push("/sign-in");
      return;
    }
    setSubscribing(true);
    try {
      const { url } = await startSubscription({
        variantId: selected._id as Id<"productVariants">,
        quantity: qty,
        intervalCount: interval,
        origin: window.location.origin,
      });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start subscription");
      setSubscribing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-medium">
          {mode === "subscribe"
            ? formatPrice(subscriptionUnit)
            : formatPrice(selected.priceCents)}
        </span>
        {mode === "subscribe" ? (
          <span className="text-base text-muted-foreground line-through">
            {formatPrice(selected.priceCents)}
          </span>
        ) : onSale ? (
          <span className="text-base text-muted-foreground line-through">
            {formatPrice(selected.compareAtCents!)}
          </span>
        ) : null}
      </div>

      {/* Purchase mode */}
      {subscribable ? (
        <div className="grid grid-cols-2 gap-2">
          <ModeOption
            active={mode === "one-time"}
            onClick={() => setMode("one-time")}
            title="One-time"
            subtitle="Single purchase"
          />
          <ModeOption
            active={mode === "subscribe"}
            onClick={() => setMode("subscribe")}
            title={`Subscribe & Save ${subscriptionDiscountPercent}%`}
            subtitle="Delivered on a schedule"
          />
        </div>
      ) : null}

      {mode === "subscribe" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Delivery frequency</p>
          <div className="flex flex-wrap gap-2">
            {INTERVALS.map((opt) => (
              <button
                key={opt.count}
                type="button"
                onClick={() => setInterval(opt.count)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  interval === opt.count
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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

        {mode === "subscribe" ? (
          <Button
            size="lg"
            className="flex-1"
            disabled={!selected.inStock || subscribing}
            onClick={subscribe}
          >
            {subscribing ? (
              <SpinnerGap className="size-4 animate-spin" />
            ) : selected.inStock ? (
              "Subscribe"
            ) : (
              "Out of stock"
            )}
          </Button>
        ) : (
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
        )}
      </div>

      {mode === "subscribe" ? (
        <p className="text-xs text-muted-foreground">
          Ships every {interval === 1 ? "month" : `${interval} months`}. Pause or
          cancel anytime from your account. Includes shipping + tax each delivery.
        </p>
      ) : null}
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-foreground",
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}
