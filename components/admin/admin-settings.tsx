"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const fieldClass =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

type Pickup = {
  name: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  instructions: string;
};
type ShipFrom = {
  name: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
};

export function AdminSettings() {
  const data = useQuery(api.adminSettings.getStoreSettings);
  if (data === undefined) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <SpinnerGap className="size-6 animate-spin" />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Store settings
      </h1>
      <PickupForm
        initial={
          data.pickup ?? {
            name: "",
            addressLine1: "",
            city: "Ottawa",
            province: "ON",
            postalCode: "",
            country: "CA",
            instructions: "",
          }
        }
      />
      <ShipFromForm initial={data.shipFrom} />
    </div>
  );
}

function PickupForm({ initial }: { initial: Pickup }) {
  const save = useMutation(api.adminSettings.updatePickupLocation);
  const [f, setF] = useState<Pickup>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Pickup, v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save(f);
      toast.success("Pickup location saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <div>
        <p className="text-sm font-medium">Pickup location</p>
        <p className="text-xs text-muted-foreground">
          Shown to customers who choose local pickup at checkout.
        </p>
      </div>
      <Row label="Name">
        <Input value={f.name} required onChange={(e) => set("name", e.target.value)} />
      </Row>
      <Row label="Address">
        <Input
          value={f.addressLine1}
          required
          onChange={(e) => set("addressLine1", e.target.value)}
        />
      </Row>
      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="City">
          <Input value={f.city} required onChange={(e) => set("city", e.target.value)} />
        </Row>
        <Row label="Province">
          <Input value={f.province} required onChange={(e) => set("province", e.target.value)} />
        </Row>
        <Row label="Postal code">
          <Input value={f.postalCode} required onChange={(e) => set("postalCode", e.target.value)} />
        </Row>
      </div>
      <Row label="Pickup instructions">
        <textarea
          value={f.instructions}
          rows={2}
          className={fieldClass}
          onChange={(e) => set("instructions", e.target.value)}
        />
      </Row>
      <Button type="submit" disabled={busy}>
        {busy ? <SpinnerGap className="size-4 animate-spin" /> : "Save pickup"}
      </Button>
    </form>
  );
}

function ShipFromForm({ initial }: { initial: ShipFrom }) {
  const save = useMutation(api.adminSettings.updateShipFrom);
  const [f, setF] = useState<ShipFrom>({
    ...initial,
    company: initial.company ?? "",
    line2: initial.line2 ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof ShipFrom, v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save(f);
      toast.success("Ship-from address saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <div>
        <p className="text-sm font-medium">Ship-from address</p>
        <p className="text-xs text-muted-foreground">
          Where parcels ship from — used to fetch carrier rates &amp; buy labels.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Name">
          <Input value={f.name} required onChange={(e) => set("name", e.target.value)} />
        </Row>
        <Row label="Company">
          <Input value={f.company ?? ""} onChange={(e) => set("company", e.target.value)} />
        </Row>
      </div>
      <Row label="Address line 1">
        <Input value={f.line1} required onChange={(e) => set("line1", e.target.value)} />
      </Row>
      <Row label="Address line 2">
        <Input value={f.line2 ?? ""} onChange={(e) => set("line2", e.target.value)} />
      </Row>
      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="City">
          <Input value={f.city} required onChange={(e) => set("city", e.target.value)} />
        </Row>
        <Row label="Province">
          <Input value={f.province} required onChange={(e) => set("province", e.target.value)} />
        </Row>
        <Row label="Postal code">
          <Input value={f.postalCode} required onChange={(e) => set("postalCode", e.target.value)} />
        </Row>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Country">
          <Input value={f.country} required onChange={(e) => set("country", e.target.value)} />
        </Row>
        <Row label="Phone">
          <Input value={f.phone} required onChange={(e) => set("phone", e.target.value)} />
        </Row>
        <Row label="Email">
          <Input value={f.email} required onChange={(e) => set("email", e.target.value)} />
        </Row>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? <SpinnerGap className="size-4 animate-spin" /> : "Save ship-from"}
      </Button>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
