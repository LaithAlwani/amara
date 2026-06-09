// Pluggable shipping-provider contract. Adapters (e.g. Shippo) implement these
// so carriers can be swapped without touching the order/route code.

export type ShipAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string; // ISO-2, e.g. "CA"
  phone?: string;
  email?: string;
};

export type Parcel = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightGrams: number;
};

export type ShippingRate = {
  rateId: string;
  provider: string; // carrier, e.g. "Canada Post"
  service: string; // service level name
  amountCents: number;
  currency: string;
  estimatedDays: number | null;
};

export type PurchasedLabel = {
  carrier: string;
  service: string;
  costCents: number;
  trackingNumber: string;
  trackingUrl: string | null;
  labelUrl: string; // provider-hosted PDF
  providerTransactionId: string;
};

export interface ShippingProvider {
  name: string;
  getRates(input: {
    from: ShipAddress;
    to: ShipAddress;
    parcel: Parcel;
  }): Promise<ShippingRate[]>;
  buyLabel(rateId: string): Promise<PurchasedLabel>;
}
