"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Trash, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LOW_STOCK } from "./product-status";

type VariantValues = {
  sku: string;
  title: string;
  optionValues?: { size?: string; scent?: string; packageType?: string };
  priceCents: number;
  compareAtCents?: number;
  inventoryQty: number;
  weightGrams: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  active: boolean;
};

function dollars(cents: number | undefined): string {
  return cents === undefined ? "" : (cents / 100).toFixed(2);
}
function toCents(value: string): number | undefined {
  const n = parseFloat(value);
  return Number.isNaN(n) ? undefined : Math.round(n * 100);
}
function toNum(value: string): number | undefined {
  const n = parseFloat(value);
  return Number.isNaN(n) ? undefined : n;
}

// One add/edit form for a variant. Used both for new variants and existing ones.
function VariantForm({
  initial,
  submitLabel,
  onSubmit,
  onDelete,
  resetOnSubmit,
}: {
  initial?: Doc<"productVariants">;
  submitLabel: string;
  onSubmit: (v: VariantValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  resetOnSubmit?: boolean;
}) {
  const blank = {
    title: "",
    sku: "",
    price: "",
    compareAt: "",
    inventory: "",
    weight: "",
    size: "",
    scent: "",
    packageType: "",
    active: true,
  };
  const seed = initial
    ? {
        title: initial.title,
        sku: initial.sku,
        price: dollars(initial.priceCents),
        compareAt: dollars(initial.compareAtCents),
        inventory: String(initial.inventoryQty),
        weight: String(initial.weightGrams),
        size: initial.optionValues?.size ?? "",
        scent: initial.optionValues?.scent ?? "",
        packageType: initial.optionValues?.packageType ?? "",
        active: initial.active,
      }
    : blank;

  const [f, setF] = useState(seed);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, val: string | boolean) =>
    setF((prev) => ({ ...prev, [k]: val }));

  const lowStock =
    f.active && Number(f.inventory) <= LOW_STOCK && f.inventory !== "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = toCents(f.price);
    const inventoryQty = toNum(f.inventory);
    const weightGrams = toNum(f.weight);
    if (priceCents === undefined) return toast.error("Price is required");
    if (inventoryQty === undefined) return toast.error("Stock is required");
    if (weightGrams === undefined) return toast.error("Weight is required");

    const options: VariantValues["optionValues"] = {};
    if (f.size.trim()) options.size = f.size.trim();
    if (f.scent.trim()) options.scent = f.scent.trim();
    if (f.packageType.trim()) options.packageType = f.packageType.trim();

    setBusy(true);
    try {
      await onSubmit({
        sku: f.sku.trim(),
        title: f.title.trim(),
        optionValues: Object.keys(options).length ? options : undefined,
        priceCents,
        compareAtCents: toCents(f.compareAt),
        inventoryQty,
        weightGrams,
        active: f.active,
      });
      if (resetOnSubmit) setF(blank);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Title">
          <Input
            value={f.title}
            required
            placeholder="50 ml"
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <Field label="SKU">
          <Input
            value={f.sku}
            required
            onChange={(e) => set("sku", e.target.value)}
          />
        </Field>
        <Field label="Price (CAD)">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={f.price}
            required
            onChange={(e) => set("price", e.target.value)}
          />
        </Field>
        <Field label="Compare-at">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={f.compareAt}
            onChange={(e) => set("compareAt", e.target.value)}
          />
        </Field>
        <Field label="Stock">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              value={f.inventory}
              required
              onChange={(e) => set("inventory", e.target.value)}
            />
            {lowStock && (
              <Warning
                className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
                weight="fill"
              />
            )}
          </div>
        </Field>
        <Field label="Weight (g)">
          <Input
            type="number"
            min="0"
            value={f.weight}
            required
            onChange={(e) => set("weight", e.target.value)}
          />
        </Field>
        <Field label="Size">
          <Input
            value={f.size}
            onChange={(e) => set("size", e.target.value)}
          />
        </Field>
        <Field label="Scent">
          <Input
            value={f.scent}
            onChange={(e) => set("scent", e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={f.active}
            onChange={(e) => set("active", e.target.checked)}
            className="size-4 accent-clay"
          />
          Active (available for sale)
        </label>
        <div className="flex gap-2">
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={async () => {
                if (!confirm("Delete this variant?")) return;
                setBusy(true);
                try {
                  await onDelete();
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash className="size-4" /> Delete
            </Button>
          )}
          <Button type="submit" size="sm" disabled={busy}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function VariantManager({
  productId,
  variants,
}: {
  productId: Id<"products">;
  variants: Doc<"productVariants">[];
}) {
  const createVariant = useMutation(api.adminCatalog.createVariant);
  const updateVariant = useMutation(api.adminCatalog.updateVariant);
  const deleteVariant = useMutation(api.adminCatalog.deleteVariant);

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        Variants{" "}
        <span className="text-sm font-normal text-muted-foreground">
          ({variants.length})
        </span>
      </h2>

      {variants.map((variant) => (
        <VariantForm
          key={variant._id}
          initial={variant}
          submitLabel="Save"
          onSubmit={async (v) => {
            try {
              await updateVariant({ variantId: variant._id, ...v });
              toast.success("Variant saved");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Save failed");
            }
          }}
          onDelete={async () => {
            try {
              await deleteVariant({ variantId: variant._id });
              toast.success("Variant deleted");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Delete failed");
            }
          }}
        />
      ))}

      <div>
        <p className="mb-2 text-sm font-medium">Add a variant</p>
        <VariantForm
          submitLabel="Add variant"
          resetOnSubmit
          onSubmit={async (v) => {
            try {
              await createVariant({ productId, ...v });
              toast.success("Variant added");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not add");
            }
          }}
        />
      </div>
    </div>
  );
}
