import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Collections",
  description: "Shop Amara by ritual: skincare, body, and our best sellers.",
};

export default async function CollectionsPage() {
  const collections = await fetchQuery(api.collections.listCollections, {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <header className="max-w-xl">
        <p className="eyebrow">Browse</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight md:text-5xl">
          Collections
        </h1>
      </header>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {collections.map((collection) => (
          <Link
            key={collection._id}
            href={`/collections/${collection.slug}`}
            className="group relative aspect-16/10 overflow-hidden rounded-3xl bg-secondary"
          >
            {collection.image ? (
              <Image
                src={collection.image}
                alt={collection.title}
                fill
                sizes="(min-width: 640px) 45vw, 90vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : null}
            <div className="absolute inset-0 bg-linear-to-t from-black/55 to-transparent" />
            <div className="absolute bottom-0 p-6 text-white">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                {collection.title}
              </h2>
              {collection.description ? (
                <p className="mt-1 max-w-sm text-sm text-white/85">
                  {collection.description}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
