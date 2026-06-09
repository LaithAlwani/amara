"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { Truck, SpinnerGap, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

type Rate = {
  rateId: string;
  provider: string;
  service: string;
  amountCents: number;
  estimatedDays: number | null;
};

export function ShipmentManager({ orderId }: { orderId: Id<"orders"> }) {
  const shipment = useQuery(api.shipments.getShipment, { orderId });
  const getRates = useAction(api.shipments.getOrderRates);
  const purchaseLabel = useAction(api.shipments.purchaseLabel);

  const [rates, setRates] = useState<Rate[] | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  async function loadRates() {
    setLoadingRates(true);
    try {
      const r = await getRates({ orderId });
      setRates(r);
      if (r.length === 0) toast.message("No rates returned for this parcel.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not fetch rates");
    } finally {
      setLoadingRates(false);
    }
  }

  async function buy(rateId: string) {
    setBuying(rateId);
    try {
      await purchaseLabel({ orderId, rateId });
      toast.success("Label purchased — customer notified");
      setRates(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not buy label");
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <Truck className="size-4" /> Shipping label
      </h2>

      {shipment ? (
        <div className="mt-4 space-y-2 text-sm">
          <Row label="Carrier" value={`${shipment.carrier ?? "—"} · ${shipment.service ?? ""}`} />
          {shipment.costCents != null ? (
            <Row label="Label cost" value={formatPrice(shipment.costCents)} />
          ) : null}
          <Row label="Tracking" value={shipment.trackingNumber ?? "—"} />
          <div className="flex flex-wrap gap-2 pt-2">
            {shipment.labelUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={shipment.labelUrl} target="_blank" rel="noreferrer">
                  <FilePdf className="size-4" /> Label PDF
                </a>
              </Button>
            ) : null}
            {shipment.trackingUrl ? (
              <Button asChild size="sm" variant="ghost">
                <a href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                  Track parcel
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : rates ? (
        <div className="mt-4 space-y-2">
          {rates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rates available.</p>
          ) : (
            rates.map((r) => (
              <div
                key={r.rateId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {r.provider}{" "}
                    <span className="font-normal text-muted-foreground">
                      {r.service}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(r.amountCents)}
                    {r.estimatedDays ? ` · ~${r.estimatedDays} days` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={buying !== null}
                  onClick={() => buy(r.rateId)}
                >
                  {buying === r.rateId ? (
                    <SpinnerGap className="size-4 animate-spin" />
                  ) : (
                    "Buy label"
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Fetch live carrier rates and buy a label. The customer paid flat-rate
            shipping; the actual label cost may differ.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={loadingRates}
            onClick={loadRates}
          >
            {loadingRates ? (
              <SpinnerGap className="size-4 animate-spin" />
            ) : (
              "Get rates"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
