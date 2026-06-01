"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Mirror src/utils/password_rules.py — keep these in sync. The backend
// is the source of truth; this is just so users get feedback before
// they submit.
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One digit", test: (p: string) => /\d/.test(p) },
];

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(newPassword));
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!allRulesPass) {
      setError("Please meet all the password requirements.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Failed to reset password");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // No token in the URL — the user landed here without a real reset link.
  if (!token) {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-warning"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-secondary mb-2">
            Missing reset token
          </h1>
          <p className="text-muted mb-6">
            This page needs a reset token from the email we sent. Please open
            the link in your password-reset email, or request a new one.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button href="/forgot-password" variant="primary">
              Request a reset link
            </Button>
            <Button href="/login" variant="outline">
              Back to sign in
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-secondary mb-2">
            Password reset
          </h1>
          <p className="text-muted mb-6">
            Your password has been updated. You can now sign in with your new
            password.
          </p>
          <Button href="/login" variant="primary" className="w-full">
            Sign in
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-card-foreground">
          Choose a new password
        </h1>
        <p className="mt-2 text-muted">
          Pick something you haven&apos;t used here before.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="New password"
          type="password"
          placeholder="Enter a new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={isSubmitting}
          autoComplete="new-password"
        />

        <Input
          label="Confirm new password"
          type="password"
          placeholder="Re-enter the new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isSubmitting}
          autoComplete="new-password"
        />

        <ul className="text-sm space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(newPassword);
            return (
              <li
                key={rule.label}
                className={ok ? "text-success" : "text-muted"}
              >
                <span className="inline-block w-4">{ok ? "✓" : "•"}</span>{" "}
                {rule.label}
              </li>
            );
          })}
          <li
            className={
              passwordsMatch
                ? "text-success"
                : confirmPassword.length > 0
                ? "text-error"
                : "text-muted"
            }
          >
            <span className="inline-block w-4">
              {passwordsMatch ? "✓" : "•"}
            </span>{" "}
            Passwords match
          </li>
        </ul>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isSubmitting || !allRulesPass || !passwordsMatch}
        >
          {isSubmitting ? "Resetting..." : "Reset password"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Remember your password?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted-light dark:bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="nav-lockup" aria-label="GPH home">
            <span className="wordmark text-3xl text-secondary">GPH</span>
          </Link>
        </div>
        <div className="bg-card-bg text-card-foreground rounded-2xl shadow-xl shadow-secondary/5 border border-border p-8">
          {children}
        </div>
        <p className="text-center text-sm text-muted mt-6">
          Need help?{" "}
          <a
            href="mailto:support@gphusa.com"
            className="text-primary hover:underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

function ResetPasswordLoading() {
  return (
    <Shell>
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-primary animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-secondary mb-2">Loading...</h1>
      </div>
    </Shell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
