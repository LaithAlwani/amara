"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { ArrowLeft, SpinnerGap, Trash, UploadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useConfirm } from "@/components/providers/confirm-provider";
import { CollectionForm, type CollectionFormValues } from "./collection-form";
import { CollectionMembers } from "./collection-members";

export function AdminCollectionDetail({
  collectionId,
}: {
  collectionId: string;
}) {
  const id = collectionId as Id<"collections">;
  const data = useQuery(api.adminCollections.getCollection, {
    collectionId: id,
  });
  const updateCollection = useMutation(api.adminCollections.updateCollection);
  const deleteCollection = useMutation(api.adminCollections.deleteCollection);
  const generateUploadUrl = useMutation(api.adminCatalog.generateUploadUrl);
  const setCollectionImage = useMutation(api.adminCollections.setCollectionImage);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const confirm = useConfirm();

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
        <p className="text-muted-foreground">That collection was not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/collections">Back to collections</Link>
        </Button>
      </div>
    );
  }

  const { collection, members } = data;

  async function onSubmit(values: CollectionFormValues) {
    try {
      await updateCollection({ collectionId: id, ...values });
      toast.success("Collection saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function onCoverFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: string };
      await setCollectionImage({
        collectionId: id,
        storageId: storageId as Id<"_storage">,
      });
      toast.success("Cover updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
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
        {collection.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">/{collection.slug}</p>

      <div className="mt-8">
        <CollectionForm
          initial={collection}
          submitLabel="Save collection"
          onSubmit={onSubmit}
        />
      </div>

      <Separator className="my-10" />

      {/* Cover image */}
      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Cover image
        </h2>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onCoverFile(e.target.files)}
        />
        {collection.coverImageUrl ? (
          <div className="flex items-center gap-4">
            <Image
              src={collection.coverImageUrl}
              alt=""
              width={160}
              height={107}
              className="h-24 w-36 rounded-lg object-cover"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <UploadSimple className="size-4" /> Replace
              </Button>
              {collection.hasUploadedCover ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    setCollectionImage({ collectionId: id, storageId: null })
                      .then(() => toast.success("Cover removed"))
                      .catch((e) =>
                        toast.error(e instanceof Error ? e.message : "Failed"),
                      )
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition hover:border-foreground hover:text-foreground"
          >
            <UploadSimple className="size-5" />
            Upload a cover image
          </button>
        )}
      </div>

      <Separator className="my-10" />

      <CollectionMembers collectionId={id} members={members} />

      <Separator className="my-10" />

      <Button
        type="button"
        variant="destructive"
        onClick={async () => {
          const ok = await confirm({
            title: `Delete "${collection.title}"?`,
            description:
              "This removes the collection. Products are not deleted.",
            confirmText: "Delete collection",
            destructive: true,
          });
          if (!ok) return;
          try {
            await deleteCollection({ collectionId: id });
            toast.success("Collection deleted");
            router.push("/admin/collections");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not delete");
          }
        }}
      >
        <Trash className="size-4" /> Delete collection
      </Button>
    </div>
  );
}
