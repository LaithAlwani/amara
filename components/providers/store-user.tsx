"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Mirrors the Clerk identity into the Convex `users` table once authenticated.
// Mounted in the root layout; renders nothing.
export function StoreUser() {
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.getOrCreateCurrentUser);

  useEffect(() => {
    if (!isAuthenticated) return;
    void storeUser({}).catch(() => {
      // Non-fatal: a transient auth race can reject; it retries on next mount.
    });
  }, [isAuthenticated, storeUser]);

  return null;
}
