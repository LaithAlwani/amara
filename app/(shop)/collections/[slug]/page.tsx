import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ProductCard } from "@/components/shop/product-card";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchQuery(api.collections.getCollectionBySlug, { slug });
  if (!data) return { title: "Collection not found" };
  return {
    title: data.collection.title,
    description: data.collection.description ?? undefined,
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const data = await fetchQuery(api.collections.getCollectionBySlug, { slug });
  if (!data) notFound();

  const { collection, products } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <header className="max-w-xl">
        <p className="eyebrow">Collection</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight md:text-5xl">
          {collection.title}
        </h1>
        {collection.description ? (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {collection.description}
          </p>
        ) : null}
      </header>

      {products.length === 0 ? (
        <p className="mt-16 text-muted-foreground">
          Nothing in this collection yet.
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
