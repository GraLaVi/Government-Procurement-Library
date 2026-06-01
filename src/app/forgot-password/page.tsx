"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Best-effort POST: the backend always returns 200 with a generic
    // message (no email enumeration), so we show the confirmation
    // screen even if the network call fails — the user can't tell the
    // difference and that's deliberate.
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // swallow — see comment above
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-muted-light dark:bg-background flex">
      {/* Left side - Branding (matches /login) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F1D2F] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <Link href="/" className="nav-lockup text-4xl text-white mb-12">
            <span className="wordmark">GPH</span>
          </Link>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Forgot your password?
          </h1>
          <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-md">
            No problem. Enter the email address on your account and we&apos;ll send
            you a link to set a new one.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="nav-lockup text-xl text-secondary">
              <span className="wordmark">GPH</span>
            </Link>
          </div>

          <div className="bg-card-bg text-card-foreground rounded-2xl shadow-xl shadow-secondary/5 border border-border p-8">
            {submitted ? (
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
                <h2 className="text-2xl font-bold text-card-foreground">
                  Check your inbox
                </h2>
                <p className="mt-3 text-muted">
                  If an account exists for <strong>{email}</strong>, we&apos;ve
                  sent a password reset link. The link expires in 1 hour.
                </p>
                <p className="mt-4 text-sm text-muted">
                  Didn&apos;t get an email? Check your spam folder, or{" "}
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="text-primary font-medium hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
                <div className="mt-8">
                  <Button href="/login" variant="outline" className="w-full">
                    Back to sign in
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-card-foreground">
                    Reset your password
                  </h2>
                  <p className="mt-2 text-muted">
                    Enter your email and we&apos;ll send you a reset link.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send reset link"}
                  </Button>
                </form>

                <p className="mt-8 text-center text-sm text-muted">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="text-primary font-medium hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
