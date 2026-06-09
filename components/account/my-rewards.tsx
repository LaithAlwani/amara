"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Coins, SpinnerGap } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { formatPrice } from "@/lib/format";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function MyRewards() {
  const data = useQuery(api.rewards.myRewards);

  if (data === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <SpinnerGap className="size-6 animate-spin" />
        <p>Loading your rewards...</p>
      </div>
    );
  }
  if (data === null) return null;

  return (
    <div>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <Coins className="size-9 text-clay" weight="fill" />
        <div>
          <p className="font-heading text-3xl font-semibold tracking-tight">
            {data.balance.toLocaleString()} pts
          </p>
          <p className="text-sm text-muted-foreground">
            Worth {formatPrice(data.valueCents)} off your next order. Earn 1
            point per $1 spent.
          </p>
        </div>
      </div>

      <h2 className="mt-10 font-heading text-lg font-semibold tracking-tight">
        History
      </h2>
      {data.transactions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No activity yet. Points appear here after your first order.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {data.transactions.map((t) => (
            <li
              key={t._id}
              className="flex items-center justify-between gap-3 p-4 text-sm"
            >
              <div>
                <p className="font-medium">
                  {t.reason === "earned" ? "Earned" : "Redeemed"}
                  {t.orderNumber ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {t.orderNumber}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateFmt.format(t.createdAt)}
                </p>
              </div>
              <span
                className={
                  t.delta >= 0 ? "text-clay" : "text-muted-foreground"
                }
              >
                {t.delta >= 0 ? "+" : ""}
                {t.delta} pts
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        Redeem points at <Link href="/checkout" className="underline">checkout</Link>.
      </p>
    </div>
  );
}
