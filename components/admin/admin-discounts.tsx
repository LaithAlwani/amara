"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Trash, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/providers/confirm-provider";
import { formatPrice } from "@/lib/format";

const fieldClass =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function AdminDiscounts() {
  const codes = useQuery(api.discounts.listCodes);
  const createCode = useMutation(api.discounts.createCode);
  const setActive = useMutation(api.discounts.setCodeActive);
  const deleteCode = useMutation(api.discounts.deleteCode);
  const subDiscount = useQuery(api.discounts.getSubscriptionDiscount);
  const setSubDiscount = useMutation(api.discounts.setSubscriptionDiscount);
  const freeShip = useQuery(api.discounts.getFreeShipThreshold);
  const setFreeShip = useMutation(api.discounts.setFreeShipThreshold);
  const confirm = useConfirm();
  const [subPct, setSubPct] = useState<string | null>(null);
  const subValue = subPct ?? (subDiscount !== undefined ? String(subDiscount) : "");
  const [freeShipInput, setFreeShipInput] = useState<string | null>(null);
  const freeShipValue =
    freeShipInput ??
    (freeShip !== undefined ? (freeShip / 100).toFixed(2) : "");

  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(value);
    if (Number.isNaN(v) || v <= 0) return toast.error("Enter a valid value");
    setBusy(true);
    try {
      await createCode({
        code,
        kind,
        // percent: points (10 = 10%); fixed: dollars -> cents
        value: kind === "percent" ? Math.round(v) : Math.round(v * 100),
        minSubtotalCents: minSpend
          ? Math.round(parseFloat(minSpend) * 100)
          : undefined,
        usageLimit: usageLimit ? Math.round(parseFloat(usageLimit)) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
      });
      toast.success("Code created");
      setCode("");
      setValue("");
      setMinSpend("");
      setUsageLimit("");
      setExpiresAt("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Discount codes
      </h1>

      {/* Subscribe & Save percent */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Subscribe &amp; Save discount (%)
          </Label>
          <Input
            type="number"
            min="0"
            max="90"
            step="1"
            className="w-32"
            value={subValue}
            onChange={(e) => setSubPct(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            const p = parseFloat(subValue);
            if (Number.isNaN(p)) return toast.error("Enter a percent");
            try {
              await setSubDiscount({ percent: p });
              toast.success("Subscribe & Save updated");
              setSubPct(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
        >
          Save
        </Button>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Free shipping over ($) — subscriptions
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            className="w-32"
            value={freeShipValue}
            placeholder="0 = off"
            onChange={(e) => setFreeShipInput(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            const d = parseFloat(freeShipValue || "0");
            if (Number.isNaN(d)) return toast.error("Enter an amount");
            try {
              await setFreeShip({ cents: Math.round(d * 100) });
              toast.success("Free-shipping threshold updated");
              setFreeShipInput(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
        >
          Save
        </Button>
        <p className="text-xs text-muted-foreground">
          Subscribe &amp; Save applies to each product&apos;s recurring price;
          subscription boxes ship free over the threshold.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="mt-6 rounded-xl border border-border bg-card p-5"
      >
        <p className="text-sm font-medium">Create a code</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Code</Label>
            <Input
              value={code}
              required
              placeholder="WELCOME10"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "percent" | "fixed")}
              className={fieldClass}
            >
              <option value="percent">% off</option>
              <option value="fixed">$ off</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {kind === "percent" ? "Percent" : "Amount ($)"}
            </Label>
            <Input
              type="number"
              min="0"
              step={kind === "percent" ? "1" : "0.01"}
              value={value}
              required
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Min spend ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={minSpend}
              onChange={(e) => setMinSpend(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Usage limit</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Expires</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" size="sm" className="mt-4" disabled={busy}>
          Create code
        </Button>
      </form>

      {codes === undefined ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <SpinnerGap className="size-6 animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No discount codes yet.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Code</th>
                <th className="px-4 py-2.5 font-medium">Discount</th>
                <th className="px-4 py-2.5 font-medium">Min</th>
                <th className="px-4 py-2.5 font-medium">Used</th>
                <th className="px-4 py-2.5 font-medium">Expires</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c._id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.kind === "percent"
                      ? `${c.value}%`
                      : formatPrice(c.value)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.minSubtotalCents
                      ? formatPrice(c.minSubtotalCents)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.usedCount}
                    {c.usageLimit !== undefined ? `/${c.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.expiresAt ? dateFmt.format(c.expiresAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        c.active
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {c.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setActive({ codeId: c._id, active: !c.active }).catch(
                            (e) =>
                              toast.error(
                                e instanceof Error ? e.message : "Failed",
                              ),
                          )
                        }
                      >
                        {c.active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Delete"
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Delete ${c.code}?`,
                            description: "This permanently removes the code.",
                            confirmText: "Delete",
                            destructive: true,
                          });
                          if (!ok) return;
                          deleteCode({ codeId: c._id as Id<"discountCodes"> })
                            .then(() => toast.success("Deleted"))
                            .catch((e) =>
                              toast.error(
                                e instanceof Error ? e.message : "Failed",
                              ),
                            );
                        }}
                      >
                        <Trash className="size-4" />
                      </Button>
                    </div>
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
