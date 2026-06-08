"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { Heart } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  variant = "icon",
  className,
}: {
  productId: string;
  variant?: "icon" | "labeled";
  className?: string;
}) {
  const id = productId as Id<"products">;
  const router = useRouter();
  const { isSignedIn } = useUser();
  const ids = useQuery(api.wishlist.myWishlistIds);
  const toggle = useMutation(api.wishlist.toggleWishlist);

  const saved = ids?.includes(id) ?? false;

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn) {
      toast.message("Sign in to save favorites");
      router.push("/sign-in");
      return;
    }
    try {
      const res = await toggle({ productId: id });
      toast.success(res.wishlisted ? "Saved to wishlist" : "Removed from wishlist");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update wishlist");
    }
  }

  if (variant === "labeled") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        className={className}
      >
        <Heart className="size-4" weight={saved ? "fill" : "regular"} />
        {saved ? "Saved" : "Save to wishlist"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition hover:bg-background",
        className,
      )}
    >
      <Heart
        className={cn("size-5", saved && "text-clay")}
        weight={saved ? "fill" : "regular"}
      />
    </button>
  );
}
