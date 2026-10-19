"use client";

import { HandleSSOCallback } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SpinnerGap } from "@phosphor-icons/react";

// OAuth return target. Clerk completes the SSO handshake started by
// signIn.sso() and then calls one of the navigate callbacks below.
export default function SSOCallbackPage() {
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-[78vh] w-full max-w-md flex-col items-center justify-center gap-3 px-4 py-16 text-muted-foreground">
      <SpinnerGap className="size-6 animate-spin" />
      <p className="text-sm">Finishing sign-in…</p>
      <HandleSSOCallback
        navigateToApp={() => router.push("/")}
        navigateToSignIn={() => router.push("/sign-in")}
        navigateToSignUp={() => router.push("/sign-up")}
      />
    </div>
  );
}
