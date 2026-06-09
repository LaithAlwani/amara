import type {
  ShipAddress,
  Parcel,
  ShippingRate,
  PurchasedLabel,
  ShippingProvider,
} from "./types";

const BASE = "https://api.goshippo.com";

function toCents(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

function shippoAddress(a: ShipAddress) {
  return {
    name: a.name,
    street1: a.street1,
    street2: a.street2 ?? "",
    city: a.city,
    state: a.state,
    zip: a.zip,
    country: a.country,
    phone: a.phone ?? "",
    email: a.email ?? "",
  };
}

// Shippo adapter over its REST API (fetch — no SDK / Node runtime needed).
export function shippoProvider(token: string): ShippingProvider {
  async function call(path: string, body: unknown) {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `ShippoToken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        `Shippo error (${res.status}): ${json?.detail ?? JSON.stringify(json)}`,
      );
    }
    return json;
  }

  return {
    name: "shippo",

    async getRates({
      from,
      to,
      parcel,
    }: {
      from: ShipAddress;
      to: ShipAddress;
      parcel: Parcel;
    }): Promise<ShippingRate[]> {
      const shipment = await call("/shipments/", {
        address_from: shippoAddress(from),
        address_to: shippoAddress(to),
        parcels: [
          {
            length: String(parcel.lengthCm),
            width: String(parcel.widthCm),
            height: String(parcel.heightCm),
            distance_unit: "cm",
            weight: String(parcel.weightGrams),
            mass_unit: "g",
          },
        ],
        async: false,
      });

      type ShippoRate = {
        object_id: string;
        amount: string;
        currency: string;
        provider: string;
        servicelevel?: { name?: string };
        estimated_days?: number | null;
      };
      const rates: ShippoRate[] = shipment.rates ?? [];
      if (rates.length === 0) {
        // Surface Shippo's explanation (bad address, no carrier accounts, etc.)
        const msgs = Array.isArray(shipment.messages)
          ? shipment.messages
              .map((m: { text?: string; source?: string }) =>
                [m.source, m.text].filter(Boolean).join(": "),
              )
              .filter(Boolean)
              .join(" · ")
          : "";
        throw new Error(
          msgs ||
            "Shippo returned no rates. Connect a carrier account (e.g. Canada Post) in your Shippo dashboard, and check the addresses.",
        );
      }
      return rates.map((r) => ({
        rateId: r.object_id,
        provider: r.provider,
        service: r.servicelevel?.name ?? "Standard",
        amountCents: toCents(r.amount),
        currency: r.currency,
        estimatedDays: r.estimated_days ?? null,
      }));
    },

    async buyLabel(rateId: string): Promise<PurchasedLabel> {
      const txn = await call("/transactions/", {
        rate: rateId,
        label_file_type: "PDF",
        async: false,
      });
      if (txn.status !== "SUCCESS") {
        const messages = Array.isArray(txn.messages)
          ? txn.messages.map((m: { text?: string }) => m.text).join("; ")
          : "Label purchase failed.";
        throw new Error(messages || "Label purchase failed.");
      }
      const rate = txn.rate ?? {};
      return {
        carrier: rate.provider ?? "Carrier",
        service: rate.servicelevel?.name ?? "Standard",
        costCents: rate.amount ? toCents(rate.amount) : 0,
        trackingNumber: txn.tracking_number ?? "",
        trackingUrl: txn.tracking_url_provider ?? null,
        labelUrl: txn.label_url ?? "",
        providerTransactionId: txn.object_id ?? "",
      };
    },
  };
}
