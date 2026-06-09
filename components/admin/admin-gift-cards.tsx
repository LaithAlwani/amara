"use client";

import { useQuery } from "convex/react";
import { SpinnerGap } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
});

export function AdminGiftCards() {
  const cards = useQuery(api.giftCards.listGiftCards);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Gift cards
      </h1>

      {cards === undefined ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <SpinnerGap className="size-6 animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">
          No gift cards sold yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-160 text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Code</th>
                <th className="px-4 py-2.5 font-medium">Recipient</th>
                <th className="px-4 py-2.5 font-medium">Issued</th>
                <th className="px-4 py-2.5 font-medium">Balance</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c._id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td className="max-w-48 truncate px-4 py-3 text-muted-foreground">
                    {c.recipientEmail ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatPrice(c.initialCents)}
                  </td>
                  <td className="px-4 py-3">{formatPrice(c.balanceCents)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dateFmt.format(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        c.active && c.balanceCents > 0
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {c.balanceCents <= 0
                        ? "Spent"
                        : c.active
                          ? "Active"
                          : "Inactive"}
                    </Badge>
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
