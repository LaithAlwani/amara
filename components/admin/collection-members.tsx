"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { ArrowUp, ArrowDown, Trash, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type Member = {
  productId: Id<"products">;
  name: string;
  status: string;
  image: string | null;
};

export function CollectionMembers({
  collectionId,
  members,
}: {
  collectionId: Id<"collections">;
  members: Member[];
}) {
  const allProducts = useQuery(api.adminCatalog.listProducts);
  const addProduct = useMutation(api.adminCollections.addProduct);
  const removeProduct = useMutation(api.adminCollections.removeProduct);
  const reorderProducts = useMutation(api.adminCollections.reorderProducts);
  const [picker, setPicker] = useState("");
  const [busy, setBusy] = useState(false);

  const memberIds = new Set(members.map((m) => m.productId));
  const available = (allProducts ?? []).filter((p) => !memberIds.has(p._id));

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= members.length) return;
    const ids = members.map((m) => m.productId);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void run(() => reorderProducts({ collectionId, productIds: ids }));
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        Products{" "}
        <span className="text-sm font-normal text-muted-foreground">
          ({members.length})
        </span>
      </h2>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No products in this collection yet.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {members.map((m, i) => (
            <li key={m.productId} className="flex items-center gap-3 p-3">
              {m.image ? (
                <Image
                  src={m.image}
                  alt=""
                  width={36}
                  height={45}
                  className="h-11 w-9 rounded object-cover"
                />
              ) : (
                <div className="h-11 w-9 rounded bg-muted" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{m.name}</p>
                {m.status !== "active" ? (
                  <p className="text-xs text-muted-foreground capitalize">
                    {m.status}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-0.5">
                <IconBtn
                  label="Move up"
                  disabled={busy || i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="size-4" />
                </IconBtn>
                <IconBtn
                  label="Move down"
                  disabled={busy || i === members.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="size-4" />
                </IconBtn>
                <IconBtn
                  label="Remove"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      removeProduct({ collectionId, productId: m.productId }),
                    )
                  }
                >
                  <Trash className="size-4" />
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <select
          value={picker}
          onChange={(e) => setPicker(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="">Add a product…</option>
          {available.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !picker}
          onClick={() =>
            run(async () => {
              await addProduct({
                collectionId,
                productId: picker as Id<"products">,
              });
              setPicker("");
            })
          }
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>
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
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}
