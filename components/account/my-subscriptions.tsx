"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useAction } from "convex/react";
import { Repeat, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/confirm-provider";
import { formatPrice } from "@/lib/format";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

type Status = "active" | "paused" | "past_due" | "canceled";

function statusBadge(status: Status): { label: string; className: string } {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      };
    case "paused":
      return {
        label: "Paused",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      };
    case "past_due":
      return { label: "Payment failed", className: "bg-destructive/10 text-destructive" };
    case "canceled":
      return { label: "Canceled", className: "bg-muted text-muted-foreground" };
  }
}

function frequency(intervalCount: number): string {
  return intervalCount === 1 ? "Monthly" : `Every ${intervalCount} months`;
}

export function MySubscriptions() {
  const subs = useQuery(api.subscriptions.mySubscriptions);
  const pause = useAction(api.payments.pauseSubscription);
  const resume = useAction(api.payments.resumeSubscription);
  const cancel = useAction(api.payments.cancelSubscription);
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(
    id: Id<"subscriptions">,
    fn: (args: { subscriptionId: Id<"subscriptions"> }) => Promise<unknown>,
    msg: string,
  ) {
    setBusyId(id);
    try {
      await fn({ subscriptionId: id });
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (subs === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <SpinnerGap className="size-6 animate-spin" />
        <p>Loading your subscriptions...</p>
      </div>
    );
  }

  if (subs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
        <Repeat className="size-10 text-muted-foreground" />
        <div>
          <h2 className="font-heading text-xl tracking-tight">
            No subscriptions yet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose &quot;Subscribe &amp; Save&quot; on any product to set up
            recurring deliveries.
          </p>
        </div>
        <Button asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {subs.map((s) => {
        const badge = statusBadge(s.status);
        const busy = busyId === s._id;
        const id = s._id as Id<"subscriptions">;
        return (
          <li
            key={s._id}
            className="rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {s.nameSnapshot}
                  <span className="text-muted-foreground">
                    {" "}
                    ({s.variantTitleSnapshot}) ×{s.quantity}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatPrice(s.unitPriceCents)} each · {frequency(s.intervalCount)}
                  {s.status !== "canceled" && s.currentPeriodEnd
                    ? ` · next ${dateFmt.format(s.currentPeriodEnd)}`
                    : ""}
                </p>
              </div>
              <Badge className={badge.className}>{badge.label}</Badge>
            </div>

            {s.status !== "canceled" ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {s.status === "paused" ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => run(id, resume, "Subscription resumed")}
                  >
                    Resume
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => run(id, pause, "Subscription paused")}
                  >
                    Pause
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Cancel this subscription?",
                      description: "Your recurring deliveries will stop.",
                      confirmText: "Cancel subscription",
                      cancelText: "Keep it",
                      destructive: true,
                    });
                    if (!ok) return;
                    run(id, cancel, "Subscription canceled");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
