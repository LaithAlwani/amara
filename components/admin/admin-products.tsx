"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { Plus, SpinnerGap, Warning } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { productStatusBadge } from "./product-status";

export function AdminProducts() {
  const products = useQuery(api.adminCatalog.listProducts);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Products
        </h1>
        <Button asChild size="sm">
          <Link href="/admin/products/new">
            <Plus className="size-4" weight="bold" /> New product
          </Link>
        </Button>
      </div>

      {products === undefined ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <SpinnerGap className="size-6 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">
          No products yet. Create your first one.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-160 text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Variants</th>
                <th className="px-4 py-2.5 font-medium">Stock</th>
                <th className="px-4 py-2.5 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const badge = productStatusBadge(p.status);
                const priceLabel =
                  p.minPriceCents === p.maxPriceCents
                    ? formatPrice(p.minPriceCents)
                    : `${formatPrice(p.minPriceCents)}–${formatPrice(p.maxPriceCents)}`;
                return (
                  <tr
                    key={p._id}
                    className="border-t border-border hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/products/${p._id}`}
                        className="flex items-center gap-3"
                      >
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt=""
                            width={36}
                            height={45}
                            className="h-11 w-9 rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-11 w-9 rounded-md bg-muted" />
                        )}
                        <div>
                          <p className="font-medium hover:underline">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            /{p.slug}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.variantCount}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">
                        {p.totalStock} on hand
                      </span>
                      {p.lowStock > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                          <Warning className="size-3.5" weight="fill" />
                          {p.lowStock} low
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {priceLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
