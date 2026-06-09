"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { Plus, SpinnerGap } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminCollections() {
  const collections = useQuery(api.adminCollections.listCollections);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Collections
        </h1>
        <Button asChild size="sm">
          <Link href="/admin/collections/new">
            <Plus className="size-4" weight="bold" /> New collection
          </Link>
        </Button>
      </div>

      {collections === undefined ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <SpinnerGap className="size-6 animate-spin" />
        </div>
      ) : collections.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">
          No collections yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-160 text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Collection</th>
                <th className="px-4 py-2.5 font-medium">Products</th>
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c) => (
                <tr
                  key={c._id}
                  className="border-t border-border hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/collections/${c._id}`}
                      className="flex items-center gap-3"
                    >
                      {c.image ? (
                        <Image
                          src={c.image}
                          alt=""
                          width={48}
                          height={32}
                          className="h-8 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-8 w-12 rounded bg-muted" />
                      )}
                      <div>
                        <p className="font-medium hover:underline">{c.title}</p>
                        <p className="text-xs text-muted-foreground">/{c.slug}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.productCount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.sortOrder}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        c.published
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {c.published ? "Published" : "Hidden"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
