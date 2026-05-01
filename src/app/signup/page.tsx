"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PasswordRulesChecklist } from "@/components/auth/PasswordRulesChecklist";
import { firstPasswordViolation, isPasswordStrong } from "@/lib/auth/passwordRules";
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

// Plan checkboxes shown on the application form. The product_keys here must
// match the catalog keys in the FastAPI products / product_groups tables —
// they are passed back to the backend verbatim and stored in
// customers.application_metadata for the admin reviewer.
const PLAN_OPTIONS: Array<{ key: string; label: string; description: string }> = [
  {
    key: "library_search_full",
    label: "ALAN Library — Full",
    description: "Combined parts + vendor library with all advanced tabs.",
  },
  {
    key: "library_search_basic",
    label: "ALAN Library — Basic",
    description: "Parts + vendor library essentials.",
  },
  {
    key: "bid_matching_pro",
    label: "Bid Matching Pro",
    description: "Unlimited matching profiles and conditions.",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Already-logged-in visitors don't need to apply.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

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
  const [requestedPlans, setRequestedPlans] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlan = (key: string) => {
    setRequestedPlans((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

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

  const submitApplication = async (e: React.FormEvent) => {
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

    setSubmitting(true);
    try {
      const resp = await fetch("/api/auth/beta-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cage_code: cageInput.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          requested_plans: requestedPlans,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Failed to submit application. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(`/signup/pending?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch {
      setError("Unable to submit your application. Please try again.");
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
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide mb-3">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Private beta
          </div>
          <h1 className="text-3xl font-bold text-foreground">Apply for beta access</h1>
          <p className="text-muted mt-2">
            We review beta applications by hand. Submit your details and
            we&apos;ll email you when your account is approved. Already have
            an approved account?{" "}
            <Link href="/login" className="text-primary hover:underline">
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
            Application details
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
                before you can apply.
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
            <form onSubmit={submitApplication} className="space-y-4">
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
                  We&apos;ll send a verification link to confirm this address.
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Which plans interest you? <span className="text-muted font-normal">(optional)</span>
                </label>
                <div className="space-y-2">
                  {PLAN_OPTIONS.map((option) => (
                    <label
                      key={option.key}
                      className="flex items-start gap-3 p-3 border border-border rounded-lg hover:border-primary/40 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={requestedPlans.includes(option.key)}
                        onChange={() => togglePlan(option.key)}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-foreground">{option.label}</div>
                        <div className="text-xs text-muted mt-0.5">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

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
                  {submitting ? "Submitting…" : "Submit application"}
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
