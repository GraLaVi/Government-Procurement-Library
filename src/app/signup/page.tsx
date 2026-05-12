"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
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

type Step = "cage" | "path" | "account";
type SignupPath = "beta" | "self_serve";

// Dev-only "skip beta review" path. When this flag is set, the signup
// flow inserts a path-picker step between CAGE check and the account
// form so testers can submit to /api/billing/signup/customer (immediate
// self-serve activation + Free comp grant + tokens) instead of the
// beta-application queue. Off in prod — the visitor goes straight to
// the beta path like today.
const DEV_SIGNUP_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_DEV_SIGNUP === "true";

// Plan checkboxes shown on the application form. The product_keys here must
// match the catalog keys in the FastAPI products / product_groups tables —
// they are passed back to the backend verbatim and stored on the matching
// beta_applications row for the admin reviewer.
//
// The current beta only offers Parts and Vendor Library — Advanced. To re-add Library
// Basic or Bid Matching Advanced later, append entries here:
//   { key: "library_search_basic", label: "Parts and Vendor Library — Basic", description: "..." },
//   { key: "bid_matching_pro",     label: "Bid Matching Advanced",     description: "..." },
const PLAN_OPTIONS: Array<{ key: string; label: string; description: string }> = [
  {
    key: "library_search_advanced",
    label: "Parts and Vendor Library — Advanced",
    description: "Combined parts + vendor library with all advanced tabs.",
  },
];

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28 text-sm text-muted">
          Loading…
        </main>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  // Pricing-first intent — when the visitor arrives from /pricing the URL
  // carries either ?tier=free or ?plan=<priceId>&seats=<N>. Either form
  // means: skip the path picker, lock to self-serve, and route the
  // post-signup redirect by intent.
  const tierParam = searchParams.get("tier");
  const planParam = searchParams.get("plan");
  const seatsParam = searchParams.get("seats");
  const intentIsFree = tierParam === "free";
  const intentIsPaid = planParam !== null && planParam !== "";
  const hasUrlIntent = intentIsFree || intentIsPaid;
  // Map the URL ?tier= slug to the public product name. Slugs come from
  // /pricing (free / basic / advanced); paid arrivals without a tier
  // slug fall back to a generic label.
  const TIER_PRODUCT_NAMES: Record<string, string> = {
    free: "Parts and Vendor Library — Free",
    basic: "Parts and Vendor Library — Basic",
    advanced: "Parts and Vendor Library — Advanced",
  };
  const intentProductName = tierParam
    ? TIER_PRODUCT_NAMES[tierParam.toLowerCase()] ?? null
    : null;
  const intentLabel = intentProductName ?? (intentIsPaid ? "the plan you selected" : null);

  // Already-logged-in visitors don't need to apply.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const [step, setStep] = useState<Step>("cage");
  // Beta is the production default; the visitor switches to self_serve
  // either via URL intent from /pricing (?tier=free / ?plan=…) or via
  // the dev-only path picker when DEV_SIGNUP_ENABLED is true.
  const [signupPath, setSignupPath] = useState<SignupPath>(
    hasUrlIntent ? "self_serve" : "beta",
  );

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
  // Pre-select when there's only one plan option (which is true today —
  // see PLAN_OPTIONS above). The auto-select naturally disappears if more
  // plans are added later, forcing an explicit choice.
  const [requestedPlans, setRequestedPlans] = useState<string[]>(
    PLAN_OPTIONS.length === 1 ? [PLAN_OPTIONS[0].key] : [],
  );
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

  const advanceFromCage = () => {
    if (!cageResult?.eligible) return;
    // Pricing-first visitors already picked their tier on /pricing —
    // skip both the dev path picker and the beta form, lock to
    // self-serve, and go straight to account creation.
    if (hasUrlIntent) {
      setSignupPath("self_serve");
      setStep("account");
      return;
    }
    setStep(DEV_SIGNUP_ENABLED ? "path" : "account");
  };

  const choosePath = (path: SignupPath) => {
    setSignupPath(path);
    setStep("account");
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

    // Self-serve path: posts to /api/billing/signup/customer. The proxy
    // sets auth cookies on success; we then refresh the auth context and
    // route the visitor based on which tier they picked on /pricing:
    //   ?tier=free       → /dashboard (Free already comp-granted)
    //   ?plan=X&seats=N  → /pricing?plan=X&seats=N to start checkout
    //   (no URL intent)  → /pricing (dev path picker case)
    if (signupPath === "self_serve") {
      try {
        const resp = await fetch("/api/billing/signup/customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cage_code: cageInput.trim().toUpperCase(),
            email: email.trim().toLowerCase(),
            password,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            company_name: companyName.trim() || undefined,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || data.success === false) {
          setError(data.error || "Failed to create your account. Please try again.");
          setSubmitting(false);
          return;
        }
        await refreshUser();
        if (intentIsFree) {
          router.push("/dashboard");
        } else if (intentIsPaid) {
          const qs = new URLSearchParams({ plan: planParam! });
          if (seatsParam) qs.set("seats", seatsParam);
          router.push(`/pricing?${qs.toString()}`);
        } else {
          router.push("/pricing");
        }
      } catch {
        setError("Unable to create your account. Please try again.");
        setSubmitting(false);
      }
      return;
    }

    // Beta-application path (production default).
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
          <h1 className="text-3xl font-bold text-foreground">
            {hasUrlIntent || (signupPath === "self_serve" && step !== "cage")
              ? "Create your account"
              : "Apply for beta access"}
          </h1>
          <p className="text-muted mt-2">
            {hasUrlIntent ? (
              intentIsFree ? (
                <>You&apos;ll get instant access to the Free tier after signup.</>
              ) : (
                <>Create your account, then we&apos;ll send you to checkout.</>
              )
            ) : signupPath === "self_serve" && step !== "cage" ? (
              <>
                After signup you&apos;ll choose Free, Basic, or Advanced on
                the pricing page.
              </>
            ) : (
              <>
                We review beta applications by hand. Submit your details and
                we&apos;ll email you when your account is approved.
              </>
            )}{" "}
            Already have an account?{" "}
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
          {DEV_SIGNUP_ENABLED && !hasUrlIntent && (
            <>
              <li className="text-muted">→</li>
              <li className={`flex items-center gap-2 ${step === "path" ? "text-foreground font-medium" : "text-muted"}`}>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === "path"
                      ? "bg-primary text-white"
                      : step === "account"
                        ? "bg-success text-white"
                        : "bg-card-bg border border-border text-muted"
                  }`}
                >
                  {step === "account" ? "✓" : "2"}
                </span>
                Choose path
              </li>
            </>
          )}
          <li className="text-muted">→</li>
          <li className={`flex items-center gap-2 ${step === "account" ? "text-foreground font-medium" : "text-muted"}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === "account" ? "bg-primary text-white" : "bg-card-bg border border-border text-muted"
              }`}
            >
              {DEV_SIGNUP_ENABLED && !hasUrlIntent ? "3" : "2"}
            </span>
            {signupPath === "self_serve" ? "Account details" : "Application details"}
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
                  onClick={advanceFromCage}
                  disabled={!cageResult?.eligible || cageValidating}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ---------- Step 2 (dev-only): path picker ---------- */}
          {step === "path" && DEV_SIGNUP_ENABLED && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200">
                <strong>Dev mode:</strong> this path picker is only shown
                when <code>NEXT_PUBLIC_ENABLE_DEV_SIGNUP=true</code>. In
                production the visitor goes straight to the beta application.
              </div>
              <p className="text-sm text-muted">How would you like to proceed?</p>

              <button
                type="button"
                onClick={() => choosePath("beta")}
                className="w-full text-left p-4 border border-border rounded-lg hover:border-primary/40 transition-colors"
              >
                <div className="font-medium text-sm text-foreground">
                  Apply for beta access
                </div>
                <div className="text-xs text-muted mt-1">
                  Reviewed by our team. Account stays inactive until approval.
                  Free during the private-beta period.
                </div>
              </button>

              <button
                type="button"
                onClick={() => choosePath("self_serve")}
                className="w-full text-left p-4 border border-border rounded-lg hover:border-primary/40 transition-colors"
              >
                <div className="font-medium text-sm text-foreground">
                  Self-serve signup{" "}
                  <span className="text-[10px] uppercase tracking-wide text-primary/80 ml-1">
                    test path
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">
                  Skip the beta queue. Free tier is granted immediately. You
                  can subscribe to Basic or Advanced from /pricing after signup.
                </div>
              </button>

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("cage")} type="button">
                  ← Back
                </Button>
              </div>
            </div>
          )}

          {/* ---------- Step 3 (or 2 in prod): account ---------- */}
          {step === "account" && (
            <form onSubmit={submitApplication} className="space-y-4">
              {error && (
                <div className="p-3 bg-error/5 border border-error/20 text-error rounded text-sm">
                  {error}
                </div>
              )}

              {/* Tier intent badge — shown only when arriving from /pricing.
                  Reassures the visitor we remembered their choice. The
                  product name is the visual anchor (bold, larger), so the
                  visitor immediately sees which plan this signup applies to. */}
              {hasUrlIntent && intentLabel && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="text-[11px] uppercase tracking-wide text-muted">
                    You&apos;re signing up for
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-primary mt-0.5">
                    {intentLabel}
                  </div>
                  {intentIsPaid && (
                    <div className="text-xs text-muted mt-1.5">
                      Checkout starts right after you create your account.
                    </div>
                  )}
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

              {signupPath === "beta" && (
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
              )}

              <div className="flex justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setStep(
                      DEV_SIGNUP_ENABLED && !hasUrlIntent ? "path" : "cage",
                    )
                  }
                  disabled={submitting}
                  type="button"
                >
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
                  {submitting
                    ? signupPath === "self_serve"
                      ? "Creating account…"
                      : "Submitting…"
                    : signupPath === "self_serve"
                      ? "Create account"
                      : "Submit application"}
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
