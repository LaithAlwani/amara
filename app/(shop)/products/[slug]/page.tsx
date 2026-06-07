import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ProductPurchasePanel } from "@/components/shop/product-purchase-panel";

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

  const [hero, ...rest] = product.images;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl bg-secondary">
            {hero ? (
              <Image
                src={hero}
                alt={product.name}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            ) : null}
          </div>
          {rest.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {rest.slice(0, 3).map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-2xl bg-secondary"
                >
                  <Image
                    src={src}
                    alt={`${product.name} view ${i + 2}`}
                    fill
                    sizes="20vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Details */}
        <div className="lg:py-4">
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
