"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

function PendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const resendVerification = async () => {
    if (!email) return;
    setResending(true);
    setResendMessage(null);
    try {
      const resp = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setResendMessage(data.error || "Failed to send verification email.");
      } else {
        setResendMessage("Verification email sent — check your inbox.");
      }
    } catch {
      setResendMessage("An unexpected error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <div className="bg-card-bg border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Application received</h1>
          <p className="text-muted mt-3 leading-relaxed">
            Thanks for applying to the GPH private beta.{" "}
            {email ? (
              <>
                We&apos;ve sent a verification link to{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </>
            ) : (
              "We've sent a verification link to your email."
            )}{" "}
            Please confirm it so we can review your application — we&apos;ll
            email you again once your account is approved.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button href="/" variant="outline">
              Back to homepage
            </Button>
            {email && (
              <button
                type="button"
                onClick={resendVerification}
                disabled={resending}
                className="text-primary text-sm font-medium hover:underline disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend verification email"}
              </button>
            )}
          </div>
          {resendMessage && (
            <p className="text-xs text-muted mt-3">{resendMessage}</p>
          )}

          <p className="text-xs text-muted mt-8">
            Already have an approved account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SignupPendingPage() {
  return (
    <Suspense fallback={null}>
      <PendingContent />
    </Suspense>
  );
}
