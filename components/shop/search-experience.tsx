"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/shop/product-card";

export function SearchExperience({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const trimmed = query.trim();

  const results = useQuery(
    api.products.searchProducts,
    trimmed ? { q: trimmed } : "skip",
  );

  return (
    <div>
      <div className="relative max-w-xl">
        <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products"
          className="h-12 pl-12 text-base"
          aria-label="Search products"
        />
      </div>

      <div className="mt-10">
        {!trimmed ? (
          <p className="text-muted-foreground">
            Start typing to search the range.
          </p>
        ) : results === undefined ? (
          <p className="text-muted-foreground">Searching...</p>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground">
            No matches for &ldquo;{trimmed}&rdquo;.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {results.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
