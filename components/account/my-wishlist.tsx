"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Heart, SpinnerGap } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/product-card";

export function MyWishlist() {
  const items = useQuery(api.wishlist.getWishlist);

  if (items === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <SpinnerGap className="size-6 animate-spin" />
        <p>Loading your wishlist...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
        <Heart className="size-10 text-muted-foreground" />
        <div>
          <h2 className="font-heading text-xl tracking-tight">
            No saved items yet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the heart on any product to save it here.
          </p>
        </div>
        <Button asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
      {items.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
