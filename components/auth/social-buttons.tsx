"use client";

import { useSignIn } from "@clerk/nextjs";
import { AppleLogo, GoogleLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clerkErrorMessage } from "@/lib/clerk-error";

// Social sign-in row shared by the sign-in and sign-up pages. Google runs
// through Clerk's SSO redirect flow (returns to /sso-callback); Apple is
// present for layout/brand parity but not yet enabled.
export function AuthSocialButtons() {
  const { signIn } = useSignIn();

  async function continueWithGoogle() {
    if (!signIn) return;
    // On success this redirects to Google; `error` is only set if the
    // redirect could not be started.
    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: "/",
      redirectCallbackUrl: "/sso-callback",
    });
    if (error) toast.error(clerkErrorMessage(error));
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={continueWithGoogle}
      >
        <GoogleLogo weight="bold" className="size-4" />
        Continue with Google
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => toast("Apple sign-in is coming soon.")}
      >
        <AppleLogo weight="fill" className="size-4" />
        Continue with Apple
      </Button>

      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
