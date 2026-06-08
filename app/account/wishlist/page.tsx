import type { Metadata } from "next";
import { MyWishlist } from "@/components/account/my-wishlist";

export const metadata: Metadata = {
  title: "My wishlist",
};

export default function AccountWishlistPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        My wishlist
      </h1>
      <p className="mt-2 text-muted-foreground">
        Everything you&apos;ve saved for later.
      </p>
      <div className="mt-10">
        <MyWishlist />
      </div>
    </div>
  );
}
