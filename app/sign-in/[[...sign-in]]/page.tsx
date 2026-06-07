"use client";

import Link from "next/link";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSocialButtons } from "@/components/auth/social-buttons";

const card =
  "w-full space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm";
const fieldErr = "block text-xs text-destructive";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[78vh] w-full max-w-md flex-col justify-center px-4 py-16">
      <SignIn.Root>
        {/* Step 1: identifier */}
        <SignIn.Step name="start" className={card}>
          <header className="space-y-1.5">
            <p className="eyebrow">Welcome back</p>
            <h1 className="font-heading text-3xl tracking-tight">
              Sign in to Amara
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to continue to your account.
            </p>
          </header>

          <Clerk.GlobalError className="text-sm text-destructive" />

          <AuthSocialButtons />

          <Clerk.Field name="identifier" className="space-y-2">
            <Clerk.Label asChild>
              <Label>Email</Label>
            </Clerk.Label>
            <Clerk.Input type="email" required asChild>
              <Input placeholder="you@email.com" autoComplete="email" />
            </Clerk.Input>
            <Clerk.FieldError className={fieldErr} />
          </Clerk.Field>

          <SignIn.Action submit asChild>
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
          </SignIn.Action>

          <p className="text-center text-sm text-muted-foreground">
            New to Amara?{" "}
            <Link href="/sign-up" className="font-medium text-clay">
              Create an account
            </Link>
          </p>
        </SignIn.Step>

        {/* Step 2: verification */}
        <SignIn.Step name="verifications" className={card}>
          <SignIn.Strategy name="password">
            <header className="space-y-1.5">
              <h1 className="font-heading text-2xl tracking-tight">
                Enter your password
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, <SignIn.SafeIdentifier />.
              </p>
            </header>

            <Clerk.GlobalError className="text-sm text-destructive" />

            <Clerk.Field name="password" className="space-y-2">
              <Clerk.Label asChild>
                <Label>Password</Label>
              </Clerk.Label>
              <Clerk.Input type="password" required asChild>
                <Input autoComplete="current-password" />
              </Clerk.Input>
              <Clerk.FieldError className={fieldErr} />
            </Clerk.Field>

            <SignIn.Action submit asChild>
              <Button className="w-full">
                <Clerk.Loading>
                  {(isLoading) =>
                    isLoading ? (
                      <SpinnerGap className="size-4 animate-spin" />
                    ) : (
                      "Sign in"
                    )
                  }
                </Clerk.Loading>
              </Button>
            </SignIn.Action>

            <SignIn.Action
              navigate="forgot-password"
              className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </SignIn.Action>
          </SignIn.Strategy>

          <SignIn.Strategy name="email_code">
            <header className="space-y-1.5">
              <h1 className="font-heading text-2xl tracking-tight">
                Check your email
              </h1>
              <p className="text-sm text-muted-foreground">
                We sent a code to <SignIn.SafeIdentifier />.
              </p>
            </header>

            <Clerk.GlobalError className="text-sm text-destructive" />

            <Clerk.Field name="code" className="space-y-2">
              <Clerk.Label asChild>
                <Label>Verification code</Label>
              </Clerk.Label>
              <Clerk.Input
                type="otp"
                required
                autoSubmit
                className="flex w-full justify-between"
                render={({ value, status }) => (
                  <span
                    data-status={status}
                    className="flex h-11 w-10 items-center justify-center rounded-md border border-input text-lg data-[status=cursor]:ring-2 data-[status=cursor]:ring-ring data-[status=selected]:ring-2 data-[status=selected]:ring-ring"
                  >
                    {value}
                  </span>
                )}
              />
              <Clerk.FieldError className={fieldErr} />
            </Clerk.Field>

            <SignIn.Action submit asChild>
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
            </SignIn.Action>
          </SignIn.Strategy>
        </SignIn.Step>

        {/* Forgot password */}
        <SignIn.Step name="forgot-password" className={card}>
          <header className="space-y-1.5">
            <h1 className="font-heading text-2xl tracking-tight">
              Reset your password
            </h1>
            <p className="text-sm text-muted-foreground">
              We will email you a code to reset it.
            </p>
          </header>

          <Clerk.GlobalError className="text-sm text-destructive" />

          <SignIn.SupportedStrategy name="reset_password_email_code" asChild>
            <Button className="w-full">Send reset code</Button>
          </SignIn.SupportedStrategy>

          <SignIn.Action
            navigate="previous"
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Back
          </SignIn.Action>
        </SignIn.Step>

        {/* Reset password */}
        <SignIn.Step name="reset-password" className={card}>
          <header className="space-y-1.5">
            <h1 className="font-heading text-2xl tracking-tight">
              Choose a new password
            </h1>
          </header>

          <Clerk.GlobalError className="text-sm text-destructive" />

          <Clerk.Field name="password" className="space-y-2">
            <Clerk.Label asChild>
              <Label>New password</Label>
            </Clerk.Label>
            <Clerk.Input type="password" required asChild>
              <Input autoComplete="new-password" />
            </Clerk.Input>
            <Clerk.FieldError className={fieldErr} />
          </Clerk.Field>

          <Clerk.Field name="confirmPassword" className="space-y-2">
            <Clerk.Label asChild>
              <Label>Confirm password</Label>
            </Clerk.Label>
            <Clerk.Input type="password" required asChild>
              <Input autoComplete="new-password" />
            </Clerk.Input>
            <Clerk.FieldError className={fieldErr} />
          </Clerk.Field>

          <SignIn.Action submit asChild>
            <Button className="w-full">Reset password</Button>
          </SignIn.Action>
        </SignIn.Step>
      </SignIn.Root>
    </div>
  );
}
