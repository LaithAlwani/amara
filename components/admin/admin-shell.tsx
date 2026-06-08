"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { SpinnerGap } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
];

// Client-side admin gate. The real security boundary is `requireAdmin` inside
// every admin Convex function; this just keeps non-admins from seeing the shell.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const isAdmin = useQuery(api.admin.amIAdmin);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isAdmin === false) router.replace("/");
  }, [isAdmin, router]);

  if (isAdmin === undefined || isAdmin === false) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <SpinnerGap className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-xl font-semibold tracking-tight">
            Amara
          </span>
          <span className="text-sm text-muted-foreground">Admin</span>
        </div>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          View store →
        </Link>
      </div>
      <nav className="mt-4 flex gap-1">
        {ADMIN_NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
