import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ProductCard } from "@/components/shop/product-card";

export const metadata: Metadata = {
  title: "Shop",
  description: "Small-batch, plant-led skincare and body care from Amara.",
};

export default async function ShopPage() {
  const products = await fetchQuery(api.products.listProducts, {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <header className="max-w-xl">
        <p className="eyebrow">The range</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight md:text-5xl">
          Shop all
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Considered formulas in small batches. Free local pickup in Ottawa, or
          flat-rate shipping across Canada.
        </p>
      </header>

      {products.length === 0 ? (
        <p className="mt-16 text-muted-foreground">
          No products yet. Check back soon.
        </p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
