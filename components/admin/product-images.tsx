"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { ArrowLeft, ArrowRight, Star, Trash, UploadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type ProductImage = { storageId: Id<"_storage">; url: string };

export function ProductImages({
  productId,
  images,
}: {
  productId: Id<"products">;
  images: ProductImage[];
}) {
  const generateUploadUrl = useMutation(api.adminCatalog.generateUploadUrl);
  const setProductImages = useMutation(api.adminCatalog.setProductImages);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const ids = images.map((i) => i.storageId);

  async function save(next: Id<"_storage">[]) {
    setBusy(true);
    try {
      await setProductImages({ productId, storageIds: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update images");
    } finally {
      setBusy(false);
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const uploaded: Id<"_storage">[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error("Upload failed");
        const { storageId } = (await res.json()) as { storageId: string };
        uploaded.push(storageId as Id<"_storage">);
      }
      await setProductImages({ productId, storageIds: [...ids, ...uploaded] });
      toast.success(
        uploaded.length === 1 ? "Image added" : `${uploaded.length} images added`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...ids];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void save(next);
  }

  function setCover(index: number) {
    if (index === 0) return;
    const next = [...ids];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    void save(next);
  }

  function remove(index: number) {
    void save(ids.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Images{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({images.length})
          </span>
        </h2>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <UploadSimple className="size-4" /> Upload
        </Button>
      </div>

      {images.length === 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition hover:border-foreground hover:text-foreground"
        >
          <UploadSimple className="size-5" />
          Upload product images
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={img.storageId}
              className="group relative overflow-hidden rounded-xl border border-border bg-secondary"
            >
              <div className="relative aspect-4/5">
                <Image
                  src={img.url}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
              {i === 0 && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-clay px-2 py-0.5 text-xs font-medium text-clay-foreground">
                  <Star className="size-3" weight="fill" /> Cover
                </span>
              )}
              <div className="flex items-center justify-between gap-1 p-1.5">
                <div className="flex gap-0.5">
                  <IconBtn
                    label="Move left"
                    disabled={busy || i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowLeft className="size-3.5" />
                  </IconBtn>
                  <IconBtn
                    label="Move right"
                    disabled={busy || i === images.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowRight className="size-3.5" />
                  </IconBtn>
                  {i !== 0 && (
                    <IconBtn
                      label="Set as cover"
                      disabled={busy}
                      onClick={() => setCover(i)}
                    >
                      <Star className="size-3.5" />
                    </IconBtn>
                  )}
                </div>
                <IconBtn
                  label="Remove"
                  disabled={busy}
                  onClick={() => remove(i)}
                >
                  <Trash className="size-3.5" />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        The first image is the cover. Uploaded images take priority over any seed
        imagery on the storefront.
      </p>
    </div>
  );
}

function IconBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}
