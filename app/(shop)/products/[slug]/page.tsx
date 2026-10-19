import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductPurchasePanel } from "@/components/shop/product-purchase-panel";
import { WishlistButton } from "@/components/shop/wishlist-button";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchQuery(api.products.getProductBySlug, { slug });
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.shortDescription ?? product.description.slice(0, 150),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await fetchQuery(api.products.getProductBySlug, { slug });
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:gap-16">
        {/* Gallery */}
        <ProductGallery images={product.images} alt={product.name} />

        {/* Details */}
        <div className="sm:py-4">
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {product.name}
          </h1>
          {product.shortDescription ? (
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
              {product.shortDescription}
            </p>
          ) : null}

          <div className="mt-8">
            <ProductPurchasePanel variants={product.variants} />
          </div>

          <div className="mt-4">
            <WishlistButton productId={product._id} variant="labeled" />
          </div>

          <div className="mt-10 border-t border-border pt-8">
            <h2 className="text-sm font-medium">Details</h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
