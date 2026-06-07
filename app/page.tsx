import Link from "next/link";
import Image from "next/image";
import { Leaf, Truck, Storefront } from "@phosphor-icons/react/dist/ssr";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/product-card";

export default async function Home() {
  const [bestSellers, collections] = await Promise.all([
    fetchQuery(api.collections.getCollectionBySlug, {
      slug: "best-sellers",
      limit: 4,
    }),
    fetchQuery(api.collections.listCollections, {}),
  ]);

  return (
    <>
      {/* Hero (split) */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:pt-24">
        <div className="max-w-xl">
          <p className="eyebrow">Plant-led skincare</p>
          <h1 className="mt-4 font-heading text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Quiet rituals for considered skin
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Small-batch botanicals made in Ottawa. Shipped flat-rate across
            Canada, or ready for local pickup the same week.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/shop">Shop the range</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/collections">Browse collections</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl border border-border bg-secondary">
          <Image
            src="https://picsum.photos/seed/amara-hero/1200/1500"
            alt="Amara botanical skincare arranged on stone"
            fill
            priority
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      {/* Best sellers (product rail) */}
      {bestSellers && bestSellers.products.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Best sellers
            </h2>
            <Link
              href="/collections/best-sellers"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {bestSellers.products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Featured collections (image tiles) */}
      {collections.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Shop by ritual
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {collections.slice(0, 2).map((collection) => (
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
                  <h3 className="font-heading text-2xl font-semibold tracking-tight">
                    {collection.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Values (band, not boxed cards) */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
          {[
            {
              icon: Leaf,
              title: "Clean formulas",
              body: "Plant-derived actives, no fillers, never tested on animals.",
            },
            {
              icon: Truck,
              title: "Flat-rate shipping",
              body: "One simple rate to anywhere in Canada, with tracking.",
            },
            {
              icon: Storefront,
              title: "Pickup in Ottawa",
              body: "Skip shipping and collect your order from our studio.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="size-6 text-clay" weight="regular" />
              <h3 className="mt-4 text-base font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA (full-width) */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
          <h2 className="mx-auto max-w-2xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Build a routine that feels like yours
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/80">
            Start with a best seller, or explore the full range of small-batch
            botanicals.
          </p>
          <Button size="lg" variant="secondary" className="mt-8" asChild>
            <Link href="/shop">Shop the range</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
