import { ConvexError } from "convex/values";

// Turns any thrown value into a clean, user-facing string.
//
// Convex redacts plain `throw new Error(...)` to "Server Error" in production
// and leaks a "[CONVEX ...] Server Error Uncaught Error: ..." frame in dev —
// neither is fit to show a user. `ConvexError` is the exception: its `data`
// payload is delivered to the client verbatim in every environment, so server
// code should `throw new ConvexError("friendly message")` for expected
// failures. This helper reads that payload and, for anything else, falls back
// to a safe message instead of exposing internal framing.
export function errorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (err instanceof ConvexError) {
    const data = err.data as unknown;
    if (typeof data === "string") return data;
    if (data && typeof data === "object" && "message" in data) {
      const m = (data as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
    return fallback;
  }
  if (err instanceof Error) {
    const m = err.message;
    // Hide Convex's internal framing / redacted messages from users.
    if (!m || /\[CONVEX|Server Error|Uncaught Error/i.test(m)) return fallback;
    return m;
  }
  return fallback;
}
