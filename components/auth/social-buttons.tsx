"use client";

import * as Clerk from "@clerk/elements/common";
import { AppleLogo, GoogleLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Social sign-in row shared by the sign-in and sign-up "start" steps.
// Google is wired through Clerk's OAuth connection; Apple is present for
// layout/brand parity but not yet enabled.
export function AuthSocialButtons() {
  return (
    <div className="space-y-3">
      <Clerk.Connection name="google" asChild>
        <Button type="button" variant="outline" className="w-full gap-2">
          <GoogleLogo weight="bold" className="size-4" />
          Continue with Google
        </Button>
      </Clerk.Connection>

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
