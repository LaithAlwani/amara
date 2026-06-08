"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { ArrowLeft, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProductForm, type ProductFormValues } from "./product-form";
import { ProductImages } from "./product-images";
import { VariantManager } from "./variant-manager";

export function AdminProductDetail({ productId }: { productId: string }) {
  const id = productId as Id<"products">;
  const data = useQuery(api.adminCatalog.getProduct, { productId: id });
  const updateProduct = useMutation(api.adminCatalog.updateProduct);

  if (data === undefined) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <SpinnerGap className="size-6 animate-spin" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">That product could not be found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/products">Back to products</Link>
        </Button>
      </div>
    );
  }

  const { product, variants } = data;

  async function onSubmit(values: ProductFormValues) {
    try {
      await updateProduct({ productId: id, ...values });
      toast.success("Product saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save product");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Products
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">
        {product.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">/{product.slug}</p>

      <div className="mt-8">
        <ProductForm
          initial={{
            name: product.name,
            slug: product.slug,
            description: product.description,
            shortDescription: product.shortDescription,
            status: product.status,
            priceCents: product.priceCents,
            compareAtCents: product.compareAtCents,
          }}
          submitLabel="Save product"
          onSubmit={onSubmit}
        />
      </div>

      <Separator className="my-10" />

      <ProductImages productId={id} images={data.images} />

      <Separator className="my-10" />

      <VariantManager productId={id} variants={variants} />
    </div>
  );
}
