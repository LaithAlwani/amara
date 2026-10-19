"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSocialButtons } from "@/components/auth/social-buttons";
import { clerkErrorMessage } from "@/lib/clerk-error";

const card =
  "w-full space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm";
const fieldErr = "block text-xs text-destructive";
const codeInput = "text-center text-lg tracking-[0.5em] font-mono";

type Step = "start" | "verify";

export default function SignUpPage() {
  const { signUp } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("start");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1 — create the account with a password, then send the email code.
  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError(null);
    setLoading(true);
    try {
      const { error: e1 } = await signUp.password({
        emailAddress: email,
        password,
      });
      if (e1) {
        setError(clerkErrorMessage(e1));
        return;
      }
      const { error: e2 } = await signUp.verifications.sendEmailCode();
      if (e2) {
        setError(clerkErrorMessage(e2));
        return;
      }
      setCode("");
      setStep("verify");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — confirm the email code and activate the session.
  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signUp.verifications.verifyEmailCode({
        code,
      });
      if (err) {
        setError(clerkErrorMessage(err));
        return;
      }
      if (signUp.status === "complete") {
        await signUp.finalize();
        router.push("/");
      } else {
        setError("That code didn't work. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const spinner = <SpinnerGap className="size-4 animate-spin" />;

  return (
    <div className="mx-auto flex min-h-[78vh] w-full max-w-md flex-col justify-center px-4 py-16">
      {step === "start" && (
        <form onSubmit={onStart} className={card}>
          <header className="space-y-1.5">
            <p className="eyebrow">Join Amara</p>
            <h1 className="font-heading text-3xl tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Save your details and track every order in one place.
            </p>
          </header>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <AuthSocialButtons />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Clerk renders its Smart CAPTCHA widget into this element. */}
          <div id="clerk-captcha" className="empty:hidden" />

          <Button className="w-full" disabled={loading}>
            {loading ? spinner : "Continue"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-clay">
              Sign in
            </Link>
          </p>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={onVerify} className={card}>
          <header className="space-y-1.5">
            <h1 className="font-heading text-2xl tracking-tight">
              Verify your email
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter the code we just sent to {email}.
            </p>
          </header>

          {error && <p className={fieldErr}>{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              className={codeInput}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <Button className="w-full" disabled={loading}>
            {loading ? spinner : "Verify"}
          </Button>
        </form>
      )}
    </div>
  );
}
