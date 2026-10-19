// Pulls a human-readable message out of a Clerk error. The Future API
// (useSignIn/useSignUp) returns a ClerkError with `longMessage`/`message`;
// older shapes expose `{ errors: [{ longMessage, message }] }`. Handle both so
// the UI never shows "[object Object]".
export function clerkErrorMessage(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";
  const e = err as {
    longMessage?: string;
    message?: string;
    errors?: Array<{ longMessage?: string; message?: string }>;
  };
  return (
    e.errors?.[0]?.longMessage ||
    e.errors?.[0]?.message ||
    e.longMessage ||
    e.message ||
    "Something went wrong. Please try again."
  );
}
