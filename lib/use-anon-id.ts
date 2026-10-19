"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "amara_anon_id";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + KEY + "=([^;]+)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(id: string) {
  document.cookie = `${KEY}=${encodeURIComponent(id)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

// The cookie is an external store; subscribers are notified when ensureAnonId
// writes a new id so dependents (the cart query) re-read it.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emitChange() {
  for (const l of listeners) l();
}

// Stable per-browser id for guest carts. `anonId` is reactive (drives the cart
// query); `ensureAnonId()` creates one on demand at action time. Read via
// useSyncExternalStore so there is no setState-in-effect and SSR stays safe
// (server snapshot is null; the client reconciles after hydration).
export function useAnonId() {
  const anonId = useSyncExternalStore(
    subscribe,
    readCookie,
    () => null,
  );

  const ensureAnonId = useCallback((): string => {
    const existing = readCookie();
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    writeCookie(id);
    emitChange();
    return id;
  }, []);

  return { anonId, ensureAnonId };
}
