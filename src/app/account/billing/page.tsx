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

type Price = {
  id: number;
  stripe_price_id: string;
  interval_unit: string;
  interval_count: number;
  unit_amount_cents: number;
  currency: string;
};

type Plan = {
  kind: "product" | "product_group";
  id: number;
  key: string;
  name: string;
  prices: Price[];
  // Hard cap on seats for this plan (from feature_limits.max_seat_count).
  // null = uncapped.
  max_seat_count: number | null;
};

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

type PaymentMethodStatus = {
  is_subscriber: boolean;
  has_payment_method: boolean;
  subscription_status: string | null;
  trial_end: string | null;
  days_remaining: number | null;
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
  | { kind: "cancel"; sub: Subscription }
  | null;

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading…</div>}>
      <BillingPageContent />
    </Suspense>
  );
}

function BillingPageContent() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const checkoutFlag = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pmStatus, setPmStatus] = useState<PaymentMethodStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalPending, setPortalPending] = useState(false);
  const [modal, setModal] = useState<ActiveModal>(null);
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
      const [subsResp, invsResp, plansResp, pmResp] = await Promise.all([
        fetchWithAuth("/api/billing/subscriptions"),
        fetchWithAuth("/api/billing/invoices"),
        fetch("/api/billing/plans"),
        fetchWithAuth("/api/billing/payment-method-status"),
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

  // Poll once after a Stripe redirect so the webhook has time to provision.
  useEffect(() => {
    if (checkoutFlag !== "success") return;
    if (subscriptions.length > 0) return;
    if (isLoading) return;
    const timer = setTimeout(loadData, 2000);
    return () => clearTimeout(timer);
  }, [checkoutFlag, subscriptions.length, isLoading, loadData]);

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

  // Trial-state banner drivers.
  const isTrialing = pmStatus?.subscription_status === "trialing";
  const trialingNoCard = !!pmStatus && pmStatus.is_subscriber && isTrialing && !pmStatus.has_payment_method;
  const trialingWithCard = !!pmStatus && pmStatus.is_subscriber && isTrialing && pmStatus.has_payment_method;

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

  return (
    <>
      {/* Trial-state banner. Urgent (warning) for trialing customers without a
          card on file — the trial will cancel at the deadline. Soft (info) for
          trialing customers who already have a card — they're set, just
          informing them when the first charge lands. */}
      {trialingNoCard && (
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Your trial ends {trialDeadlineSentence(pmStatus?.days_remaining)}.
            </p>
            <p className="mt-1 text-muted">
              Add a payment method to keep your access — without one, your subscription will cancel automatically when the trial ends.
            </p>
          </div>
          <Button onClick={openPortal} disabled={portalPending}>
            {portalPending ? "Opening…" : "Add Payment Method"}
          </Button>
        </div>
      )}
      {trialingWithCard && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <span className="font-medium">Trial ends {trialDeadlineSentence(pmStatus?.days_remaining)}</span>
          <span className="text-muted"> — you&apos;ll be auto-charged once it does.</span>
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
          {hasStripeCustomer && (
            <Button
              variant="outline"
              size="sm"
              onClick={openPortal}
              disabled={portalPending}
            >
              {portalPending ? "Opening…" : "Manage payment method"}
            </Button>
          )}
          {/* Hide "View plans" for trialing customers without a card — picking
              a plan there creates a duplicate Stripe subscription instead of
              adding a card. Banner above directs them to the Customer Portal. */}
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
          <div className="bg-card-bg border border-border rounded-xl p-6 mb-8">
            <p className="text-muted text-sm">You don&apos;t have an active plan yet.</p>
            <div className="mt-4">
              <Button href="/pricing" variant="primary" size="sm">
                Browse plans
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {subscriptions.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                plans={plans}
                onChangeInterval={() => setModal({ kind: "interval", sub })}
                onSwitchPlan={() => setModal({ kind: "switchPlan", sub })}
                onCancel={() => setModal({ kind: "cancel", sub })}
                onReactivate={() => reactivate(sub)}
              />
            ))}
          </div>
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

      <div className="mt-6 text-xs text-muted">
        Back to <Link href="/account" className="text-primary hover:underline">Account</Link>.
      </div>

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
      {modal?.kind === "cancel" && (
        <CancelModal
          sub={modal.sub}
          onClose={() => setModal(null)}
          onSaved={(next) => { replaceSub(next); setModal(null); }}
          onError={setError}
        />
      )}
    </>
  );
}

