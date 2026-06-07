"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Truck, Storefront, SpinnerGap, Warning } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { useAnonId } from "@/lib/use-anon-id";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
];

type Method = "ship" | "pickup";

const emptyAddress = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  province: "ON",
  postalCode: "",
  phone: "",
};

export function CheckoutClient() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { anonId, ensureAnonId } = useAnonId();
  const { user } = useUser();

  const [method, setMethod] = useState<Method>("ship");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDraftOrder = useMutation(api.checkout.createDraftOrder);
  const startCheckout = useAction(api.payments.createCheckoutSession);

  // Prefill email for signed-in shoppers.
  useEffect(() => {
    const e = user?.primaryEmailAddress?.emailAddress;
    if (e && !email) setEmail(e);
  }, [user, email]);

  const quoteArgs = authLoading
    ? "skip"
    : isAuthenticated
      ? { fulfillmentMethod: method }
      : anonId
        ? { anonId, fulfillmentMethod: method }
        : "skip";
  const quote = useQuery(api.checkout.quoteCart, quoteArgs);

  if (quote && quote.empty) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 py-24 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Your bag is empty
        </h1>
        <Button asChild size="lg">
          <Link href="/shop">Shop the range</Link>
        </Button>
      </div>
    );
  }

  const addressValid =
    address.name.trim() &&
    address.line1.trim() &&
    address.city.trim() &&
    address.province.trim() &&
    address.postalCode.trim();
  const emailValid = email.trim().includes("@");
  const hasIssues = (quote?.issues.length ?? 0) > 0;
  const canPlace =
    !!quote &&
    !quote.empty &&
    !hasIssues &&
    emailValid &&
    (method === "pickup" || !!addressValid) &&
    !placing;

  async function placeOrder() {
    setError(null);
    setPlacing(true);
    try {
      const id = isAuthenticated ? undefined : (anonId ?? ensureAnonId());
      const { orderId } = await createDraftOrder({
        anonId: id,
        email: email.trim(),
        fulfillmentMethod: method,
        shippingAddress:
          method === "ship"
            ? {
                name: address.name.trim(),
                line1: address.line1.trim(),
                line2: address.line2.trim() || undefined,
                city: address.city.trim(),
                province: address.province,
                postalCode: address.postalCode.trim(),
                country: "CA",
                phone: address.phone.trim() || undefined,
              }
            : undefined,
      });
      const { url } = await startCheckout({
        orderId,
        origin: window.location.origin,
      });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPlacing(false);
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
      {/* Form */}
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="font-heading text-xl tracking-tight">Contact</h2>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">
              Your order confirmation goes here. Guest checkout is fine; sign in
              later with this email to see the order in your account.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-xl tracking-tight">Fulfillment</h2>
          <div className="grid grid-cols-2 gap-3">
            <FulfillmentOption
              active={method === "ship"}
              onClick={() => setMethod("ship")}
              icon={<Truck className="size-5" />}
              title="Ship it"
              subtitle="Flat-rate across Canada"
            />
            <FulfillmentOption
              active={method === "pickup"}
              onClick={() => setMethod("pickup")}
              icon={<Storefront className="size-5" />}
              title="Local pickup"
              subtitle="Free, in Ottawa"
            />
          </div>

          {method === "ship" ? (
            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              <Field className="sm:col-span-2" label="Full name" id="name">
                <Input
                  id="name"
                  value={address.name}
                  onChange={(e) =>
                    setAddress({ ...address, name: e.target.value })
                  }
                  autoComplete="name"
                />
              </Field>
              <Field className="sm:col-span-2" label="Address" id="line1">
                <Input
                  id="line1"
                  value={address.line1}
                  onChange={(e) =>
                    setAddress({ ...address, line1: e.target.value })
                  }
                  autoComplete="address-line1"
                />
              </Field>
              <Field
                className="sm:col-span-2"
                label="Apartment, suite (optional)"
                id="line2"
              >
                <Input
                  id="line2"
                  value={address.line2}
                  onChange={(e) =>
                    setAddress({ ...address, line2: e.target.value })
                  }
                  autoComplete="address-line2"
                />
              </Field>
              <Field label="City" id="city">
                <Input
                  id="city"
                  value={address.city}
                  onChange={(e) =>
                    setAddress({ ...address, city: e.target.value })
                  }
                  autoComplete="address-level2"
                />
              </Field>
              <Field label="Province" id="province">
                <Select
                  value={address.province}
                  onValueChange={(v) => setAddress({ ...address, province: v })}
                >
                  <SelectTrigger id="province" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Postal code" id="postal">
                <Input
                  id="postal"
                  value={address.postalCode}
                  onChange={(e) =>
                    setAddress({ ...address, postalCode: e.target.value })
                  }
                  autoComplete="postal-code"
                />
              </Field>
              <Field label="Phone (optional)" id="phone">
                <Input
                  id="phone"
                  value={address.phone}
                  onChange={(e) =>
                    setAddress({ ...address, phone: e.target.value })
                  }
                  autoComplete="tel"
                />
              </Field>
            </div>
          ) : quote?.pickupLocation ? (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm">
              <p className="font-medium">{quote.pickupLocation.name}</p>
              <p className="mt-1 text-muted-foreground">
                {quote.pickupLocation.addressLine1}, {quote.pickupLocation.city},{" "}
                {quote.pickupLocation.province} {quote.pickupLocation.postalCode}
              </p>
              {quote.pickupLocation.instructions ? (
                <p className="mt-2 text-muted-foreground">
                  {quote.pickupLocation.instructions}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">
                We will email you when your order is ready to collect.
              </p>
            </div>
          ) : null}
        </section>
      </div>

      {/* Summary */}
      <aside className="h-fit space-y-5 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-heading text-xl tracking-tight">Order summary</h2>

        {!quote ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            <ul className="space-y-3">
              {quote.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {item.name}
                    <span className="text-muted-foreground/70">
                      {" "}
                      ({item.variantTitle}) x{item.quantity}
                    </span>
                  </span>
                  <span>{formatPrice(item.lineTotalCents)}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-1.5 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={formatPrice(quote.subtotalCents)} />
              <Row
                label="Shipping"
                value={
                  quote.shippingCents === 0
                    ? "Free"
                    : formatPrice(quote.shippingCents)
                }
              />
              <Row label="Tax (HST)" value={formatPrice(quote.taxCents)} />
              <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
                <span>Total</span>
                <span>{formatPrice(quote.totalCents)}</span>
              </div>
            </div>

            {hasIssues ? (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <Warning className="mt-0.5 size-4 shrink-0" />
                <div>
                  {quote.issues.map((iss, i) => (
                    <p key={i}>
                      {iss.name}: {iss.reason}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              size="lg"
              className="w-full"
              disabled={!canPlace}
              onClick={placeOrder}
            >
              {placing ? (
                <SpinnerGap className="size-4 animate-spin" />
              ) : (
                "Continue to payment"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You will be redirected to our secure Stripe checkout.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}

function FulfillmentOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:border-foreground",
      )}
    >
      <span className={cn("flex", active ? "text-clay" : "text-foreground")}>
        {icon}
      </span>
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}

function Field({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
