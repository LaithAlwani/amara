"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PRODUCT_STATUSES, type ProductStatus } from "./product-status";

const fieldClass =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  status: ProductStatus;
  priceCents: number;
  compareAtCents?: number;
  imageUrls: string[];
};

export type ProductFormInitial = Partial<ProductFormValues>;

function dollars(cents: number | undefined): string {
  return cents === undefined ? "" : (cents / 100).toFixed(2);
}

function toCents(value: string): number | undefined {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return undefined;
  return Math.round(n * 100);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: ProductFormInitial;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [shortDescription, setShortDescription] = useState(
    initial?.shortDescription ?? "",
  );
  const [status, setStatus] = useState<ProductStatus>(
    initial?.status ?? "draft",
  );
  const [price, setPrice] = useState(dollars(initial?.priceCents));
  const [compareAt, setCompareAt] = useState(dollars(initial?.compareAtCents));
  const [images, setImages] = useState((initial?.imageUrls ?? []).join("\n"));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = toCents(price);
    if (priceCents === undefined) return;
    setBusy(true);
    try {
      await onSubmit({
        name,
        slug: slug || slugify(name),
        description,
        shortDescription: shortDescription.trim() || undefined,
        status,
        priceCents,
        compareAtCents: toCents(compareAt),
        imageUrls: images
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            required
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            required
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="short">Short description</Label>
        <Input
          id="short"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="desc">Description</Label>
        <textarea
          id="desc"
          value={description}
          required
          rows={4}
          onChange={(e) => setDescription(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            className={`${fieldClass} capitalize`}
          >
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price (CAD)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            required
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="compareAt">Compare-at (optional)</Label>
          <Input
            id="compareAt"
            type="number"
            step="0.01"
            min="0"
            value={compareAt}
            onChange={(e) => setCompareAt(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="images">Image URLs (one per line)</Label>
        <textarea
          id="images"
          value={images}
          rows={3}
          onChange={(e) => setImages(e.target.value)}
          placeholder="https://…"
          className={fieldClass}
        />
        <p className="text-xs text-muted-foreground">
          The display price shown here is a fallback; the authoritative price is
          per variant below.
        </p>
      </div>

      <Button type="submit" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
