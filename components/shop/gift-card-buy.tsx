"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { SpinnerGap } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

const AMOUNTS = [2500, 5000, 10000];

export function GiftCardBuy() {
  const start = useAction(api.payments.createGiftCardCheckout);
  const { user } = useUser();
  const [amount, setAmount] = useState(5000);
  const [custom, setCustom] = useState("");
  const [recipient, setRecipient] = useState("");
  // Derive (not initial-state) so a signed-in email prefills once Clerk loads.
  const [purchaserInput, setPurchaserInput] = useState<string | null>(null);
  const purchaser =
    purchaserInput ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountCents = custom ? Math.round(parseFloat(custom) * 100) : amount;
  const valid =
    !Number.isNaN(amountCents) &&
    amountCents >= 1000 &&
    amountCents <= 50000 &&
    recipient.includes("@") &&
    purchaser.includes("@");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { url } = await start({
        amountCents,
        recipientEmail: recipient.trim(),
        purchaserEmail: purchaser.trim(),
        message: message.trim() || undefined,
        origin: window.location.origin,
      });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-2">
        <Label>Amount</Label>
        <div className="flex flex-wrap gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAmount(a);
                setCustom("");
              }}
              className={cn(
                "inline-flex h-10 items-center rounded-full border px-4 text-sm transition-colors",
                !custom && amount === a
                  ? "border-clay bg-clay text-clay-foreground"
                  : "border-border hover:border-foreground",
              )}
            >
              {formatPrice(a)}
            </button>
          ))}
          <Input
            type="number"
            min="10"
            max="500"
            step="1"
            placeholder="Custom"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-10 w-28 rounded-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipient">Recipient email</Label>
        <Input
          id="recipient"
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="them@email.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="purchaser">Your email</Label>
        <Input
          id="purchaser"
          type="email"
          value={purchaser}
          onChange={(e) => setPurchaserInput(e.target.value)}
          placeholder="you@email.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message (optional)</Label>
        <textarea
          id="message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" size="lg" disabled={!valid || busy}>
        {busy ? (
          <SpinnerGap className="size-4 animate-spin" />
        ) : (
          `Buy gift card · ${formatPrice(amountCents || 0)}`
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        The code is emailed to the recipient after payment.
      </p>
    </form>
  );
}
