"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { Button } from "@/components/ui/Button";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { tierBadgeForKey } from "@/lib/library/tier";
import { clearPendingSignup } from "@/lib/signup/pendingSignup";
import { TermsAcceptanceModal } from "@/components/billing/TermsAcceptanceModal";
import {
  type Price,
  formatMoney as formatPriceMoney,
  intervalLabel as priceIntervalLabel,
  computeTotalCents,
  maxPickerSeats,
} from "@/lib/billing/pricing";

type Plan = {
  kind: "product" | "product_group";
  id: number;
  key: string;
  name: string;
  description: string | null;
  // products.category ('service' | 'feature' | ...). product_groups always
  // come back null — a bundled library tier, never a standalone add-on.
  // 'feature' products (e.g. request_for_quote) are add-ons that stack
  // alongside a plan; they must never appear in the plan-swap picker.
  category: string | null;
  default_seat_count: number | null;
  requires_seat_assignment: boolean;
  prices: Price[];
  // Hard cap on seats for this plan (from feature_limits.max_seat_count).
  // null = uncapped.
  max_seat_count: number | null;
};

// Add-ons: billing-enabled 'feature' products, purchased as an independent
// second Stripe subscription alongside the customer's library tier (see
// SwitchPlanModal's `otherPlans` filter — the same category value keeps
// these out of the tier-swap dropdown).
const isAddonPlan = (p: Plan) => p.kind === "product" && p.category === "feature";

type Subscription = {
  id: number;
  status: string;
  seat_quantity: number;
  plan_kind: "product" | "product_group" | null;
  plan_id: number | null;
  product_name: string | null;
  product_group_name: string | null;
  interval_count: number | null;
  unit_amount_cents: number | null;
  currency: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
};

type Invoice = {
  id: number;
  number: string | null;
  source: string;
  status: string;
  amount_due_cents: number;
  amount_paid_cents: number;
  currency: string;
  issued_at: string | null;
  paid_at: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
};

type InvoiceListResponse = { invoices: Invoice[]; total: number };

// One currently-trialing subscription. A customer can hold more than one at
// once (e.g. a library tier plus the RFQ add-on), each on its own
// independent trial clock.
type TrialInfo = {
  subscription_id: number;
  label: string;
  trial_end: string;
  days_remaining: number;
};

type PaymentMethodStatus = {
  has_payment_method: boolean;
  trials: TrialInfo[]; // soonest-ending first
};

// Stripe-side billing view (GET /api/billing/billing-details). The billing
// contact/card here is whoever entered the card in the Stripe Portal, which
// may differ from the signup user. All fields best-effort / nullable.
type BillingDetails = {
  has_stripe_customer: boolean;
  portal_available: boolean;
  billing_name: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  billing_address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  } | null;
  card: {
    brand: string | null;
    last4: string | null;
    exp_month: number | null;
    exp_year: number | null;
    funding: string | null;
  } | null;
  next_payment: {
    amount_cents: number | null;
    currency: string | null;
    date: string | null;
  } | null;
};

function trialDeadlineSentence(days: number | null | undefined): string {
  if (days == null) return "soon";
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function formatMoney(cents: number | null | undefined, currency: string | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function intervalLabel(months: number | null | undefined): string {
  switch (months) {
    case 1: return "Monthly";
    case 3: return "Quarterly";
    case 6: return "Semi-annual";
    case 12: return "Annual";
    default: return months ? `Every ${months} months` : "";
  }
}

function statusBadge(status: string): { label: string; className: string } {
  const base = "inline-block px-2 py-1 text-xs font-medium rounded-full capitalize";
  switch (status) {
    case "active":
    case "active_check":
      return { label: "Active", className: `${base} bg-success/10 text-success border border-success/20` };
    case "trialing":
      return { label: "Trial", className: `${base} bg-primary/10 text-primary border border-primary/20` };
    case "past_due":
    case "unpaid":
      return { label: status.replace(/_/g, " "), className: `${base} bg-warning/10 text-warning border border-warning/20` };
    case "canceled":
    case "incomplete_expired":
      return { label: status.replace(/_/g, " "), className: `${base} bg-muted/10 text-muted border border-border` };
    default:
      return { label: status, className: `${base} bg-muted/10 text-muted border border-border` };
  }
}

type ActiveModal =
  | { kind: "interval"; sub: Subscription }
  | { kind: "switchPlan"; sub: Subscription }
  | { kind: "seats"; sub: Subscription }
  | { kind: "cancel"; sub: Subscription }
  | { kind: "addAddon"; plan: Plan }
  | null;

// Non-terminal subscription statuses — mirrors CURRENT_SUB_STATUSES on
// /pricing (src/app/pricing/page.tsx). Used to decide whether a customer
// already holds a given add-on.
const LIVE_SUB_STATUSES = new Set(["trialing", "active", "past_due", "unpaid", "active_check"]);

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading…</div>}>
      <BillingPageContent />
    </Suspense>
  );
}

