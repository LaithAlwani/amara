"use client";

import Link from "next/link";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSocialButtons } from "@/components/auth/social-buttons";

const card =
  "w-full space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm";
const fieldErr = "block text-xs text-destructive";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex min-h-[78vh] w-full max-w-md flex-col justify-center px-4 py-16">
      <SignUp.Root>
        {/* Step 1: details */}
        <SignUp.Step name="start" className={card}>
          <header className="space-y-1.5">
            <p className="eyebrow">Join Amara</p>
            <h1 className="font-heading text-3xl tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Save your details and track every order in one place.
            </p>
          </header>

          <Clerk.GlobalError className="text-sm text-destructive" />

          <AuthSocialButtons />

          <Clerk.Field name="emailAddress" className="space-y-2">
            <Clerk.Label asChild>
              <Label>Email</Label>
            </Clerk.Label>
            <Clerk.Input type="email" required asChild>
              <Input placeholder="you@email.com" autoComplete="email" />
            </Clerk.Input>
            <Clerk.FieldError className={fieldErr} />
          </Clerk.Field>

          <Clerk.Field name="password" className="space-y-2">
            <Clerk.Label asChild>
              <Label>Password</Label>
            </Clerk.Label>
            <Clerk.Input type="password" required asChild>
              <Input autoComplete="new-password" />
            </Clerk.Input>
            <Clerk.FieldError className={fieldErr} />
          </Clerk.Field>

          <SignUp.Captcha className="empty:hidden" />

          <SignUp.Action submit asChild>
            <Button className="w-full">
              <Clerk.Loading>
                {(isLoading) =>
                  isLoading ? (
                    <SpinnerGap className="size-4 animate-spin" />
                  ) : (
                    "Continue"
                  )
                }
              </Clerk.Loading>
            </Button>
          </SignUp.Action>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-clay">
              Sign in
            </Link>
          </p>
        </SignUp.Step>

        {/* Step 2: any extra required fields */}
        <SignUp.Step name="continue" className={card}>
          <header className="space-y-1.5">
            <h1 className="font-heading text-2xl tracking-tight">
              A few more details
            </h1>
          </header>

          <Clerk.GlobalError className="text-sm text-destructive" />

          <Clerk.Field name="username" className="space-y-2">
            <Clerk.Label asChild>
              <Label>Username</Label>
            </Clerk.Label>
            <Clerk.Input asChild>
              <Input />
            </Clerk.Input>
            <Clerk.FieldError className={fieldErr} />
          </Clerk.Field>

          <SignUp.Action submit asChild>
            <Button className="w-full">Continue</Button>
          </SignUp.Action>
        </SignUp.Step>

        {/* Step 3: verify email */}
        <SignUp.Step name="verifications" className={card}>
          <SignUp.Strategy name="email_code">
            <header className="space-y-1.5">
              <h1 className="font-heading text-2xl tracking-tight">
                Verify your email
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter the code we just sent you.
              </p>
            </header>

            <Clerk.GlobalError className="text-sm text-destructive" />

            <Clerk.Field name="code" className="space-y-2">
              <Clerk.Label asChild>
                <Label>Verification code</Label>
              </Clerk.Label>
              <Clerk.Input type="otp" required autoSubmit asChild>
                <Input inputMode="numeric" autoComplete="one-time-code" />
              </Clerk.Input>
              <Clerk.FieldError className={fieldErr} />
            </Clerk.Field>

            <SignUp.Action submit asChild>
              <Button className="w-full">
                <Clerk.Loading>
                  {(isLoading) =>
                    isLoading ? (
                      <SpinnerGap className="size-4 animate-spin" />
                    ) : (
                      "Verify"
                    )
                  }
                </Clerk.Loading>
              </Button>
            </SignUp.Action>
          </SignUp.Strategy>
        </SignUp.Step>
      </SignUp.Root>
    </div>
  );
}
