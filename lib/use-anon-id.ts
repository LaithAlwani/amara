"use client";

import { useCallback, useEffect, useState } from "react";

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

// Stable per-browser id for guest carts. `anonId` is reactive (drives the cart
// query); `ensureAnonId()` creates one on demand at action time.
export function useAnonId() {
  const [anonId, setAnonId] = useState<string | null>(null);

  useEffect(() => {
    const existing = readCookie();
    if (existing) setAnonId(existing);
  }, []);

  const ensureAnonId = useCallback((): string => {
    const existing = readCookie();
    if (existing) {
      setAnonId(existing);
      return existing;
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    writeCookie(id);
    setAnonId(id);
    return id;
  }, []);

  return { anonId, ensureAnonId };
}