function SubscriptionCard({
  sub,
  plans,
  onChangeInterval,
  onSwitchPlan,
  onCancel,
  onReactivate,
}: {
  sub: Subscription;
  plans: Plan[];
  onChangeInterval: () => void;
  onSwitchPlan: () => void;
  onCancel: () => void;
  onReactivate: () => void;
}) {
  const badge = statusBadge(sub.status);
  const rawName = sub.product_name || sub.product_group_name || "Plan";
  const trialActive = sub.status === "trialing" && sub.trial_end && new Date(sub.trial_end) > new Date();
  const isTerminal = sub.status === "canceled" || sub.status === "incomplete_expired";
  // Match by the robust plan_kind+plan_id identity when available, else by
  // name (older payloads may lack plan_kind/plan_id).
  const matchingPlan = plans.find((p) => {
    if (sub.plan_kind && sub.plan_id !== null) return p.kind === sub.plan_kind && p.id === sub.plan_id;
    if (sub.product_name && p.kind === "product") return p.name === sub.product_name;
    if (sub.product_group_name && p.kind === "product_group") return p.name === sub.product_group_name;
    return false;
  });
  // Prefer a clean Free/Basic/Advanced tier label from the matching plan's
  // key; fall back to the raw plan name so a real paid plan is never hidden
  // behind a guessed tier.
  const planLabel = tierBadgeForKey(matchingPlan?.key)?.label ?? rawName;
  // The plan's seat cap (feature_limits.max_seat_count). When present we show
  // "used of cap"; otherwise just the provisioned seat count.
  const maxSeats = matchingPlan?.max_seat_count ?? null;
  const hasOtherIntervals = (matchingPlan?.prices.length ?? 0) > 1;
  // "Other plans available" = at least one plan that isn't the current sub's plan.
  // The Plan type lacks an id-key per kind, so identify the current one by name.
  const otherPlansExist = plans.some((p) => {
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
            {formatMoney(sub.unit_amount_cents, sub.currency)} / seat
          </p>
        </div>
        <span className={badge.className}>{badge.label}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Seats</dt>
        <dd className="text-card-foreground font-medium">
          {maxSeats != null ? `${sub.seat_quantity} of ${maxSeats}` : sub.seat_quantity}
        </dd>

        {trialActive && (
          <>
            <dt className="text-muted">Trial ends</dt>
            <dd className="text-card-foreground font-medium">{formatDate(sub.trial_end)}</dd>
          </>
        )}

        <dt className="text-muted">Current period</dt>
        <dd className="text-card-foreground font-medium">
          {formatDate(sub.current_period_start)} → {formatDate(sub.current_period_end)}
        </dd>

        {sub.cancel_at_period_end && (
          <>
            <dt className="text-muted">Cancels on</dt>
            <dd className="text-warning font-medium">{formatDate(sub.current_period_end)}</dd>
          </>
        )}

        {sub.canceled_at && (
          <>
            <dt className="text-muted">Canceled</dt>
            <dd className="text-card-foreground font-medium">{formatDate(sub.canceled_at)}</dd>
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
          {sub.cancel_at_period_end ? (
            <Button variant="outline" size="sm" onClick={onReactivate}>Reactivate</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel subscription</Button>
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
                {formatMoney(p.unit_amount_cents, p.currency)} / seat
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

function SwitchPlanModal({
  sub, plans, onClose, onSaved, onError,
}: {
  sub: Subscription;
  plans: Plan[];
  onClose: () => void;
  onSaved: (s: Subscription) => void;
  onError: (msg: string | null) => void;
}) {
  // Filter out the plan the customer is already on. Match by plan_kind+plan_id
  // when available, otherwise fall back to product name.
  const otherPlans = useMemo(() => plans.filter((p) => {
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
                      {formatMoney(p.unit_amount_cents, p.currency)} / seat
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
                      {formatMoney(selectedPrice.unit_amount_cents * sub.seat_quantity, selectedPrice.currency)}
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
    <ModalShell title="Cancel subscription" subtitle={sub.product_name || sub.product_group_name || "Plan"} onClose={onClose}>
      <p className="text-sm text-muted mb-3">
        Choose when to end your subscription. You can reactivate anytime before the cancellation takes effect.
      </p>
      <div className="space-y-2">
        <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
          atPeriodEnd ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}>
          <input type="radio" checked={atPeriodEnd} onChange={() => setAtPeriodEnd(true)} className="mt-0.5" />
          <div>
            <div className="text-sm font-medium text-card-foreground">At end of current period</div>
            <div className="text-xs text-muted mt-0.5">
              Keep access until {formatDate(sub.current_period_end)}, then cancel automatically.
            </div>
          </div>
        </label>
        <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
          !atPeriodEnd ? "border-error bg-error/5" : "border-border hover:border-error/50"
        }`}>
          <input type="radio" checked={!atPeriodEnd} onChange={() => setAtPeriodEnd(false)} className="mt-0.5" />
          <div>
            <div className="text-sm font-medium text-card-foreground">Cancel immediately</div>
            <div className="text-xs text-muted mt-0.5">
              Access ends now. No refund of the current period — see Stripe&apos;s policy for prorated credit.
            </div>
          </div>
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Keep subscription</Button>
        <Button variant="primary" size="sm" onClick={save} disabled={saving}>
          {saving ? "Cancelling…" : (atPeriodEnd ? "Schedule cancellation" : "Cancel now")}
        </Button>
      </div>
    </ModalShell>
  );
}
