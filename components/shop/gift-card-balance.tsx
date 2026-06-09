"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { SpinnerGap } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

export function GiftCardBalance() {
  const [input, setInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const result = useQuery(
    api.giftCards.checkBalance,
    code ? { code } : "skip",
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="AMARA-GIFT-XXXXXXXX"
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              e.preventDefault();
              setCode(input.trim());
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!input.trim()}
          onClick={() => setCode(input.trim())}
        >
          Check
        </Button>
      </div>

      {code && result === undefined ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <SpinnerGap className="size-4 animate-spin" /> Checking...
        </p>
      ) : result && result.found ? (
        result.active ? (
          <p className="rounded-lg bg-clay/10 px-3 py-2 text-sm">
            Balance:{" "}
            <span className="font-medium text-clay">
              {formatPrice(result.balanceCents)}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This card has no remaining balance.
          </p>
        )
      ) : result && !result.found ? (
        <p className="text-sm text-destructive">
          We couldn&apos;t find that gift card.
        </p>
      ) : null}
    </div>
  );
}
