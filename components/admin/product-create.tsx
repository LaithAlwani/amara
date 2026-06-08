"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { ProductForm, type ProductFormValues } from "./product-form";

export function ProductCreate() {
  const router = useRouter();
  const createProduct = useMutation(api.adminCatalog.createProduct);

  async function onSubmit(values: ProductFormValues) {
    try {
      const { productId } = await createProduct(values);
      toast.success("Product created — now add variants");
      router.push(`/admin/products/${productId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create product");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Products
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">
        New product
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create the product, then add its variants (sizes, scents) on the next
        screen.
      </p>
      <div className="mt-8">
        <ProductForm submitLabel="Create product" onSubmit={onSubmit} />
      </div>
    </div>
  );
}