function BillingPageContent() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser, hasAnyProductAccess, logout } = useAuth();
  // Every signed-up org holds the Free tier as a baseline comp grant (it isn't a
  // Stripe subscription), so a customer with no paid sub is on Free — surface
  // that in the Current Plan card instead of "no active plan".
  const onFreeTier = hasAnyProductAccess([
    "library_search_free",
    "library_vendor_search_free",
    "library_parts_search_free",
  ]);
  const searchParams = useSearchParams();
  const checkoutFlag = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pmStatus, setPmStatus] = useState<PaymentMethodStatus | null>(null);
  const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalPending, setPortalPending] = useState(false);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [showCloseAccount, setShowCloseAccount] = useState(false);
  const [activeTab, setActiveTab] = useState("plan");
  // Tracks the post-Checkout finalization step (Option 2 self-serve flow):
  // when /pricing's signup-and-checkout sent the visitor to Stripe, the
  // visitor lands here ?checkout=success&session_id=cs_… still logged out.
  // We exchange the session_id for auth cookies before loading the rest.
  const [finalizingCheckout, setFinalizingCheckout] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [subsResp, invsResp, plansResp, pmResp, bdResp] = await Promise.all([
        fetchWithAuth("/api/billing/subscriptions"),
        fetchWithAuth("/api/billing/invoices"),
        fetch("/api/billing/plans"),
        fetchWithAuth("/api/billing/payment-method-status"),
        fetchWithAuth("/api/billing/billing-details"),
      ]);

      if (!subsResp.ok) {
        const body = await subsResp.json().catch(() => ({}));
        setError(body.error || "Failed to load subscriptions");
        return;
      }
      if (!invsResp.ok) {
        const body = await invsResp.json().catch(() => ({}));
        setError(body.error || "Failed to load invoices");
        return;
      }
      if (!plansResp.ok) {
        const body = await plansResp.json().catch(() => ({}));
        setError(body.error || "Failed to load plans");
        return;
      }

      setSubscriptions(await subsResp.json());
      setInvoices((await invsResp.json() as InvoiceListResponse).invoices);
      setPlans(await plansResp.json());
      // Payment-method/trial status drives the top banner + CTA swap. A failed
      // fetch shouldn't block the page; just treat as non-subscriber.
      if (pmResp.ok) setPmStatus(await pmResp.json());
      else setPmStatus(null);
      // Stripe-side billing details — best-effort; never block the page.
      if (bdResp.ok) setBillingDetails(await bdResp.json());
      else setBillingDetails(null);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Option 2: when we land here from a successful Stripe Checkout that
  // started in /pricing's signup-and-checkout flow, the visitor isn't
  // logged in yet. Exchange ?session_id=… for auth cookies first, then
  // fall through to the normal user-aware loadData below.
  useEffect(() => {
    if (checkoutFlag !== "success" || !checkoutSessionId) return;
    if (user) return;            // already logged in (e.g. existing customer adding a sub)
    if (authLoading) return;     // wait until we know whether they're logged in
    if (finalizingCheckout) return;

    let cancelled = false;
    (async () => {
      setFinalizingCheckout(true);
      try {
        const resp = await fetch("/api/billing/finalize-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: checkoutSessionId }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) {
          if (!cancelled) setError(data.error || "We couldn't finalize your checkout. Please sign in.");
          return;
        }
        // Pending signup blob is no longer needed.
        clearPendingSignup();
        // Pull the new user identity into AuthContext.
        await refreshUser();
        // Strip session_id from the URL (no need to re-finalize on refresh).
        if (!cancelled) {
          const cleaned = new URLSearchParams(searchParams.toString());
          cleaned.delete("session_id");
          router.replace(`/account/billing?${cleaned.toString()}`);
        }
      } catch (err) {
        console.error("finalize-checkout error", err);
        if (!cancelled) setError("Network error finalizing checkout. Please sign in.");
      } finally {
        if (!cancelled) setFinalizingCheckout(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutFlag, checkoutSessionId, user, authLoading]);

  useEffect(() => {
    if (!authLoading && user) loadData();
  }, [authLoading, user, loadData]);

  // Billing is admin-only. Non-admin (member) users are redirected to /account.
  // The logged-out signup-and-checkout finalize flow is unaffected — its first
  // user is always the account admin.
  useEffect(() => {
    if (!authLoading && user && !user.roles?.includes("admin")) {
      router.replace("/account");
    }
  }, [authLoading, user, router]);

  // Poll once after a Stripe redirect so the webhook has time to provision.
  useEffect(() => {
    if (checkoutFlag !== "success") return;
    if (subscriptions.length > 0) return;
    if (isLoading) return;
    const timer = setTimeout(loadData, 2000);
    return () => clearTimeout(timer);
  }, [checkoutFlag, subscriptions.length, isLoading, loadData]);

  // Deep-link from "Add a seat" (e.g. the at-cap CTA on /account/users):
  // once subscriptions + plans are loaded, auto-open the Change-seats modal
  // for the customer's live per-seat subscription so they land straight on
  // the seat picker. Clears the param afterward so it doesn't re-fire.
  const seatActionParam = searchParams.get("action");
  useEffect(() => {
    if (seatActionParam !== "add-seat") return;
    if (isLoading || modal !== null) return;
    if (subscriptions.length === 0 || plans.length === 0) return;
    const target = subscriptions.find((sub) => {
      if (sub.status === "canceled" || sub.status === "incomplete_expired") return false;
      const plan = plans.find((p) =>
        sub.plan_kind && sub.plan_id !== null
          ? p.kind === sub.plan_kind && p.id === sub.plan_id
          : (!!sub.product_name && p.kind === "product" && p.name === sub.product_name) ||
            (!!sub.product_group_name && p.kind === "product_group" && p.name === sub.product_group_name),
      );
      return plan?.max_seat_count != null;
    });
    if (target) {
      setModal({ kind: "seats", sub: target });
      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      router.replace(`/account/billing${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
    }
  }, [seatActionParam, isLoading, modal, subscriptions, plans, searchParams, router]);

  const openPortal = async () => {
    setPortalPending(true);
    setError(null);
    try {
      const resp = await fetchWithAuth("/api/billing/portal-link");
      const data = await resp.json();
      if (!resp.ok || !data.portal_url) {
        setError(data.error || "Failed to open the customer portal");
        return;
      }
      window.location.href = data.portal_url;
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setPortalPending(false);
    }
  };

  const replaceSub = (next: Subscription) =>
    setSubscriptions((prev) => prev.map((s) => (s.id === next.id ? next : s)));

  const reactivate = async (sub: Subscription) => {
    setError(null);
    try {
      const resp = await fetchWithAuth(`/api/billing/subscriptions/${sub.id}/reactivate`, { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Failed to reactivate");
        return;
      }
      replaceSub(data);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    }
  };

  // Has any subscription tied a Stripe customer? (proxy: any sub at all means
  // we have stripe_customer_id on the customer row, since service.create_portal
  // needs it.) We just enable Portal whenever there's at least one sub.
  const hasStripeCustomer = subscriptions.length > 0;

  // Add-ons only make sense alongside a paid tier — a Free-tier customer
  // can't add one yet (matches the same gate on /pricing's RFQ panel).
  const hasPaidTier = subscriptions.some((s) => {
    if (!LIVE_SUB_STATUSES.has(s.status)) return false;
    const matchedPlan = plans.find((p) =>
      s.plan_kind && s.plan_id !== null
        ? p.kind === s.plan_kind && p.id === s.plan_id
        : (!!s.product_name && p.kind === "product" && p.name === s.product_name) ||
          (!!s.product_group_name && p.kind === "product_group" && p.name === s.product_group_name),
    );
    // Unknown plan (e.g. plans still loading) — don't block on it either way.
    return matchedPlan ? !isAddonPlan(matchedPlan) : true;
  });

  // Add-ons the customer doesn't already hold — purchasable as an independent
  // second subscription (see isAddonPlan). A "live" subscription to the same
  // product name means they already have it; canceled/expired ones don't count.
  const addonPlans = hasPaidTier
    ? plans.filter(
        (p) => isAddonPlan(p) && !subscriptions.some(
          (s) => LIVE_SUB_STATUSES.has(s.status) && s.product_name === p.name,
        ),
      )
    : [];

  // Trial-state banner drivers. A customer can hold more than one
  // concurrent trial (e.g. a library tier plus the RFQ add-on), each on its
  // own independent clock — pmStatus.trials lists every one, soonest-ending
  // first. One payment method covers all of them.
  const trials = pmStatus?.trials ?? [];
  const trialingNoCard = trials.length > 0 && !!pmStatus && !pmStatus.has_payment_method;
  const trialingWithCard = trials.length > 0 && !!pmStatus && pmStatus.has_payment_method;

  if (authLoading) return <div className="p-6">Loading...</div>;

  // Post-Checkout finalize for the self-serve signup-and-checkout flow:
  // visitor isn't logged in yet, we're swapping the Stripe session_id for
  // auth cookies. Show a clear interstitial so they don't see the
  // "you're not logged in" empty state in the millisecond before cookies
  // are set.
  if (finalizingCheckout || (!user && checkoutFlag === "success" && checkoutSessionId)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted">Setting up your account…</p>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
        </div>
      </div>
    );
  }

  // Admin-only page. Members never see billing content — the effect above
  // redirects them; this guard prevents any flash of billing data meanwhile.
  if (user && !user.roles?.includes("admin")) {
    return (
      <div className="p-6 text-sm text-muted">
        Billing is managed by your account administrator. Redirecting…
      </div>
    );
  }

  return (
    <>
      {/* Trial-state banner. Urgent (warning) for trialing customers without a
          card on file — the trial will cancel at the deadline. Soft (info) for
          trialing customers who already have a card — they're set, just
          informing them when the first charge lands. */}
      {trialingNoCard && (
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="text-sm">
            {trials.length === 1 ? (
              <p className="font-medium text-foreground">
                Your trial ends {trialDeadlineSentence(trials[0].days_remaining)}.
              </p>
            ) : (
              <>
                <p className="font-medium text-foreground">Your trials are ending:</p>
                <ul className="mt-1 space-y-0.5 text-foreground">
                  {trials.map((t) => (
                    <li key={t.subscription_id}>
                      <span className="font-medium">{t.label}</span> — ends {trialDeadlineSentence(t.days_remaining)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-1 text-muted">
              Add a payment method to keep your access — without one, {trials.length === 1 ? "your subscription" : "these subscriptions"} will cancel automatically when the trial ends.
            </p>
          </div>
          <Button onClick={openPortal} disabled={portalPending}>
            {portalPending ? "Opening…" : "Add Payment Method"}
          </Button>
        </div>
      )}
      {trialingWithCard && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          {trials.length === 1 ? (
            <>
              <span className="font-medium">Trial ends {trialDeadlineSentence(trials[0].days_remaining)}</span>
              <span className="text-muted"> — you&apos;ll be auto-charged once it does.</span>
            </>
          ) : (
            <>
              <span className="font-medium">Multiple trials ending:</span>{" "}
              {trials.map((t, i) => (
                <span key={t.subscription_id}>
                  {i > 0 && ", "}
                  {t.label} ({trialDeadlineSentence(t.days_remaining)})
                </span>
              ))}
              <span className="text-muted"> — you&apos;ll be auto-charged once each does.</span>
            </>
          )}
        </div>
      )}

      {/* Breadcrumb — matches /account/users and /account/notifications. */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/account" className="text-muted hover:text-primary transition-colors">
              Account
            </Link>
          </li>
          <li className="text-muted">/</li>
          <li className="text-foreground font-medium">Billing &amp; Subscriptions</li>
        </ol>
      </nav>

      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Subscriptions</h1>
          <p className="text-muted mt-1">
            Your current plan, included features, invoices, and payment history.
          </p>
        </div>
        <div className="flex gap-2">
          {/* "Manage payment method" moved into the Payment & billing card
              below. Hide "View plans" for trialing customers without a card —
              picking a plan there creates a duplicate Stripe subscription
              instead of adding a card. Banner above directs them to the Portal. */}
          {!trialingNoCard && (
            <Button href="/pricing" variant="outline" size="sm">
              View plans
            </Button>
          )}
        </div>
      </div>

      {hasStripeCustomer && (
        <p className="text-sm text-muted mb-6">
          Payments processed securely by Stripe. Your card details are never stored on our servers.
        </p>
      )}

      {checkoutFlag === "success" && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-4 mb-6 text-sm text-foreground">
          Thanks — your Checkout was completed. If your new plan isn&apos;t showing yet, it&apos;ll appear within a few seconds as Stripe finalizes the subscription.
        </div>
      )}

      {error && (
        <div className="bg-error/5 border border-error/20 rounded-xl p-4 mb-6 text-sm text-error">
          {error}
        </div>
      )}

      <Tabs
        tabs={[
          { id: "plan", label: "Plan" },
          { id: "invoices", label: "Invoices", badge: invoices.length || undefined },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-6"
      />

      <TabPanel tabId="plan" activeTab={activeTab}>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Current plan{subscriptions.length > 1 ? "s" : ""}
        </h2>

        {isLoading ? (
          <div className="bg-card-bg border border-border rounded-xl p-6 mb-8 text-muted text-sm">
            Loading subscription details…
          </div>
        ) : subscriptions.length === 0 ? (
          onFreeTier ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <FreePlanCard />
            </div>
          ) : (
            <div className="bg-card-bg border border-border rounded-xl p-6 mb-8">
              <p className="text-muted text-sm">You don&apos;t have an active plan yet.</p>
              <div className="mt-4">
                <Button href="/pricing" variant="primary" size="sm">
                  Browse plans
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {subscriptions.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                plans={plans}
                onChangeInterval={() => setModal({ kind: "interval", sub })}
                onSwitchPlan={() => setModal({ kind: "switchPlan", sub })}
                onChangeSeats={() => setModal({ kind: "seats", sub })}
                onCancel={() => setModal({ kind: "cancel", sub })}
                onReactivate={() => reactivate(sub)}
              />
            ))}
          </div>
        )}

        {/* Add-ons stack alongside the current plan as an independent Stripe
            subscription — never a plan swap. Hidden once the customer already
            holds every available add-on. */}
        {!isLoading && addonPlans.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4">Add-ons</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              {addonPlans.map((plan) => (
                <AddonCard
                  key={`${plan.kind}-${plan.id}`}
                  plan={plan}
                  onAdd={() => setModal({ kind: "addAddon", plan })}
                />
              ))}
            </div>
          </>
        )}

        {/* Stripe-side payment & billing details, and the sole entry point to
            the Stripe Portal. Shown for any customer with a Stripe link
            (subscribers / trialers, incl. canceled); Free customers have
            nothing here yet. Uses the reliable hasStripeCustomer signal so the
            "Manage in Stripe" action survives a failed billing-details fetch. */}
        {!isLoading && (hasStripeCustomer || billingDetails?.has_stripe_customer) && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4">Payment &amp; billing</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <PaymentBillingCard
                details={billingDetails}
                onManage={openPortal}
                portalPending={portalPending}
              />
            </div>
          </>
        )}
      </TabPanel>

      <TabPanel tabId="invoices" activeTab={activeTab}>
        <h2 className="text-lg font-semibold text-foreground mb-4">Invoice history</h2>
        <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-muted text-sm">Loading invoices…</div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-muted text-sm">No invoices yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted-light/40 text-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Number</th>
                  <th className="text-left px-4 py-2 font-medium">Issued</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                  <th className="text-right px-4 py-2 font-medium">Paid</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2 text-card-foreground">{inv.number || `#${inv.id}`}</td>
                    <td className="px-4 py-2 text-muted">{formatDate(inv.issued_at)}</td>
                    <td className="px-4 py-2 text-muted capitalize">{inv.status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2 text-right text-card-foreground">
                      {formatMoney(inv.amount_due_cents, inv.currency)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted">
                      {inv.paid_at ? formatDate(inv.paid_at) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {inv.invoice_pdf_url ? (
                        <a href={inv.invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">PDF</a>
                      ) : inv.hosted_invoice_url ? (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View</a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </TabPanel>

      {/* Danger zone — admin-only account closure. Kept visually separate from
          plan actions to avoid confusion with "Downgrade to Free" (which keeps
          the account). Closing deactivates the account; it does not delete data. */}
      {activeTab === "plan" && user?.roles?.includes("admin") && (
        <div className="mt-10 border border-error/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-error">Close account</h3>
          <p className="text-xs text-muted mt-1 max-w-xl">
            Deactivate your organization&apos;s account: this cancels billing and signs out every
            user. It&apos;s <span className="font-medium">not a deletion</span> — your data is
            preserved and support can reopen the account. To simply stop paying while keeping a
            free account, use <span className="font-medium">Downgrade to Free</span> above instead.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-error/40 text-error hover:bg-error/5"
            onClick={() => setShowCloseAccount(true)}
          >
            Close account
          </Button>
        </div>
      )}

      <div className="mt-6 text-xs text-muted">
        Back to <Link href="/account" className="text-primary hover:underline">Account</Link>.
      </div>

      {showCloseAccount && (
        <CloseAccountModal
          onClose={() => setShowCloseAccount(false)}
          onClosed={async () => { await logout(); router.push("/login"); }}
          onError={setError}
        />
      )}

      {modal?.kind === "interval" && (
        <IntervalModal
          sub={modal.sub}
          plans={plans}
          onClose={() => setModal(null)}
          onSaved={(next) => { replaceSub(next); setModal(null); }}
          onError={setError}
        />
      )}
      {modal?.kind === "switchPlan" && (
        <SwitchPlanModal
          sub={modal.sub}
          plans={plans}
          onClose={() => setModal(null)}
          onSaved={(next) => { replaceSub(next); setModal(null); }}
          onError={setError}
        />
      )}
      {modal?.kind === "seats" && (
        <SeatsModal
          sub={modal.sub}
          plans={plans}
          onClose={() => setModal(null)}
          onSaved={(next) => { replaceSub(next); setModal(null); }}
          onError={setError}
        />
      )}
      {modal?.kind === "cancel" && (
        <CancelModal
          sub={modal.sub}
          onClose={() => setModal(null)}
          onSaved={(next) => { replaceSub(next); setModal(null); }}
          onError={setError}
        />
      )}
      {modal?.kind === "addAddon" && (
        <AddAddonModal
          plan={modal.plan}
          onClose={() => setModal(null)}
          onError={setError}
        />
      )}
    </>
  );
}

// Stripe-side payment & billing details. The card/contact shown here is
// whatever was entered in the Stripe Customer Portal (the person who actually
// pays), which may differ from the signed-in user. Read-only; all changes go
// through the Stripe portal (the only PCI-safe place to manage a card).
function PaymentBillingCard({
  details,
  onManage,
  portalPending,
}: {
  details: BillingDetails | null;
  onManage: () => void;
  portalPending: boolean;
}) {
  const { card, billing_name, billing_email, billing_address, next_payment } =
    details ?? ({} as Partial<BillingDetails>);

  const brand = card?.brand
    ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1)
    : null;
  const cardLabel = card?.last4 ? `${brand ? `${brand} ` : ""}•••• ${card.last4}` : null;
  const expLabel =
    card?.exp_month && card?.exp_year
      ? `exp ${card.exp_month}/${String(card.exp_year).slice(-2)}`
      : null;

  const contact =
    billing_name || billing_email
      ? [billing_name, billing_email].filter(Boolean).join(" · ")
      : null;

  const addr = billing_address;
  const addressLine =
    addr && (addr.line1 || addr.city)
      ? [
          addr.line1,
          addr.line2,
          [addr.city, addr.state].filter(Boolean).join(", "),
          addr.postal_code,
          addr.country,
        ]
          .filter(Boolean)
          .join(", ")
      : null;

  return (
    <div className="bg-card-bg border border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-card-foreground">Payment &amp; billing</h3>
      </div>
      {!details ? (
        <p className="text-sm text-muted">
          We couldn&apos;t load your billing details right now. You can still
          manage your card and billing info in the Stripe portal.
        </p>
      ) : (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Card</dt>
        <dd className="text-card-foreground font-medium">
          {cardLabel ? (
            <>
              {cardLabel}
              {expLabel && <span className="text-muted font-normal"> · {expLabel}</span>}
            </>
          ) : (
            <span className="text-muted font-normal">No card on file</span>
          )}
        </dd>

        <dt className="text-muted">Billing contact</dt>
        <dd className="text-card-foreground font-medium">
          {contact ?? <span className="text-muted font-normal">Not set yet</span>}
        </dd>

        {addressLine && (
          <>
            <dt className="text-muted">Billing address</dt>
            <dd className="text-card-foreground font-medium">{addressLine}</dd>
          </>
        )}

        {next_payment?.amount_cents != null && (
          <>
            <dt className="text-muted">Next charge</dt>
            <dd className="text-card-foreground font-medium">
              {formatMoney(next_payment.amount_cents, next_payment.currency)}
              {next_payment.date ? ` on ${formatDate(next_payment.date)}` : ""}
            </dd>
          </>
        )}
      </dl>
      )}

      <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onManage} disabled={portalPending}>
          {portalPending ? "Opening…" : "Manage in Stripe"}
        </Button>
      </div>
      <p className="text-xs text-muted mt-3">
        Update your card, billing contact, or address in the secure Stripe portal.
      </p>
    </div>
  );
}

// Shown in the Current Plan tab when the customer has no Stripe subscription.
// Every org holds the Free tier as a baseline comp grant, so this is their
// actual current plan — mirror the SubscriptionCard styling so it reads as one.
function FreePlanCard() {
  const badge = statusBadge("active");

  // Free's user allowance is feature_limits.max_customer_users, not a Stripe
  // seat quantity, so read it live from the same endpoint that drives the
  // seat pill on /account/users rather than hardcoding the number here.
  const [userCap, setUserCap] = useState<{ used: number; cap: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetchWithAuth("/api/billing/user-cap");
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelled) setUserCap(data);
      } catch {
        // Soft-fail — the card still reads correctly without the usage line.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirrors the "2 of 3 seats used" phrasing on Manage Users. Dashes until
  // the fetch lands (or if it failed) so we never assert a wrong number.
  const seatsLabel =
    userCap === null
      ? "—"
      : userCap.cap === null
        ? `${userCap.used} · uncapped`
        : `${userCap.used} of ${userCap.cap}`;

  return (
    <div className="bg-card-bg border border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Procurement Intelligence — Free</h3>
          <p className="text-muted text-sm">Included with your account · $0</p>
        </div>
        <span className={badge.className}>{badge.label}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Users</dt>
        <dd className="text-card-foreground font-medium">{seatsLabel}</dd>
        <dt className="text-muted">Price</dt>
        <dd className="text-card-foreground font-medium">Free</dd>
      </dl>
      <p className="text-sm text-muted mt-3">
        {userCap?.cap != null &&
          `The Free tier includes ${userCap.cap} user${userCap.cap === 1 ? "" : "s"}. `}
        Upgrade to Basic or Advanced for the full parts &amp; vendor library, bid
        matching, and up to 10 users.
      </p>
      <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-2">
        <Button href="/pricing" variant="primary" size="sm">
          Upgrade plan
        </Button>
      </div>
    </div>
  );
}

function SubscriptionCard({
  sub,
  plans,
  onChangeInterval,
  onSwitchPlan,
  onChangeSeats,
  onCancel,
  onReactivate,
}: {
  sub: Subscription;
  plans: Plan[];
  onChangeInterval: () => void;
  onSwitchPlan: () => void;
  onChangeSeats: () => void;
  onCancel: () => void;
  onReactivate: () => void;
}) {
  const badge = statusBadge(sub.status);
  const rawName = sub.product_name || sub.product_group_name || "Plan";
  const trialActive = sub.status === "trialing" && sub.trial_end && new Date(sub.trial_end) > new Date();
  const isTerminal = sub.status === "canceled" || sub.status === "incomplete_expired";
  // The date a pending cancellation takes effect. Stripe's cancel_at equals the
  // period end, which during a trial it reports only as trial_end — and rows
  // that never saw a period-bearing webhook payload have no window at all, so
  // fall back rather than render an empty value next to "Cancels on".
  const cancelDate = sub.current_period_end || sub.trial_end;
  // Stripe stamps `canceled_at` when a cancellation is *scheduled*, not when
  // service ends: scheduling a period-end cancel on Aug 1 for a plan that runs
  // to Aug 31 sets canceled_at=Aug 1 while the sub is still active. So show
  // "Cancels on" only while the cancel is pending, and "Ended" only once the
  // subscription has actually terminated — never both.
  const pendingCancel = sub.cancel_at_period_end && !isTerminal;
  const endedOn = sub.canceled_at || cancelDate;
  // Match by the robust plan_kind+plan_id identity when available, else by
  // name (older payloads may lack plan_kind/plan_id).
  const matchingPlan = plans.find((p) => {
    if (sub.plan_kind && sub.plan_id !== null) return p.kind === sub.plan_kind && p.id === sub.plan_id;
    if (sub.product_name && p.kind === "product") return p.name === sub.product_name;
    if (sub.product_group_name && p.kind === "product_group") return p.name === sub.product_group_name;
    return false;
  });
  // Display as "Procurement Intelligence — <tier>" using the clean
  // Free/Basic/Advanced tier label from the matching plan's key; fall back to
  // the raw plan name so a real paid plan is never hidden behind a guessed tier.
  const tierName = tierBadgeForKey(matchingPlan?.key)?.label;
  const planLabel = tierName ? `Procurement Intelligence — ${tierName}` : rawName;
  // The plan's seat cap (feature_limits.max_seat_count). When present we show
  // "used of cap"; otherwise just the provisioned seat count.
  const maxSeats = matchingPlan?.max_seat_count ?? null;
  const hasOtherIntervals = (matchingPlan?.prices.length ?? 0) > 1;
  // `sub.unit_amount_cents` is the raw per-unit Stripe price — 0 for tiered
  // prices (the real per-seat amounts live in `tiers`, not `unit_amount_cents`;
  // every current library tier and the RFQ add-on bills this way). Look up
  // the matching Price (which carries `tiers`) from `plans` and compute the
  // real period total at this subscription's seat count instead.
  const matchingPrice = matchingPlan?.prices.find((p) => p.interval_count === sub.interval_count) ?? null;
  // If we can't resolve a Price object, `sub.unit_amount_cents` is NOT a safe
  // fallback: for every tiered plan it's a placeholder 0, not a real price,
  // so falling back to it silently renders "$0.00" for a paid, non-free plan
  // (e.g. a product missing/disabled in GET /billing/plans — this bit a
  // trial customer in 2026-07 when the product's
  // `billing_enabled` flag was off). Only trust the raw field when it's
  // genuinely nonzero; otherwise treat the price as unknown.
  const totalCents = matchingPrice
    ? computeTotalCents(matchingPrice, sub.seat_quantity)
    : (sub.unit_amount_cents || null);
  // "Other plans available" = at least one swappable (non-add-on) plan that
  // isn't the current sub's plan. The Plan type lacks an id-key per kind, so
  // identify the current one by name.
  const otherPlansExist = plans.some((p) => {
    if (isAddonPlan(p)) return false;
    if (sub.product_name && p.kind === "product") return p.name !== sub.product_name;
    if (sub.product_group_name && p.kind === "product_group") return p.name !== sub.product_group_name;
    return true; // any cross-kind plan is also a candidate
  });

  return (
    <div className="bg-card-bg border border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">{planLabel}</h3>
          <p className="text-muted text-sm">
            {intervalLabel(sub.interval_count)}
            {" · "}
            {totalCents != null
              ? formatMoney(totalCents, matchingPrice?.currency ?? sub.currency)
              : "Price unavailable"}
          </p>
        </div>
        <span className={badge.className}>{badge.label}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Seats</dt>
        <dd className="text-card-foreground font-medium">
          {sub.seat_quantity} seat{sub.seat_quantity === 1 ? "" : "s"}
          {maxSeats != null && sub.seat_quantity < maxSeats && (
            <span className="text-muted font-normal"> · up to {maxSeats}</span>
          )}
        </dd>

        {trialActive && (
          <>
            <dt className="text-muted">Trial ends</dt>
            <dd className="text-card-foreground font-medium">{formatDate(sub.trial_end)}</dd>
          </>
        )}

        {/* During a trial the period end equals "Trial ends" above, so we
            hide this row to avoid showing the same date twice. Once the sub is
            active/paid it shows the real billing cycle. */}
        {!trialActive && (
          <>
            <dt className="text-muted">Current period</dt>
            <dd className="text-card-foreground font-medium">
              {formatDate(sub.current_period_start)} → {formatDate(sub.current_period_end)}
            </dd>
          </>
        )}

        {pendingCancel && (
          <>
            <dt className="text-muted">Cancels on</dt>
            <dd className="text-warning font-medium">
              {cancelDate ? formatDate(cancelDate) : "End of current period"}
            </dd>
          </>
        )}

        {isTerminal && endedOn && (
          <>
            <dt className="text-muted">Ended</dt>
            <dd className="text-card-foreground font-medium">{formatDate(endedOn)}</dd>
          </>
        )}
      </dl>

      {!isTerminal && (
        <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-2">
          {hasOtherIntervals && (
            <Button variant="outline" size="sm" onClick={onChangeInterval}>Change interval</Button>
          )}
          {otherPlansExist && (
            <Button variant="outline" size="sm" onClick={onSwitchPlan}>Change plan</Button>
          )}
          {/* Per-seat plans (those with a seat ceiling) can add/remove seats
              self-service. Flat plans (no max_seat_count) omit this. */}
          {maxSeats != null && (
            <Button variant="outline" size="sm" onClick={onChangeSeats}>Change seats</Button>
          )}
          {sub.cancel_at_period_end ? (
            <Button variant="outline" size="sm" onClick={onReactivate}>Reactivate</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onCancel}>Downgrade to Free</Button>
          )}
        </div>
      )}
    </div>
  );
}

function ModalShell({ title, subtitle, children, onClose }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[10001]">
      <div className="bg-card-bg border border-border rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function IntervalModal({
  sub, plans, onClose, onSaved, onError,
}: {
  sub: Subscription;
  plans: Plan[];
  onClose: () => void;
  onSaved: (s: Subscription) => void;
  onError: (msg: string | null) => void;
}) {
  // Find the matching plan and exclude the current price.
  const matchingPlan = useMemo(() => plans.find((p) => {
    if (sub.product_name && p.kind === "product") return p.name === sub.product_name;
    if (sub.product_group_name && p.kind === "product_group") return p.name === sub.product_group_name;
    return false;
  }), [plans, sub]);
  const otherPrices = (matchingPlan?.prices ?? []).filter((p) => p.interval_count !== sub.interval_count);

  const [selected, setSelected] = useState<number | null>(otherPrices[0]?.id ?? null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (selected === null) return;
    setSaving(true);
    onError(null);
    try {
      const resp = await fetchWithAuth(`/api/billing/subscriptions/${sub.id}/interval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_id: selected }),
      });
      const data = await resp.json();
      if (!resp.ok) { onError(data.error || "Failed to switch interval"); return; }
      onSaved(data);
    } catch {
      onError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Change billing interval" subtitle={sub.product_name || sub.product_group_name || "Plan"} onClose={onClose}>
      {otherPrices.length === 0 ? (
        <p className="text-sm text-muted">No other intervals are available for this plan.</p>
      ) : (
        <div className="space-y-2">
          {otherPrices.map((p) => (
            <label
              key={p.id}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                selected === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="interval-price"
                  checked={selected === p.id}
                  onChange={() => setSelected(p.id)}
                />
                <span className="text-sm font-medium text-card-foreground">{intervalLabel(p.interval_count)}</span>
              </div>
              <span className="text-sm text-muted">
                {(() => {
                  const c = computeTotalCents(p, sub.seat_quantity);
                  return c != null ? formatMoney(c, p.currency) : "Price unavailable";
                })()}
              </span>
            </label>
          ))}
          <p className="text-xs text-muted mt-2">
            Stripe will prorate the difference on your next invoice.
          </p>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={save} disabled={saving || selected === null || otherPrices.length === 0}>
          {saving ? "Switching…" : "Switch"}
        </Button>
      </div>
    </ModalShell>
  );
}

function SeatsModal({
  sub, plans, onClose, onSaved, onError,
}: {
  sub: Subscription;
  plans: Plan[];
  onClose: () => void;
  onSaved: (s: Subscription) => void;
  onError: (msg: string | null) => void;
}) {
  const matchingPlan = useMemo(() => plans.find((p) => {
    if (sub.plan_kind && sub.plan_id !== null) return p.kind === sub.plan_kind && p.id === sub.plan_id;
    if (sub.product_name && p.kind === "product") return p.name === sub.product_name;
    if (sub.product_group_name && p.kind === "product_group") return p.name === sub.product_group_name;
    return false;
  }), [plans, sub]);
  const maxSeats = matchingPlan?.max_seat_count ?? 10;

  const [qty, setQty] = useState<number>(sub.seat_quantity);
  const [saving, setSaving] = useState(false);
  const clamp = (n: number) => Math.max(1, Math.min(maxSeats, n));
  const unchanged = qty === sub.seat_quantity;

  const save = async () => {
    if (unchanged) return;
    setSaving(true);
    onError(null);
    try {
      const resp = await fetchWithAuth(`/api/billing/subscriptions/${sub.id}/seats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seat_quantity: qty }),
      });
      const data = await resp.json();
      if (!resp.ok) { onError(data.error || "Failed to change seats"); return; }
      onSaved(data);
    } catch {
      onError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Change seats"
      subtitle={sub.product_name || sub.product_group_name || "Plan"}
      onClose={onClose}
    >
      <p className="text-sm text-muted mb-4">
        Seats set how many users your team can have — every user gets your plan&apos;s
        tier. You&apos;re billed per seat; Stripe prorates the change on your next invoice.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setQty((q) => clamp(q - 1))}
          disabled={qty <= 1}
          className="w-9 h-9 rounded border border-border bg-card-bg text-card-foreground hover:border-primary/50 disabled:opacity-50"
          aria-label="Decrease seats"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={maxSeats}
          value={qty}
          onChange={(e) => setQty(clamp(Number(e.target.value) || 1))}
          className="w-20 px-2 py-1.5 text-center text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => setQty((q) => clamp(q + 1))}
          disabled={qty >= maxSeats}
          className="w-9 h-9 rounded border border-border bg-card-bg text-card-foreground hover:border-primary/50 disabled:opacity-50"
          aria-label="Increase seats"
        >
          +
        </button>
        <span className="text-xs text-muted">
          {qty === sub.seat_quantity ? "current" : `was ${sub.seat_quantity}`} · max {maxSeats}
        </span>
      </div>
      {qty < sub.seat_quantity && (
        <p className="text-[11px] text-muted mt-3">
          Reducing seats below your active user count is blocked — deactivate users on the
          Manage Users page first.
        </p>
      )}
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={save} disabled={saving || unchanged}>
          {saving ? "Saving…" : "Update seats"}
        </Button>
      </div>
    </ModalShell>
  );
}

function SwitchPlanModal({
  sub, plans, onClose, onSaved, onError,
}: {
  sub: Subscription;
  plans: Plan[];
  onClose: () => void;
  onSaved: (s: Subscription) => void;
  onError: (msg: string | null) => void;
}) {
  // Filter out add-ons (they stack alongside a plan, never replace it — see
  // the "Add-ons" section instead) and the plan the customer is already on.
  // Match by plan_kind+plan_id when available, otherwise fall back to product name.
  const otherPlans = useMemo(() => plans.filter((p) => {
    if (isAddonPlan(p)) return false;
    if (sub.plan_kind && sub.plan_id !== null) {
      return !(p.kind === sub.plan_kind && p.id === sub.plan_id);
    }
    if (sub.product_name && p.kind === "product") return p.name !== sub.product_name;
    if (sub.product_group_name && p.kind === "product_group") return p.name !== sub.product_group_name;
    return true;
  }), [plans, sub.plan_kind, sub.plan_id, sub.product_name, sub.product_group_name]);

  // Default selection: first plan, first price matching current interval if any.
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(() => {
    const first = otherPlans[0];
    return first ? `${first.kind}-${first.id}` : "";
  });
  const selectedPlan = otherPlans.find((p) => `${p.kind}-${p.id}` === selectedPlanKey) ?? null;

  const [selectedPriceId, setSelectedPriceId] = useState<number | null>(() => {
    const first = otherPlans[0];
    if (!first) return null;
    const sameInterval = first.prices.find((pr) => pr.interval_count === sub.interval_count);
    return (sameInterval ?? first.prices[0])?.id ?? null;
  });

  // Whenever the selected plan changes, reset the price to the same-interval
  // option if it exists, else the first price.
  useEffect(() => {
    if (!selectedPlan) {
      setSelectedPriceId(null);
      return;
    }
    const sameInterval = selectedPlan.prices.find((pr) => pr.interval_count === sub.interval_count);
    setSelectedPriceId((sameInterval ?? selectedPlan.prices[0])?.id ?? null);
  }, [selectedPlanKey, selectedPlan, sub.interval_count]);

  const [saving, setSaving] = useState(false);

  const selectedPrice = selectedPlan?.prices.find((p) => p.id === selectedPriceId) ?? null;

  const save = async () => {
    if (selectedPriceId === null) return;
    setSaving(true);
    onError(null);
    try {
      const resp = await fetchWithAuth(`/api/billing/subscriptions/${sub.id}/switch-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_id: selectedPriceId }),
      });
      const data = await resp.json();
      if (!resp.ok) { onError(data.error || "Failed to switch plan"); return; }
      onSaved(data);
    } catch {
      onError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Change plan"
      subtitle={`Current: ${sub.product_name || sub.product_group_name || "Plan"} · ${sub.seat_quantity} seat${sub.seat_quantity === 1 ? "" : "s"}`}
      onClose={onClose}
    >
      {otherPlans.length === 0 ? (
        <p className="text-sm text-muted">No other plans are available.</p>
      ) : (
        <>
          <label className="block text-sm text-card-foreground mb-2">Plan</label>
          <select
            value={selectedPlanKey}
            onChange={(e) => setSelectedPlanKey(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary mb-4"
          >
            {otherPlans.map((p) => (
              <option key={`${p.kind}-${p.id}`} value={`${p.kind}-${p.id}`}>
                {p.name}
              </option>
            ))}
          </select>

          {selectedPlan && selectedPlan.prices.length > 0 && (
            <>
              <label className="block text-sm text-card-foreground mb-2">Billing interval</label>
              <div className="space-y-2 mb-4">
                {selectedPlan.prices.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPriceId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="switch-plan-price"
                        checked={selectedPriceId === p.id}
                        onChange={() => setSelectedPriceId(p.id)}
                      />
                      <span className="text-sm font-medium text-card-foreground">{intervalLabel(p.interval_count)}</span>
                    </div>
                    <span className="text-sm text-muted">
                      {(() => {
                        const c = computeTotalCents(p, sub.seat_quantity);
                        return c != null ? formatMoney(c, p.currency) : "Price unavailable";
                      })()}
                    </span>
                  </label>
                ))}
              </div>

              {selectedPrice && (
                <div className="bg-muted-light/40 border border-border rounded-lg p-3 mb-4 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Seats stay at</span>
                    <span className="text-card-foreground font-medium">{sub.seat_quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">New total</span>
                    <span className="text-card-foreground font-medium">
                      {(() => {
                        const c = computeTotalCents(selectedPrice, sub.seat_quantity);
                        return c != null ? formatMoney(c, selectedPrice.currency) : "Price unavailable";
                      })()}
                      {" "}{intervalLabel(selectedPrice.interval_count).toLowerCase()}
                    </span>
                  </div>
                  <p className="text-muted pt-1">
                    Stripe will prorate the difference on your next invoice. Period dates will be recalculated.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          onClick={save}
          disabled={saving || selectedPriceId === null || otherPlans.length === 0}
        >
          {saving ? "Switching…" : "Switch plan"}
        </Button>
      </div>
    </ModalShell>
  );
}

// 'feature'-category add-on card (e.g. request_for_quote). Shows a starting
// price at the plan's default seat count; exact price is picked in the modal.
function AddonCard({ plan, onAdd }: { plan: Plan; onAdd: () => void }) {
  const price = plan.prices[0] ?? null;
  const seatCount = plan.default_seat_count ?? 1;
  const total = price ? computeTotalCents(price, seatCount) : null;
  return (
    <div className="bg-card-bg border border-border rounded-xl p-6">
      <h3 className="text-lg font-semibold text-card-foreground">{plan.name}</h3>
      {plan.description && <p className="text-muted text-sm mt-1">{plan.description}</p>}
      {price && total !== null && (
        <p className="text-sm text-muted mt-3">
          From {formatPriceMoney(total, price.currency)}{" "}
          {priceIntervalLabel(price.interval_count).toLowerCase()}
          {plan.requires_seat_assignment && ` for ${seatCount} seat${seatCount === 1 ? "" : "s"}`}
        </p>
      )}
      <div className="mt-5 pt-4 border-t border-border">
        <Button variant="primary" size="sm" onClick={onAdd}>Add to your account</Button>
      </div>
    </div>
  );
}

// Purchases a 'feature'-category add-on as an independent second Stripe
// subscription (POST /billing/checkout-session) — the same mechanism
// /pricing uses for "existing customer adding a sub". Never touches the
// customer's existing plan subscription(s).
function AddAddonModal({
  plan, onClose, onError,
}: {
  plan: Plan;
  onClose: () => void;
  onError: (msg: string | null) => void;
}) {
  const prices = plan.prices; // pre-ordered by interval_count (GET /billing/plans)
  const maxSeats = plan.max_seat_count ?? (prices[0] ? maxPickerSeats(prices[0]) : 10);

  const [seatQty, setSeatQty] = useState(() => Math.max(1, Math.min(plan.default_seat_count ?? 1, maxSeats)));
  const [selectedPriceId, setSelectedPriceId] = useState<number | null>(prices[0]?.id ?? null);
  const [showTos, setShowTos] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  // null = still loading; default to "needs acceptance" (show the modal)
  // until we hear otherwise, so a slow/failed status check never silently
  // skips consent.
  const [needsTosAcceptance, setNeedsTosAcceptance] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetchWithAuth("/api/billing/tos-status");
        const data = await resp.json();
        if (!cancelled) setNeedsTosAcceptance(resp.ok ? Boolean(data.needs_acceptance) : true);
      } catch {
        if (!cancelled) setNeedsTosAcceptance(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const clamp = (n: number) => Math.max(1, Math.min(maxSeats, n));
  const selectedPrice = prices.find((p) => p.id === selectedPriceId) ?? null;
  const total = selectedPrice ? computeTotalCents(selectedPrice, seatQty) : null;

  // tosVersion/tosAcceptedAt are omitted when the customer already has a
  // current-version acceptance on file (GET /billing/tos-status) — the
  // backend treats that the same as an admin-initiated checkout: no new
  // consent required, no new audit row written.
  const startCheckout = async (tosVersion?: string, tosAcceptedAt?: string) => {
    if (selectedPriceId === null) return;
    setCheckoutPending(true);
    onError(null);
    try {
      const resp = await fetchWithAuth("/api/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: selectedPriceId,
          seat_quantity: seatQty,
          ...(tosVersion && tosAcceptedAt
            ? { tos_version: tosVersion, tos_accepted_at: tosAcceptedAt }
            : {}),
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.checkout_url) {
        onError(data.error || "Failed to start checkout");
        setCheckoutPending(false);
        setShowTos(false);
        return;
      }
      window.location.href = data.checkout_url;
    } catch {
      onError("An unexpected error occurred");
      setCheckoutPending(false);
      setShowTos(false);
    }
  };

  // The ToS confirm step reuses the same component /pricing uses, rendered
  // in place of the picker (not nested inside it) to avoid stacking two
  // differently-z-indexed modal shells at once.
  if (showTos) {
    const summary = selectedPrice && total !== null
      ? `${plan.name} · ${seatQty} seat${seatQty === 1 ? "" : "s"} · ${formatPriceMoney(total, selectedPrice.currency)} ${priceIntervalLabel(selectedPrice.interval_count).toLowerCase()}`
      : plan.name;
    return (
      <TermsAcceptanceModal
        isOpen
        onCancel={() => { if (checkoutPending) return; setShowTos(false); }}
        onConfirm={startCheckout}
        planSummary={summary}
        pending={checkoutPending}
      />
    );
  }

  return (
    <ModalShell
      title={`Add ${plan.name}`}
      subtitle="Billed as a separate subscription alongside your current plan"
      onClose={onClose}
    >
      {plan.description && <p className="text-sm text-muted mb-4">{plan.description}</p>}

      {plan.requires_seat_assignment && (
        <>
          <label className="block text-sm text-card-foreground mb-2">Seats</label>
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setSeatQty((q) => clamp(q - 1))}
              disabled={seatQty <= 1}
              className="w-9 h-9 rounded border border-border bg-card-bg text-card-foreground hover:border-primary/50 disabled:opacity-50"
              aria-label="Decrease seats"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={maxSeats}
              value={seatQty}
              onChange={(e) => setSeatQty(clamp(Number(e.target.value) || 1))}
              className="w-20 px-2 py-1.5 text-center text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setSeatQty((q) => clamp(q + 1))}
              disabled={seatQty >= maxSeats}
              className="w-9 h-9 rounded border border-border bg-card-bg text-card-foreground hover:border-primary/50 disabled:opacity-50"
              aria-label="Increase seats"
            >
              +
            </button>
            <span className="text-xs text-muted">max {maxSeats}</span>
          </div>
        </>
      )}

      {prices.length > 1 && (
        <>
          <label className="block text-sm text-card-foreground mb-2">Billing interval</label>
          <div className="space-y-2 mb-4">
            {prices.map((p) => {
              const priceTotal = computeTotalCents(p, seatQty);
              return (
                <label
                  key={p.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPriceId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="addon-price"
                      checked={selectedPriceId === p.id}
                      onChange={() => setSelectedPriceId(p.id)}
                    />
                    <span className="text-sm font-medium text-card-foreground">{priceIntervalLabel(p.interval_count)}</span>
                  </div>
                  <span className="text-sm text-muted">
                    {priceTotal !== null ? formatPriceMoney(priceTotal, p.currency) : "Price unavailable"}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}

      {selectedPrice && total !== null && (
        <div className="bg-muted-light/40 border border-border rounded-lg p-3 mb-4 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Total</span>
            <span className="text-card-foreground font-medium">
              {formatPriceMoney(total, selectedPrice.currency)} {priceIntervalLabel(selectedPrice.interval_count).toLowerCase()}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => (needsTosAcceptance === false ? startCheckout() : setShowTos(true))}
          disabled={selectedPriceId === null || checkoutPending || needsTosAcceptance === null}
        >
          {checkoutPending ? "Starting…" : needsTosAcceptance === null ? "Checking…" : "Continue"}
        </Button>
      </div>
    </ModalShell>
  );
}

function CloseAccountModal({
  onClose, onClosed, onError,
}: {
  onClose: () => void;
  onClosed: () => void | Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);
  const canConfirm = confirmText.trim().toUpperCase() === "CLOSE";

  const save = async () => {
    if (!canConfirm) return;
    setSaving(true);
    onError(null);
    try {
      const resp = await fetchWithAuth("/api/billing/close-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) { onError(data.error || "Failed to close account"); setSaving(false); return; }
      await onClosed();
    } catch {
      onError("An unexpected error occurred");
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Close account" subtitle="Deactivates your whole account" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-muted">
          This <span className="font-medium text-card-foreground">deactivates your organization&apos;s account</span>:
        </p>
        <ul className="list-disc list-inside text-xs text-muted space-y-1">
          <li>Your paid subscription is canceled and billing stops.</li>
          <li>Every user is signed out and can no longer log in.</li>
          <li>Your data is <span className="font-medium text-card-foreground">preserved, not deleted</span> — contact support to reopen.</li>
        </ul>
        <p className="text-xs text-muted">
          Just want to stop paying? Use <span className="font-medium">Downgrade to Free</span> instead — it keeps your account active.
        </p>
        <div>
          <label className="block text-xs text-muted mb-1">
            Type <span className="font-semibold text-card-foreground">CLOSE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="CLOSE"
            className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-error"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          className="bg-error hover:bg-error/90 border-error"
          onClick={save}
          disabled={saving || !canConfirm}
        >
          {saving ? "Closing…" : "Close account"}
        </Button>
      </div>
    </ModalShell>
  );
}

function CancelModal({
  sub, onClose, onSaved, onError,
}: {
  sub: Subscription;
  onClose: () => void;
  onSaved: (s: Subscription) => void;
  onError: (msg: string | null) => void;
}) {
  const [atPeriodEnd, setAtPeriodEnd] = useState(true);
  const [saving, setSaving] = useState(false);
  // Same fallback as SubscriptionCard: trialing subs carry the period end only
  // as trial_end, and a row with no window at all must not render "until —".
  const periodEnd = sub.current_period_end || sub.trial_end;

  const save = async () => {
    setSaving(true);
    onError(null);
    try {
      const resp = await fetchWithAuth(`/api/billing/subscriptions/${sub.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ at_period_end: atPeriodEnd }),
      });
      const data = await resp.json();
      if (!resp.ok) { onError(data.error || "Failed to cancel"); return; }
      onSaved(data);
    } catch {
      onError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Downgrade to Free" subtitle={sub.product_name || sub.product_group_name || "Plan"} onClose={onClose}>
      <p className="text-sm text-muted mb-2">
        Ending your paid plan moves your account to the <span className="font-medium text-card-foreground">Free tier</span> — it doesn&apos;t close your account.
      </p>
      <p className="text-xs text-muted mb-3">
        You keep your account and data. Bid-matching profiles beyond the Free limit are paused (not deleted), and you can re-upgrade anytime to bring them back.
      </p>
      <div className="space-y-2">
        <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
          atPeriodEnd ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}>
          <input type="radio" checked={atPeriodEnd} onChange={() => setAtPeriodEnd(true)} className="mt-0.5" />
          <div>
            <div className="text-sm font-medium text-card-foreground">At end of current period</div>
            <div className="text-xs text-muted mt-0.5">
              Keep your paid features until {periodEnd ? formatDate(periodEnd) : "the end of your current period"}, then move to Free automatically.
            </div>
          </div>
        </label>
        <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
          !atPeriodEnd ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}>
          <input type="radio" checked={!atPeriodEnd} onChange={() => setAtPeriodEnd(false)} className="mt-0.5" />
          <div>
            <div className="text-sm font-medium text-card-foreground">Move to Free now</div>
            <div className="text-xs text-muted mt-0.5">
              Drop to the Free tier immediately. No refund of the current period — see Stripe&apos;s policy for prorated credit.
            </div>
          </div>
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Keep my plan</Button>
        <Button variant="primary" size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : (atPeriodEnd ? "Schedule downgrade" : "Move to Free now")}
        </Button>
      </div>
    </ModalShell>
  );
}
