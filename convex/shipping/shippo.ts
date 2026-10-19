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

// Ranks a Shippo message so the real blocker (auth / endpoint / credential
// mismatch) sorts ahead of harmless "carrier not approved / unsupported option"
// noise from Shippo's shared accounts.
function messageRank(line: string): number {
  const l = line.toLowerCase();
  if (
    l.includes("mismatch") ||
    l.includes("endpoint") ||
    l.includes("authoriz") ||
    l.includes("credential")
  )
    return 2;
  if (
    l.includes("not approved") ||
    l.includes("doesn't support") ||
    l.includes("shared account")
  )
    return 0;
  return 1;
}

// Shippo adapter over its REST API (fetch — no SDK / Node runtime needed).
// `carrierAccounts`, when provided, scopes rate requests to those carrier
// account object_ids so we don't query (and error on) Shippo's shared accounts.
export function shippoProvider(
  token: string,
  carrierAccounts?: string[],
): ShippingProvider {
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
      const body: Record<string, unknown> = {
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
      };
      if (carrierAccounts && carrierAccounts.length > 0) {
        body.carrier_accounts = carrierAccounts;
      }
      const shipment = await call("/shipments/", body);

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
        // Surface Shippo's explanation, with the real blocker (credential /
        // endpoint mismatch) ahead of harmless shared-account noise, deduped.
        const raw: { text?: string; source?: string }[] = Array.isArray(
          shipment.messages,
        )
          ? shipment.messages
          : [];
        const seen = new Set<string>();
        const lines: string[] = [];
        for (const m of raw) {
          const line = [m.source, m.text].filter(Boolean).join(": ");
          if (line && !seen.has(line)) {
            seen.add(line);
            lines.push(line);
          }
        }
        lines.sort((a, b) => messageRank(b) - messageRank(a));
        const detail = lines.join(" · ");
        throw new Error(
          "Shippo returned no shippable rates. No connected carrier account could quote this shipment. " +
            "Check that a carrier (e.g. Canada Post) is connected in your Shippo dashboard and that its mode " +
            "(test vs live) matches your SHIPPO_API_KEY — a test token only works with test carrier credentials." +
            (detail ? ` Shippo said: ${detail}` : ""),
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
