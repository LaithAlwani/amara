"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import {
  CollectionForm,
  type CollectionFormValues,
} from "./collection-form";

export function CollectionCreate() {
  const router = useRouter();
  const createCollection = useMutation(api.adminCollections.createCollection);

  async function onSubmit(values: CollectionFormValues) {
    try {
      const { collectionId } = await createCollection(values);
      toast.success("Collection created — now add products");
      router.push(`/admin/collections/${collectionId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/collections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Collections
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">
        New collection
      </h1>
      <div className="mt-8">
        <CollectionForm submitLabel="Create collection" onSubmit={onSubmit} />
      </div>
    </div>
  );
}
