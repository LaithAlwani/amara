"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
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

type Step = "start" | "password" | "email_code" | "forgot" | "reset";

export default function SignInPage() {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("start");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Promote a completed sign-in to the active session, then go home.
  async function finish() {
    if (!signIn) return;
    if (signIn.status === "complete") {
      await signIn.finalize();
      router.push("/");
    } else {
      setError("Additional verification is required to sign in.");
    }
  }

  // Step 1 — capture the email, then go to the password step.
  function onStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep("password");
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signIn.password({
        identifier: email,
        password,
      });
      if (err) setError(clerkErrorMessage(err));
      else await finish();
    } finally {
      setLoading(false);
    }
  }

  async function sendEmailCode() {
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signIn.emailCode.sendCode({
        emailAddress: email,
      });
      if (err) setError(clerkErrorMessage(err));
      else {
        setCode("");
        setStep("email_code");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onEmailCode(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signIn.emailCode.verifyCode({ code });
      if (err) setError(clerkErrorMessage(err));
      else await finish();
    } finally {
      setLoading(false);
    }
  }

  // Forgot password — establish the identifier, then email a reset code.
  async function onForgot() {
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      const { error: e1 } = await signIn.create({ identifier: email });
      if (e1) {
        setError(clerkErrorMessage(e1));
        return;
      }
      const { error: e2 } = await signIn.resetPasswordEmailCode.sendCode();
      if (e2) {
        setError(clerkErrorMessage(e2));
        return;
      }
      setCode("");
      setNewPassword("");
      setStep("reset");
    } finally {
      setLoading(false);
    }
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      const { error: e1 } = await signIn.resetPasswordEmailCode.verifyCode({
        code,
      });
      if (e1) {
        setError(clerkErrorMessage(e1));
        return;
      }
      const { error: e2 } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });
      if (e2) setError(clerkErrorMessage(e2));
      else await finish();
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
            <p className="eyebrow">Welcome back</p>
            <h1 className="font-heading text-3xl tracking-tight">
              Sign in to Amara
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to continue to your account.
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

          <Button className="w-full">Continue</Button>

          <p className="text-center text-sm text-muted-foreground">
            New to Amara?{" "}
            <Link href="/sign-up" className="font-medium text-clay">
              Create an account
            </Link>
          </p>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={onPassword} className={card}>
          <header className="space-y-1.5">
            <h1 className="font-heading text-2xl tracking-tight">
              Enter your password
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {email}.
            </p>
          </header>

          {error && <p className={fieldErr}>{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button className="w-full" disabled={loading}>
            {loading ? spinner : "Sign in"}
          </Button>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => void sendEmailCode()}
            >
              Use a code instead
            </button>
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => {
                setError(null);
                setStep("forgot");
              }}
            >
              Forgot password?
            </button>
          </div>
        </form>
      )}

      {step === "email_code" && (
        <form onSubmit={onEmailCode} className={card}>
          <header className="space-y-1.5">
            <h1 className="font-heading text-2xl tracking-tight">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground">
              We sent a code to {email}.
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

      {step === "forgot" && (
        <div className={card}>
          <header className="space-y-1.5">
            <h1 className="font-heading text-2xl tracking-tight">
              Reset your password
            </h1>
            <p className="text-sm text-muted-foreground">
              We will email a code to {email} to reset it.
            </p>
          </header>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            disabled={loading}
            onClick={() => void onForgot()}
          >
            {loading ? spinner : "Send reset code"}
          </Button>

          <button
            type="button"
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setError(null);
              setStep("password");
            }}
          >
            Back
          </button>
        </div>
      )}

      {step === "reset" && (
        <form onSubmit={onReset} className={card}>
          <header className="space-y-1.5">
            <h1 className="font-heading text-2xl tracking-tight">
              Choose a new password
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter the code we emailed you and a new password.
            </p>
          </header>

          {error && <p className={fieldErr}>{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="reset-code">Verification code</Label>
            <Input
              id="reset-code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              className={codeInput}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <Button className="w-full" disabled={loading}>
            {loading ? spinner : "Reset password"}
          </Button>
        </form>
      )}
    </div>
  );
}
