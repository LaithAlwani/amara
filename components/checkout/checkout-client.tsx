"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  Truck,
  Storefront,
  SpinnerGap,
  Warning,
  X,
} from "@phosphor-icons/react";
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
type Mode = "one-time" | "subscribe";

const INTERVALS = [
  { count: 1, label: "Monthly" },
  { count: 2, label: "Every 2 months" },
  { count: 3, label: "Every 3 months" },
];

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
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("one-time");
  const [method, setMethod] = useState<Method>("ship");
  const [interval, setInterval] = useState(1);
  // Email is derived: the typed value if the shopper edited it, else their
  // signed-in address (avoids a setState-in-effect prefill).
  const [emailInput, setEmailInput] = useState<string | null>(null);
  const [address, setAddress] = useState(emptyAddress);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const [giftInput, setGiftInput] = useState("");
  const [appliedGift, setAppliedGift] = useState("");

  const createDraftOrder = useMutation(api.checkout.createDraftOrder);
  const startCheckout = useAction(api.payments.createCheckoutSession);
  const startSubscription = useAction(
    api.payments.createCartSubscriptionCheckout,
  );

  const isSubscribe = mode === "subscribe";
  const email = emailInput ?? user?.primaryEmailAddress?.emailAddress ?? "";

  const discountCode = appliedCode || undefined;
  const quoteEmail = email.trim() || undefined;
  const argsBase = authLoading
    ? null
    : isAuthenticated
      ? {}
      : anonId
        ? { anonId }
        : null;
  const quote = useQuery(
    api.checkout.quoteCart,
    argsBase
      ? {
          ...argsBase,
          fulfillmentMethod: method,
          discountCode,
          email: quoteEmail,
          pointsToRedeem: usePoints ? 1_000_000 : undefined,
          giftCardCode: appliedGift || undefined,
        }
      : "skip",
  );
  const subQuote = useQuery(
    api.subscriptions.quoteSubscription,
    argsBase ? argsBase : "skip",
  );

  const subscribable = (subQuote?.percent ?? 0) > 0;

  // Subscriptions ship only.
  function chooseMode(next: Mode) {
    setMode(next);
    if (next === "subscribe") setMethod("ship");
  }

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
    !isSubscribe &&
    !!quote &&
    !quote.empty &&
    !hasIssues &&
    emailValid &&
    (method === "pickup" || !!addressValid) &&
    !placing;
  const canSubscribe =
    isSubscribe &&
    isAuthenticated &&
    !!subQuote &&
    !subQuote.empty &&
    emailValid &&
    !!addressValid &&
    !placing;

  function buildAddress() {
    return {
      name: address.name.trim(),
      line1: address.line1.trim(),
      line2: address.line2.trim() || undefined,
      city: address.city.trim(),
      province: address.province,
      postalCode: address.postalCode.trim(),
      country: "CA",
      phone: address.phone.trim() || undefined,
    };
  }

  async function placeOrder() {
    setError(null);
    setPlacing(true);
    try {
      const id = isAuthenticated ? undefined : (anonId ?? ensureAnonId());
      const { orderId } = await createDraftOrder({
        anonId: id,
        email: email.trim(),
        fulfillmentMethod: method,
        shippingAddress: method === "ship" ? buildAddress() : undefined,
        discountCode: quote?.appliedCode ?? undefined,
        pointsToRedeem: usePoints ? 1_000_000 : undefined,
        giftCardCode: quote?.giftCardCode ?? undefined,
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

  async function subscribe() {
    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }
    setError(null);
    setPlacing(true);
    try {
      const { url } = await startSubscription({
        intervalCount: interval,
        email: email.trim(),
        shippingAddress: buildAddress(),
        origin: window.location.origin,
      });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPlacing(false);
    }
  }

  // Active summary numbers depend on the mode.
  const summaryItems = isSubscribe ? (subQuote?.items ?? []) : (quote?.items ?? []);
  const summary = isSubscribe ? subQuote : quote;

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
              onChange={(e) => setEmailInput(e.target.value)}
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
              onClick={() => !isSubscribe && setMethod("pickup")}
              disabled={isSubscribe}
              icon={<Storefront className="size-5" />}
              title="Local pickup"
              subtitle={isSubscribe ? "Not for subscriptions" : "Free, in Ottawa"}
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

        {/* Purchase mode */}
        {subscribable ? (
          <div className="grid grid-cols-2 gap-2">
            <ModeOption
              active={!isSubscribe}
              onClick={() => chooseMode("one-time")}
              title="One-time"
            />
            <ModeOption
              active={isSubscribe}
              onClick={() => chooseMode("subscribe")}
              title={`Subscribe & Save ${subQuote?.percent ?? 0}%`}
            />
          </div>
        ) : null}

        {!summary ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            <ul className="space-y-3">
              {summaryItems.map((item, i) => (
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

            {isSubscribe ? (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-medium">Delivery frequency</p>
                <div className="flex flex-wrap gap-2">
                  {INTERVALS.map((opt) => (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => setInterval(opt.count)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        interval === opt.count
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Promo code (one-time only) */
              <div className="border-t border-border pt-4">
                {quote?.appliedCode ? (
                  <div className="flex items-center justify-between rounded-lg bg-clay/10 px-3 py-2 text-sm">
                    <span className="font-medium text-clay">
                      {quote.appliedCode} applied
                    </span>
                    <button
                      type="button"
                      aria-label="Remove code"
                      onClick={() => {
                        setAppliedCode("");
                        setCodeInput("");
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder="Promo code"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && codeInput.trim()) {
                          e.preventDefault();
                          setAppliedCode(codeInput.trim());
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!codeInput.trim()}
                      onClick={() => setAppliedCode(codeInput.trim())}
                    >
                      Apply
                    </Button>
                  </div>
                )}
                {quote?.discountError ? (
                  <p className="mt-1.5 text-xs text-destructive">
                    {quote.discountError}
                  </p>
                ) : null}
              </div>
            )}

            {/* Loyalty points (one-time, signed-in, has balance) */}
            {!isSubscribe && quote && quote.pointsBalance > 0 ? (
              <label className="flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
                <span>
                  Use {quote.pointsBalance.toLocaleString()} points
                  <span className="text-muted-foreground">
                    {" "}
                    (−{formatPrice(quote.pointsBalance)} max)
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={usePoints}
                  onChange={(e) => setUsePoints(e.target.checked)}
                  className="size-4 accent-clay"
                />
              </label>
            ) : null}

            {/* Gift card (one-time) */}
            {!isSubscribe ? (
              <div className="border-t border-border pt-4">
                {quote?.giftCardCode ? (
                  <div className="flex items-center justify-between rounded-lg bg-clay/10 px-3 py-2 text-sm">
                    <span className="font-medium text-clay">
                      Gift card applied
                    </span>
                    <button
                      type="button"
                      aria-label="Remove gift card"
                      onClick={() => {
                        setAppliedGift("");
                        setGiftInput("");
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={giftInput}
                      onChange={(e) => setGiftInput(e.target.value)}
                      placeholder="Gift card code"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!giftInput.trim()}
                      onClick={() => setAppliedGift(giftInput.trim())}
                    >
                      Apply
                    </Button>
                  </div>
                )}
                {quote?.giftCardError ? (
                  <p className="mt-1.5 text-xs text-destructive">
                    {quote.giftCardError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={formatPrice(summary.subtotalCents)} />
              {!isSubscribe && quote && quote.discountCents > 0 ? (
                <div className="flex justify-between text-clay">
                  <span>
                    Discount
                    {quote.appliedCode ? ` (${quote.appliedCode})` : ""}
                  </span>
                  <span>-{formatPrice(quote.discountCents)}</span>
                </div>
              ) : null}
              {!isSubscribe && quote && quote.pointsRedeemed > 0 ? (
                <div className="flex justify-between text-clay">
                  <span>Points</span>
                  <span>-{formatPrice(quote.pointsRedeemed)}</span>
                </div>
              ) : null}
              <Row
                label="Shipping"
                value={
                  summary.shippingCents === 0
                    ? "Free"
                    : formatPrice(summary.shippingCents)
                }
              />
              <Row label="Tax (HST)" value={formatPrice(summary.taxCents)} />
              <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
                <span>{isSubscribe ? "Per delivery" : "Total"}</span>
                <span>{formatPrice(summary.totalCents)}</span>
              </div>
              {!isSubscribe && quote && quote.giftCardRedeemedCents > 0 ? (
                <>
                  <div className="flex justify-between text-clay">
                    <span>Gift card</span>
                    <span>-{formatPrice(quote.giftCardRedeemedCents)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Amount due</span>
                    <span>{formatPrice(quote.amountDueCents)}</span>
                  </div>
                </>
              ) : null}
            </div>

            {isSubscribe && subQuote ? (
              <p className="text-xs text-muted-foreground">
                {subQuote.freeShipApplied
                  ? "Free shipping on this box. "
                  : subQuote.freeShipThreshold
                    ? `Spend ${formatPrice(subQuote.freeShipThreshold)}+ for free shipping. `
                    : ""}
                Renews every {interval === 1 ? "month" : `${interval} months`};
                pause or cancel anytime.
              </p>
            ) : null}

            {hasIssues && !isSubscribe ? (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <Warning className="mt-0.5 size-4 shrink-0" />
                <div>
                  {quote!.issues.map((iss, i) => (
                    <p key={i}>
                      {iss.name}: {iss.reason}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {isSubscribe ? (
              <Button
                size="lg"
                className="w-full"
                disabled={!isAuthenticated ? placing : !canSubscribe}
                onClick={subscribe}
              >
                {placing ? (
                  <SpinnerGap className="size-4 animate-spin" />
                ) : !isAuthenticated ? (
                  "Sign in to subscribe"
                ) : (
                  "Start subscription"
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full"
                disabled={!canPlace}
                onClick={placeOrder}
              >
                {placing ? (
                  <SpinnerGap className="size-4 animate-spin" />
                ) : quote && !quote.empty && quote.amountDueCents === 0 ? (
                  "Place order"
                ) : (
                  "Continue to payment"
                )}
              </Button>
            )}
            {!isSubscribe && quote && quote.amountDueCents === 0 ? null : (
              <p className="text-center text-xs text-muted-foreground">
                You will be redirected to our secure Stripe checkout.
              </p>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function FulfillmentOption({
  active,
  onClick,
  disabled,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl border p-4 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:border-border",
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

function ModeOption({
  active,
  onClick,
  title,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-2.5 text-center text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-foreground",
      )}
    >
      {title}
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
