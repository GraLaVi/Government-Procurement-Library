"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PasswordRulesChecklist } from "@/components/auth/PasswordRulesChecklist";
import { firstPasswordViolation, isPasswordStrong } from "@/lib/auth/passwordRules";
import { writePendingSignup } from "@/lib/signup/pendingSignup";
import { useAuth } from "@/contexts/AuthContext";

type ValidateResponse = {
  eligible: boolean;
  reason: string | null;
  prefill: {
    legal_business_name: string | null;
    dba_name: string | null;
  } | null;
};

type Step = "cage" | "account";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Plan/seat passthrough so a customer who clicked Subscribe before signing
  // up lands back on /pricing with the same selection ready. We honor an
  // explicit `next` first; otherwise build it from `plan` + `seats`.
  const explicitNext = searchParams.get("next");
  const planParam = searchParams.get("plan");
  const seatsParam = searchParams.get("seats");
  const next =
    explicitNext ||
    (planParam
      ? `/pricing?plan=${planParam}${seatsParam ? `&seats=${seatsParam}` : ""}`
      : "/pricing");
  const { user, isLoading: authLoading } = useAuth();

  // Already-logged-in visitors don't need signup.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(next);
    }
  }, [authLoading, user, next, router]);

  const [step, setStep] = useState<Step>("cage");

  // Step 1 state
  const [cageInput, setCageInput] = useState("");
  const [cageValidating, setCageValidating] = useState(false);
  const [cageResult, setCageResult] = useState<ValidateResponse | null>(null);

  // Step 2 state
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCage = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) {
      setCageResult(null);
      return;
    }
    setCageValidating(true);
    setError(null);
    try {
      const resp = await fetch("/api/billing/signup/validate-cage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cage_code: code }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        // Surface backend-unreachable as a soft error rather than a misleading
        // "not eligible" result. The proxy returns 503 for network failures.
        setError(
          errBody.error ||
            (resp.status >= 500
              ? "We couldn't reach the eligibility service. Please try again."
              : "Validation failed."),
        );
        setCageResult(null);
        return;
      }
      const data: ValidateResponse = await resp.json();
      setCageResult(data);
      if (data.eligible && data.prefill?.legal_business_name) {
        setCompanyName(data.prefill.legal_business_name);
      }
    } catch {
      setError("Network error. Please try again.");
      setCageResult(null);
    } finally {
      setCageValidating(false);
    }
  }, []);

  const goToAccountStep = () => {
    if (cageResult?.eligible) setStep("account");
  };

  const submitSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const violation = firstPasswordViolation(password);
    if (violation) {
      setError(`Password requirement: ${violation}.`);
      return;
    }

    // Option 2: nothing is created server-side here. We stash the form
    // data in sessionStorage and send the visitor to /pricing. The actual
    // customer/user/Stripe-customer creation only happens when they click
    // Subscribe on a plan, via the combined /signup-and-checkout endpoint.
    setSubmitting(true);
    try {
      writePendingSignup({
        cage_code: cageInput.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company_name: companyName.trim() || undefined,
      });
      router.push(next);
    } catch {
      setError("Unable to save your details. Please try again.");
      setSubmitting(false);
    }
  };

  if (authLoading || user) {
    return null; // useEffect handles redirect
  }

  return (
    <>
      <Navbar />
      <main className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Create your account</h1>
          <p className="text-muted mt-2">
            Sign up with your CAGE code to get started. Already have an account?{" "}
            <Link href={`/login?redirect=${encodeURIComponent(next)}`} className="text-primary hover:underline">
              Sign in
            </Link>
            .
          </p>
        </div>

        {/* Step indicator */}
        <ol className="flex items-center justify-center gap-3 mb-8 text-sm">
          <li className={`flex items-center gap-2 ${step === "cage" ? "text-foreground font-medium" : "text-muted"}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === "cage" ? "bg-primary text-white" : "bg-success text-white"
              }`}
            >
              {step === "cage" ? "1" : "✓"}
            </span>
            CAGE check
          </li>
          <li className="text-muted">→</li>
          <li className={`flex items-center gap-2 ${step === "account" ? "text-foreground font-medium" : "text-muted"}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === "account" ? "bg-primary text-white" : "bg-card-bg border border-border text-muted"
              }`}
            >
              2
            </span>
            Account details
          </li>
        </ol>

        <div className="bg-card-bg border border-border rounded-xl p-6">
          {/* ---------- Step 1: CAGE ---------- */}
          {step === "cage" && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-error/5 border border-error/20 text-error rounded text-sm">
                  {error}
                </div>
              )}
              <label className="block text-sm font-medium text-foreground">
                CAGE code
              </label>
              <input
                type="text"
                value={cageInput}
                onChange={(e) => {
                  setCageInput(e.target.value);
                  setCageResult(null);
                  setError(null);
                }}
                onBlur={(e) => validateCage(e.target.value)}
                placeholder="e.g. 7Z016"
                maxLength={10}
                className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary uppercase"
              />

              {cageValidating && (
                <p className="text-xs text-muted">Checking eligibility…</p>
              )}

              {cageResult && !cageValidating && (
                <div
                  className={`p-3 rounded text-sm ${
                    cageResult.eligible
                      ? "bg-success/5 border border-success/20 text-success"
                      : "bg-error/5 border border-error/20 text-error"
                  }`}
                >
                  {cageResult.eligible ? (
                    <>
                      <span className="font-medium">✓ Eligible.</span>{" "}
                      {cageResult.prefill?.legal_business_name && (
                        <>
                          Recognized as{" "}
                          <span className="font-medium">
                            {cageResult.prefill.legal_business_name}
                          </span>
                          .
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Not eligible.</span>{" "}
                      {cageResult.reason || "Please contact support if you believe this is incorrect."}
                    </>
                  )}
                </div>
              )}

              <p className="text-xs text-muted">
                Don&apos;t have a CAGE code yet? You&apos;ll need one from{" "}
                <a
                  href="https://sam.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  SAM.gov
                </a>{" "}
                before you can sign up.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="primary"
                  onClick={goToAccountStep}
                  disabled={!cageResult?.eligible || cageValidating}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ---------- Step 2: account ---------- */}
          {step === "account" && (
            <form onSubmit={submitSignup} className="space-y-4">
              {error && (
                <div className="p-3 bg-error/5 border border-error/20 text-error rounded text-sm">
                  {error}
                </div>
              )}

              {/* CAGE display — read-only confirmation of what was validated
                  in step 1. To change, the visitor uses Back. */}
              <div className="bg-muted-light/40 border border-border rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted">CAGE code</div>
                  <div className="text-sm font-mono font-semibold text-foreground mt-0.5">
                    {cageInput.toUpperCase()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("cage")}
                  className="text-xs text-primary hover:underline"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Company name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-muted mt-1">
                  Pre-filled from CAGE {cageInput.toUpperCase()}. Edit if needed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">First name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Last name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-muted mt-1">
                  This will be your sign-in email. We&apos;ll send a verification link after checkout completes — your account isn&apos;t created until you subscribe to a plan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Confirm password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <PasswordRulesChecklist password={password} className="-mt-2" />

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("cage")} disabled={submitting} type="button">
                  ← Back
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={
                    submitting ||
                    !isPasswordStrong(password) ||
                    password !== confirmPassword
                  }
                >
                  {submitting ? "Saving…" : "Continue to plans →"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
