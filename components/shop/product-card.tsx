import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import type { ProductCard as ProductCardData } from "@/convex/catalog";
import { WishlistButton } from "./wishlist-button";

export function ProductCard({ product }: { product: ProductCardData }) {
  const onSale =
    product.compareAtCents != null &&
    product.compareAtCents > product.priceCents;

  return (
    <div className="group relative">
      {/* Heart sits outside the Link so it doesn't trigger navigation. */}
      <WishlistButton
        productId={product._id}
        className="absolute right-3 top-3 z-10"
      />
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-secondary">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 90vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : null}
          {onSale ? (
            <span className="absolute left-3 top-3 rounded-full bg-clay px-2.5 py-1 text-xs font-medium text-clay-foreground">
              Sale
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">{product.name}</h3>
          <div className="flex shrink-0 items-baseline gap-2">
            {onSale ? (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtCents!)}
              </span>
            ) : null}
            <span className="text-sm">{formatPrice(product.priceCents)}</span>
          </div>
        </div>
        {product.shortDescription ? (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {product.shortDescription}
          </p>
        ) : null}
      </Link>
    </div>
  );
}
