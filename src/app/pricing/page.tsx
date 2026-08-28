"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TermsAcceptanceModal } from "@/components/billing/TermsAcceptanceModal";
import { clearPendingSignup, readPendingSignup } from "@/lib/signup/pendingSignup";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { ChartIcon, CheckIcon, TargetIcon, ZapIcon } from "@/components/icons";
import { ANALYTICS_PRODUCT_KEY } from "@/lib/analytics/tier";
import {
  type Price,
  formatMoney,
  intervalLabel,
  findVolumeTier,
  computeTotalCents,
  maxPickerSeats,
  perMonthSuffix,
} from "@/lib/billing/pricing";

// Minimal shape of a Subscription row from /api/billing/subscriptions —
// only the fields the pricing page needs to identify the user's current plan.
type CurrentSub = {
  status: string;
  plan_kind: "product" | "product_group" | null;
  plan_id: number | null;
};

// Statuses that count as "currently on this plan" for the pricing-page badge.
// Must mirror the backend access-granting set in src/billing/grants.py:_GRANT_STATUSES.
const CURRENT_SUB_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "active_check",
]);

// Add-ons stack alongside a paid tier (see the RFQ panel + /account/billing's
// "Add-ons" section) — never shown as a tier-grid card, never a plan pick.
const isAddonPlan = (p: Plan) => p.kind === "product" && p.category === "feature";

type Plan = {
  kind: "product" | "product_group";
  id: number;
  key: string;
  name: string;
  description: string | null;
  // products.category ('service' | 'feature' | ...). product_groups always
  // come back null. 'feature' products (e.g. request_for_quote) are add-ons,
  // not tiers — excluded from the tier grid and instead get their own panel
  // below it; see isAddonPlan.
  category: string | null;
  default_seat_count: number | null;
  default_trial_days: number | null;
  // Access model only — NOT the billing model. FALSE = org-wide (every user
  // under the customer inherits the tier). The seat picker's visibility keys
  // off the price being tiered / having a seat ceiling, not this flag, because
  // paid tiers are org-wide-access AND per-seat-billed at the same time.
  requires_seat_assignment: boolean;
  // Stripe-Dashboard-set default price for this product. When present, the
  // pricing page pre-selects this price instead of the cheapest interval.
  default_price_id: number | null;
  prices: Price[];
  // From products/product_groups.feature_limits JSONB (set in admin
  // /billing/settings). When set, clamp the seat picker at this value and
  // surface a "Contact sales" CTA. null = uncapped.
  max_seat_count: number | null;
  max_customer_users: number | null;
};

// Split "Parts and Vendor Library — Advanced" into family + tier so the
// pricing card can render the tier as a small pill next to the family name —
// same pattern as the landing-page Products component. Names without an
// em-dash come back with tier=null.
function splitFamilyTier(name: string): { family: string; tier: string | null } {
  const match = name.match(/^(.+?)\s*—\s*(.+)$/);
  if (match) {
    return { family: match[1].trim(), tier: match[2].trim() };
  }
  return { family: name, tier: null };
}

// Display-order priority for tier names. Stripe has no reliable
// display-order field on products, so we sort here. Lower = earlier.
// Unknown tiers fall to the end in alphabetical order.
const TIER_DISPLAY_ORDER: Record<string, number> = {
  basic: 1,
  advanced: 2,
};

function tierSortKey(plan: Plan): number {
  const tier = splitFamilyTier(plan.name).tier?.toLowerCase();
  if (!tier) return 99;
  return TIER_DISPLAY_ORDER[tier] ?? 50;
}

// Which tier wears the "Most Popular" badge. Single source of truth — if
// you change which plan to highlight, change this string.
const MOST_POPULAR_TIER = "advanced";

function isMostPopular(plan: Plan): boolean {
  return splitFamilyTier(plan.name).tier?.toLowerCase() === MOST_POPULAR_TIER;
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading…</div>}>
      <PricingPageContent />
    </Suspense>
  );
}

function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  // Plan + seat passthrough from /signup or /pricing self-link. Used to
  // pre-select what the customer was looking at before they got bounced
  // through signup.
  const planParam = searchParams.get("plan");      // numeric ProductPrice.id
  const seatsParam = searchParams.get("seats");    // numeric seat count

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  // Seat count picker state, keyed by plan id. Initialized lazily once plans
  // load so we can use the plan's default_seat_count (or 1).
  const [seats, setSeats] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState<number | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  // Logged-in user's currently-active subscription (if any). Used to badge
  // their plan and route the card's CTA to the Stripe Customer Portal
  // instead of starting a duplicate Checkout.
  const [currentSub, setCurrentSub] = useState<CurrentSub | null>(null);
  const [portalPending, setPortalPending] = useState(false);
  // Captured when the user clicks Subscribe; consumed by the ToS modal's
  // confirm handler to fire the actual checkout request. Null while no
  // modal is open.
  const [tosPending, setTosPending] = useState<{
    plan: Plan;
    priceId: number;
    seatCount: number;
  } | null>(null);
  // Whether the logged-in customer already has a current-version ToS
  // acceptance on file (from signup or an earlier purchase) — lets an
  // existing customer subscribing to another plan/add-on skip re-consenting.
  // null = unknown/loading; treated as "needs acceptance" until known so a
  // slow/failed check never silently skips consent. Irrelevant for
  // anonymous visitors, who always go through /signup first anyway.
  const [needsTosAcceptance, setNeedsTosAcceptance] = useState<boolean | null>(null);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/plans");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to load plans");
        return;
      }
      setPlans(data);
      // Default selection priority per plan:
      //   1. ?plan=<priceId> URL param matching one of this plan's prices
      //      (lets a visitor bounced through /signup land on the same
      //      price they originally clicked Subscribe on).
      //   2. plan.default_price_id (set in Stripe Dashboard → Product →
      //      Default price) — admin-controlled override of cadence.
      //   3. The first/cheapest-interval price in the list.
      const defaults: Record<number, number> = {};
      const seatDefaults: Record<number, number> = {};
      const requestedPriceId = planParam ? Number(planParam) : null;
      const requestedSeats = seatsParam ? Math.max(1, Number(seatsParam)) : null;
      for (const p of data as Plan[]) {
        if (p.prices.length > 0) {
          const matchedRequested =
            requestedPriceId && p.prices.find((pr) => pr.id === requestedPriceId);
          const matchedDefault =
            p.default_price_id && p.prices.find((pr) => pr.id === p.default_price_id);
          defaults[p.id] = matchedRequested
            ? matchedRequested.id
            : matchedDefault
              ? matchedDefault.id
              : p.prices[0].id;
        }
        // Apply seat passthrough only to the plan that owns the requested
        // price; other plans keep their default.
        const ownsRequested =
          requestedPriceId && p.prices.some((pr) => pr.id === requestedPriceId);
        seatDefaults[p.id] = ownsRequested && requestedSeats
          ? requestedSeats
          : Math.max(1, p.default_seat_count || 1);
      }
      setSelected(defaults);
      setSeats(seatDefaults);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Fetch the user's current TIER subscription once we know they're logged
  // in. Used to badge "Currently on this plan" / swap the Subscribe CTA for
  // "Manage in portal" on the matching plan card, AND to gate the RFQ
  // add-on panel below (only a paid-tier customer can add it). Waits for
  // `plans` so add-on subscriptions (e.g. request_for_quote) can be told
  // apart from tier subscriptions and excluded — otherwise a customer who
  // adds the RFQ add-on after their tier could have it picked as
  // "currentSub" since /billing/subscriptions returns most-recent-first.
  useEffect(() => {
    if (authLoading || !user) {
      setCurrentSub(null);
      return;
    }
    if (plans.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetchWithAuth("/api/billing/subscriptions");
        if (cancelled) return;
        if (!resp.ok) {
          setCurrentSub(null);
          return;
        }
        const data = await resp.json();
        if (!Array.isArray(data)) {
          setCurrentSub(null);
          return;
        }
        const active = (data as CurrentSub[]).find((s) => {
          if (!CURRENT_SUB_STATUSES.has(s.status) || s.plan_id === null) return false;
          const matchedPlan = plans.find((p) => p.kind === s.plan_kind && p.id === s.plan_id);
          return !matchedPlan || !isAddonPlan(matchedPlan);
        });
        setCurrentSub(active || null);
      } catch {
        if (!cancelled) setCurrentSub(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, plans]);

  // Whether an already-logged-in customer can skip re-consenting to the ToS
  // on this purchase — irrelevant for anonymous visitors (they always go
  // through /signup, which requires fresh consent).
  useEffect(() => {
    if (authLoading || !user) {
      setNeedsTosAcceptance(null);
      return;
    }
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
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

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

  const isCurrentPlan = (plan: Plan): boolean =>
    !!currentSub && currentSub.plan_kind === plan.kind && currentSub.plan_id === plan.id;

  const resendVerification = async () => {
    if (!user?.email) return;
    setResendingVerification(true);
    setResendMessage(null);
    try {
      const resp = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
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
      setResendingVerification(false);
    }
  };

  const handleSubscribe = (plan: Plan) => {
    const priceId = selected[plan.id];
    if (!priceId) return;
    // Mirror the card's per-seat vs flat gate: flat plans (free / per_unit
    // single-license) always bill quantity=1; per-seat plans send the picker
    // value. Keeps a flat plan's default_seat_count from multiplying the price.
    const activePrice = plan.prices.find((p) => p.id === priceId);
    const billsPerSeat =
      activePrice?.billing_scheme === "tiered" ||
      (plan.max_seat_count != null && plan.max_customer_users == null);
    const seatCount = billsPerSeat
      ? Math.max(1, seats[plan.id] || plan.default_seat_count || 1)
      : 1;
    // Tier slug (basic / advanced / …) lets /signup show a specific
    // "Parts and Vendor Library — <Tier>" badge instead of the generic
    // "the plan you selected". Pulled from the plan name via the same
    // splitter the card uses.
    const tierSlug = splitFamilyTier(plan.name).tier?.toLowerCase();

    // Anonymous visitors who haven't started /signup get bounced there
    // first — no point opening the consent modal yet, since they'll
    // re-consent right after signup completes anyway.
    if (!authLoading && !user && !readPendingSignup()) {
      const next = `/pricing?plan=${priceId}&seats=${seatCount}`;
      const qs = new URLSearchParams({
        plan: String(priceId),
        seats: String(seatCount),
        next,
      });
      if (tierSlug) qs.set("tier", tierSlug);
      router.push(`/signup?${qs.toString()}`);
      return;
    }

    setError(null);
    // Already-logged-in customer with a current-version ToS acceptance on
    // file (signup, or an earlier purchase) → skip the consent modal and
    // check out directly. Anonymous visitors always go through the modal
    // (their eventual signup-and-checkout call always needs fresh consent).
    if (user && needsTosAcceptance === false) {
      runCheckout(plan, priceId, seatCount);
      return;
    }
    setTosPending({ plan, priceId, seatCount });
  };

  // tosVersion/tosAcceptedAt are omitted for an already-consented logged-in
  // customer (see handleSubscribe above) — the backend treats that the same
  // as an admin-initiated checkout: no new consent required, no new audit
  // row written. The anonymous signup-and-checkout path always requires
  // them since that's a brand-new customer's first-ever consent.
  const runCheckout = async (
    plan: Plan,
    priceId: number,
    seatCount: number,
    tosVersion?: string,
    tosAcceptedAt?: string,
  ) => {
    setCheckoutPending(plan.id);
    setError(null);

    try {
      // Anonymous + pending signup → combined signup-and-checkout endpoint.
      if (!user) {
        const pending = readPendingSignup();
        if (!pending) {
          // Defensive: pending blob disappeared between handleSubscribe
          // and confirm. Send them back through /signup.
          const next = `/pricing?plan=${priceId}&seats=${seatCount}`;
          const tierSlug = splitFamilyTier(plan.name).tier?.toLowerCase();
          const qs = new URLSearchParams({
            plan: String(priceId),
            seats: String(seatCount),
            next,
          });
          if (tierSlug) qs.set("tier", tierSlug);
          router.push(`/signup?${qs.toString()}`);
          return;
        }
        const resp = await fetch("/api/billing/signup-and-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...pending,
            price_id: priceId,
            seat_quantity: seatCount,
            tos_version: tosVersion,
            tos_accepted_at: tosAcceptedAt,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.checkout_url) {
          // 4xx means the stashed signup blob is no longer valid (CAGE
          // already claimed, email already in use, etc., often from a
          // prior abandoned test in this same tab). Drop the blob so the
          // next Subscribe click redirects them to /signup with a fresh
          // form instead of replaying the same bad data.
          if (resp.status >= 400 && resp.status < 500) {
            clearPendingSignup();
            setTosPending(null);
          }
          setError(data.error || "Failed to start checkout. Please try again.");
          return;
        }
        window.location.href = data.checkout_url;
        return;
      }

      // Logged-in flow. An add-on attaches to the customer's existing tier
      // subscription when one is live — one invoice, prorated to the tier's
      // period, charged now — same as the billing page's add-on modal. 409
      // no_host_subscription means there is no tier to join, and only then
      // does Checkout (a separate subscription) run.
      const tosBody = tosVersion && tosAcceptedAt
        ? { tos_version: tosVersion, tos_accepted_at: tosAcceptedAt }
        : {};
      if (isAddonPlan(plan)) {
        const attach = await fetch("/api/billing/purchase-addon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price_id: priceId, seat_quantity: seatCount, ...tosBody }),
        });
        if (attach.ok) {
          // No Checkout hop to come back from — land on the billing page,
          // where the new line is already on the subscription list.
          window.location.href = "/account/billing";
          return;
        }
        const attachErr = await attach.json().catch(() => ({}));
        if (!(attach.status === 409 && attachErr.error === "no_host_subscription")) {
          setError(attachErr.error || "Failed to add the add-on");
          return;
        }
      }

      const response = await fetch("/api/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: priceId,
          seat_quantity: seatCount,
          ...tosBody,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.checkout_url) {
        setError(data.error || "Failed to start checkout");
        return;
      }
      window.location.href = data.checkout_url;
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setCheckoutPending(null);
      setTosPending(null);
    }
  };

  const tosPlanSummary = useMemo(() => {
    if (!tosPending) return undefined;
    const { plan, priceId, seatCount } = tosPending;
    const price = plan.prices.find((p) => p.id === priceId);
    if (!price) return plan.name;
    const total = computeTotalCents(price, seatCount);
    const seatPart = plan.requires_seat_assignment
      ? ` · ${seatCount} seat${seatCount === 1 ? "" : "s"}`
      : "";
    const totalPart = total !== null ? ` · ${formatMoney(total, price.currency)}` : "";
    return `${plan.name} · ${intervalLabel(price.interval_count)}${seatPart}${totalPart}`;
  }, [tosPending]);

  const emptyState = useMemo(
    () => !isLoading && plans.length === 0,
    [isLoading, plans.length],
  );

  // Sort plans in display order (basic → advanced → other). The Free
  // card is hardcoded above the list, so it always lands first. Add-ons
  // (category='feature') are excluded — they get their own panel below the
  // grid instead of a purchasable tier card.
  const sortedPlans = useMemo(
    () => plans.filter((p) => !isAddonPlan(p)).sort((a, b) => {
      const tierDelta = tierSortKey(a) - tierSortKey(b);
      if (tierDelta !== 0) return tierDelta;
      return a.name.localeCompare(b.name);
    }),
    [plans],
  );

  // Add-on panels below the tier grid. Each has its own hand-written copy
  // (icon, tagline, feature bullets) rather than generic add-on text, so
  // adding a third means adding an entry here — see AddonPanel below.
  // Both self-hide: GET /billing/plans only returns billing_enabled products,
  // so an unannounced add-on never reaches `plans` and its panel never
  // renders. That's the switch for the analytics add-on's public launch.
  const rfqPlan = useMemo(() => plans.find((p) => p.key === "request_for_quote") ?? null, [plans]);
  const analyticsPlan = useMemo(
    () => plans.find((p) => p.key === ANALYTICS_PRODUCT_KEY) ?? null,
    [plans],
  );
  // Data Reports is always rendered, so the row is never empty.
  const addonPanelCount = 1 + (rfqPlan ? 1 : 0) + (analyticsPlan ? 1 : 0);
  // Full literal class strings so Tailwind's JIT keeps them (same pattern as
  // the tier grid above).
  const addonColsClass =
    addonPanelCount === 1
      ? "grid-cols-1"
      : addonPanelCount === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-2 lg:grid-cols-3";
  // Add-ons require an active paid-tier subscription — Free-tier and
  // logged-out visitors can't add one yet. currentSub already excludes
  // add-on subscriptions (see the effect above), so "has one" == "has a paid tier".
  const hasPaidTier = currentSub !== null;

  // Large-screen column count tracks how many cards are actually rendered
  // (the hardcoded Free card + every enabled plan), so disabling a product
  // shrinks the grid to fit the remaining cards instead of leaving an empty
  // slot at the end of the row. Full literal class strings so Tailwind's JIT
  // keeps them; capped at 5 columns to avoid over-thin cards. Below lg the
  // grid falls back to the responsive 1/2-column defaults.
  const totalCards = 1 + sortedPlans.length;
  const lgColsClass =
    totalCards <= 1
      ? "lg:grid-cols-1"
      : totalCards === 2
        ? "lg:grid-cols-2"
        : totalCards === 3
          ? "lg:grid-cols-3"
          : totalCards === 4
            ? "lg:grid-cols-4"
            : "lg:grid-cols-5";

  return (
    <>
      {/* Authenticated users see the in-app Header; unauthenticated visitors
          see the marketing Navbar. The Navbar is position:fixed so the main
          element gets pt-24 to clear it; Header is static and doesn't need it. */}
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 ${
          user ? "" : "pt-28"
        }`}
      >
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground">Plans & pricing</h1>
        <p className="text-muted mt-2">
          Choose a billing interval that fits — longer commitments typically
          include a discount.
        </p>
      </div>

      {error && (
        <div className="bg-error/5 border border-error/20 rounded-xl p-4 mb-6 text-sm text-error max-w-xl mx-auto">
          {error}
        </div>
      )}

      {/* Email-verification banner. Self-serve signups land here unverified;
          subscribing is gated until they click the link in the verification
          email. Internal admin-provisioned users are usually pre-verified. */}
      {user && !user.email_verified && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 mb-6 text-sm max-w-2xl mx-auto">
          <p className="text-foreground font-medium">Verify your email to subscribe</p>
          <p className="text-muted mt-1">
            We&apos;ve sent a verification link to{" "}
            <span className="font-medium text-foreground">{user.email}</span>. Click it
            to unlock plan checkout.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={resendVerification}
              disabled={resendingVerification}
              className="text-primary text-sm font-medium hover:underline disabled:opacity-50"
            >
              {resendingVerification ? "Sending…" : "Resend verification email"}
            </button>
            {resendMessage && (
              <span className="text-xs text-muted">{resendMessage}</span>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center text-muted">Loading plans…</div>
      )}

      {emptyState && (
        <div className="bg-card-bg border border-border rounded-xl p-8 text-center max-w-xl mx-auto">
          <p className="text-muted">
            No plans are available right now. Please check back soon.
          </p>
        </div>
      )}

      {/* Kicker — names the product family once, so each card heading
          below can be just the tier name. Matches the landing page. */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <span className="h-px w-8 bg-border" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-widest uppercase text-muted">
          Federal Procurement Intelligence
        </span>
        <span className="h-px w-8 bg-border" aria-hidden="true" />
      </div>

      {/* id + scroll-mt: /account/billing links straight here ("Browse plans")
          and to #add-ons below, so the two CTAs land on different sections of
          this page instead of both dropping the customer at the top. The
          offset clears the sticky header. */}
      <div id="plans" className={`scroll-mt-24 grid grid-cols-1 md:grid-cols-2 ${lgColsClass} gap-6`}>
        {/* Free tier — auto-granted on signup, no Stripe involvement. */}
        <div className="bg-card-bg border border-border rounded-xl p-6 flex flex-col">
          <h2 className="text-xl font-semibold text-card-foreground">Free</h2>
          <p className="text-muted text-sm mt-2">
            Get started with basic part lookup and vendor demographics — no card required.
          </p>
          <div className="my-6">
            <div className="text-3xl font-bold text-card-foreground">$0</div>
            <div className="text-sm text-muted mt-1">Comes with your account</div>
          </div>
          <ul className="space-y-2 text-sm text-card-foreground/90 mb-6">
            <li>• Parts search</li>
            <li>• Vendor search</li>
            <li>• Recent-solicitation count</li>
            <li>• Bid matching: 1 profile, 1 NIIN or NSN condition</li>
            <li>• 3 users</li>
          </ul>
          <div className="mt-auto">
            <Button
              variant={user ? "outline" : "primary"}
              className="w-full"
              href={user ? "/dashboard" : "/signup?tier=free"}
            >
              {user ? "Already included" : "Get started free"}
            </Button>
          </div>
        </div>

        {sortedPlans.map((plan) => {
          const activePriceId = selected[plan.id];
          const activePrice = plan.prices.find((p) => p.id === activePriceId);
          // Per-seat BILLING is independent of the access model. Access is
          // org-wide (every user under the customer inherits the tier — see
          // requires_seat_assignment, which stays FALSE), but paid tiers are
          // billed per seat: the seat count sets the Stripe quantity AND the
          // customer's user cap. Show the seat picker whenever the price is
          // tiered (graduated/volume) or the plan carries a seat ceiling
          // without a flat user allowance. Free / flat single-license plans
          // (per_unit, or a `max_customer_users` allowance) bill quantity=1.
          const billsPerSeat =
            activePrice?.billing_scheme === "tiered" ||
            (plan.max_seat_count != null && plan.max_customer_users == null);
          const billsFlat = !billsPerSeat;
          const seatCount = billsFlat
            ? 1
            : Math.max(1, seats[plan.id] || plan.default_seat_count || 1);
          const totalCents = activePrice ? computeTotalCents(activePrice, seatCount) : null;
          const isTiered = activePrice?.billing_scheme === "tiered";
          const isVolume = isTiered && activePrice?.tiers_mode === "volume";
          const isGraduated = isTiered && activePrice?.tiers_mode === "graduated";
          // Picker max is the tier-derived bound, clamped further by the
          // admin-configured max_seat_count (feature_limits.max_seat_count).
          // When at the cap we render a "Contact sales" CTA next to the picker.
          const tierMax = activePrice ? maxPickerSeats(activePrice) : 1;
          const planSeatCap = plan.max_seat_count ?? null;
          const maxSeats = planSeatCap != null
            ? Math.min(tierMax, planSeatCap)
            : tierMax;
          const atSeatCap = planSeatCap != null && seatCount >= planSeatCap;
          const popular = isMostPopular(plan);
          return (
            <div
              key={`${plan.kind}-${plan.id}`}
              className={`relative bg-card-bg rounded-xl p-6 flex flex-col ${
                popular
                  ? "border-2 border-primary shadow-lg shadow-primary/10"
                  : "border border-border"
              }`}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-primary text-white shadow-sm">
                  Most Popular
                </span>
              )}
              {(() => {
                const { family, tier } = splitFamilyTier(plan.name);
                const onThisPlan = isCurrentPlan(plan);
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-semibold text-card-foreground">
                      {tier || family}
                    </h2>
                    {onThisPlan && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                        Currently on this plan
                      </span>
                    )}
                  </div>
                );
              })()}
              {plan.description && (
                <p className="text-muted text-sm mt-2">{plan.description}</p>
              )}

              <div className="my-6">
                {activePrice && totalCents !== null ? (
                  <>
                    <div className="text-3xl font-bold text-foreground">
                      {formatMoney(totalCents, activePrice.currency)}
                    </div>
                    <div className="text-muted text-sm">
                      {intervalLabel(activePrice.interval_count)}
                      {perMonthSuffix(totalCents, activePrice.interval_count, activePrice.currency)}
                      {billsFlat
                        ? plan.max_customer_users != null
                          ? ` · up to ${plan.max_customer_users} user${plan.max_customer_users === 1 ? "" : "s"}`
                          : " · all users included"
                        : ` · ${seatCount} seat${seatCount === 1 ? "" : "s"}`}
                    </div>
                    {plan.default_trial_days && plan.default_trial_days > 0 && (
                      <>
                        <div className="text-xs text-primary mt-1">
                          Free for {plan.default_trial_days} days. No card required.
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          Add a payment method before the trial ends to keep your access.
                        </div>
                      </>
                    )}
                  </>
                ) : activePrice && isGraduated ? (
                  <div className="text-muted text-sm">
                    This plan uses graduated pricing — contact sales for a quote.
                  </div>
                ) : (
                  <div className="text-muted text-sm">No price available</div>
                )}
              </div>

              {/* Interval picker */}
              {plan.prices.length > 1 && (
                <div className="mb-4">
                  <label className="block text-xs text-muted mb-1">Billing period</label>
                  <div className="flex flex-wrap gap-2">
                    {plan.prices.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setSelected((prev) => ({ ...prev, [plan.id]: p.id }))
                        }
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          activePriceId === p.id
                            ? "bg-primary text-white border-primary"
                            : "bg-card-bg text-card-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {intervalLabel(p.interval_count)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seat picker — only shown for genuinely per-seat-billed plans.
                  Flat-rate plans (org-wide, or a flat fee for an allowance
                  like "up to 3 users") bill quantity=1, so the picker would
                  be confusing. */}
              {activePrice && !billsFlat && (
                <div className="mb-4">
                  <label className="block text-xs text-muted mb-1">Number of users</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSeats((prev) => ({
                          ...prev,
                          [plan.id]: Math.max(1, (prev[plan.id] || seatCount) - 1),
                        }))
                      }
                      className="w-8 h-8 rounded border border-border bg-card-bg text-card-foreground hover:border-primary/50 disabled:opacity-50"
                      disabled={seatCount <= 1}
                      aria-label="Decrease seats"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxSeats}
                      value={seatCount}
                      onChange={(e) =>
                        setSeats((prev) => ({
                          ...prev,
                          [plan.id]: Math.max(1, Math.min(maxSeats, Number(e.target.value) || 1)),
                        }))
                      }
                      className="w-16 px-2 py-1 text-center text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSeats((prev) => ({
                          ...prev,
                          [plan.id]: Math.min(maxSeats, (prev[plan.id] || seatCount) + 1),
                        }))
                      }
                      className="w-8 h-8 rounded border border-border bg-card-bg text-card-foreground hover:border-primary/50 disabled:opacity-50"
                      disabled={seatCount >= maxSeats}
                      aria-label="Increase seats"
                    >
                      +
                    </button>
                  </div>
                  {isVolume && activePrice.tiers.length > 1 && (
                    <p className="text-[11px] text-muted mt-1.5">
                      Volume pricing — your full team gets the rate of the bracket your seat count falls into.
                    </p>
                  )}
                  {isGraduated && activePrice.tiers.length > 1 && (
                    <p className="text-[11px] text-muted mt-1.5">
                      Graduated pricing — each bracket of seats is billed at its own rate, then added up.
                    </p>
                  )}
                  {atSeatCap && planSeatCap != null && (
                    <p className="text-[11px] text-muted mt-1.5">
                      Need more than {planSeatCap} users?{" "}
                      <a
                        href={`mailto:sales@gphusa.com?subject=Enterprise%20pricing%20-%20%3E${planSeatCap}%20users&body=Plan%3A%20${encodeURIComponent(plan.name)}`}
                        className="text-primary font-medium hover:underline"
                      >
                        Contact sales →
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* Tier table (volume + graduated) */}
              {isTiered && activePrice.tiers.length > 1 && (
                <div className="mb-4 border border-border rounded-lg overflow-hidden text-xs">
                  <div className="px-3 py-1.5 bg-muted-light/40 text-muted">
                    {isGraduated ? "Graduated tiers" : "Volume tiers"}
                  </div>
                  <div className="divide-y divide-border">
                    {activePrice.tiers.map((t, idx) => {
                      const lower = idx === 0 ? 1 : (activePrice.tiers[idx - 1].up_to_quantity ?? 0) + 1;
                      const upper = t.up_to_quantity;
                      // Volume: the single bracket the seat count lands in is "current".
                      // Graduated: every bracket up to the seat count contributes.
                      const isCurrent = isGraduated
                        ? seatCount >= lower
                        : findVolumeTier(activePrice.tiers, seatCount) === t;
                      return (
                        <div
                          key={idx}
                          className={`px-3 py-1.5 flex items-center justify-between ${
                            isCurrent ? "bg-primary/5 text-foreground font-medium" : "text-muted"
                          }`}
                        >
                          <span>
                            {upper === null ? `${lower}+ users` : `${lower}–${upper} users`}
                          </span>
                          <span>
                            {formatMoney(t.unit_amount_cents, activePrice.currency)} / user
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-auto">
                {isCurrentPlan(plan) ? (
                  // User is already on this plan — sending them through Checkout
                  // would create a duplicate subscription. Route to the Stripe
                  // Customer Portal where they can add a card / change seats / cancel.
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={openPortal}
                    disabled={portalPending}
                  >
                    {portalPending ? "Opening…" : "Manage in portal"}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleSubscribe(plan)}
                    disabled={
                      !activePrice ||
                      totalCents === null ||
                      checkoutPending === plan.id ||
                      (!!user && !user.email_verified) ||
                      (!!user && needsTosAcceptance === null)
                    }
                  >
                    {checkoutPending === plan.id
                      ? "Starting checkout…"
                      : !user
                        ? "Sign up to subscribe"
                        : !user.email_verified
                          ? "Verify email to subscribe"
                          : needsTosAcceptance === null
                            ? "Checking…"
                            : "Subscribe"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

      </div>

      {/* Add-ons + Data Reports — side by side, not stacked full-width panels,
          so similar-looking CTA cards don't repeat down the page. None of
          these is a tier (all kept out of the grid above). Add-on CTAs route
          to /account/billing's "Add-ons" section instead of starting a
          standalone checkout here — an add-on only makes sense alongside a
          paid tier subscription. <h2> instead of <h3> because the pricing
          page's heading hierarchy starts at <h1> (landing nests under an
          <h2>, hence <h3> there — same content otherwise). When an add-on's
          billing is disabled the plan drops out entirely, so the row
          collapses and Data Reports takes the freed space instead of sitting
          in a half-empty row. */}
      <div id="add-ons" className={`scroll-mt-24 mt-6 grid gap-6 ${addonColsClass}`}>
        {rfqPlan && (
          <AddonPanel
            plan={rfqPlan}
            icon={<TargetIcon className="w-6 h-6 text-primary" />}
            tagline="Send RFQs to vendors and collect quotes, right from the platform."
            fallbackDescription="Send structured RFQs to vendors and collect quotes, with a shared batch cart, a private vendor contact book, and response tracking."
            features={[
              "Structured RFQs with line-item detail",
              "Shared batch cart and private vendor contact book",
              "Response tracking across every recipient",
            ]}
            hasPaidTier={hasPaidTier}
            isSignedIn={!!user}
          />
        )}

        {analyticsPlan && (
          <AddonPanel
            plan={analyticsPlan}
            icon={<ZapIcon className="w-6 h-6 text-primary" />}
            tagline="Know your market, your competitors, and what DLA is about to buy."
            fallbackDescription="Competitive intel, opportunity targeting, and bid-readiness alerts across your whole business — plus DLA demand and stock signals on every part you supply."
            features={[
              "Procurement history, win rate, and competitor leaderboard",
              "Market prioritization — parts worth getting qualified on",
              "DLA demand forecasts and stock levels",
            ]}
            hasPaidTier={hasPaidTier}
            isSignedIn={!!user}
          />
        )}

        {/* Data Reports — bespoke engagements, no Stripe product. */}
        <div className="rounded-2xl border border-border bg-muted-light/40 dark:bg-card-bg p-6 lg:p-8 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
              <ChartIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold text-secondary dark:text-card-foreground">
                  Data Reports
                </h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Quote
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-primary">
                Bespoke procurement intelligence, scoped to your need.
              </p>
            </div>
          </div>
          <p className="mt-4 text-muted dark:text-card-foreground/80 leading-relaxed">
            Tell us what you need — sourcing analysis, vendor scorecards,
            contract intelligence, or a one-off pull from our data. We
            scope, price, and deliver.
          </p>

          <ul className="mt-4 space-y-2.5">
            {[
              "One-time deliverables or recurring cadence",
              "Custom data extracts",
              "Engagement-scoped pricing",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm text-foreground dark:text-card-foreground/90"
              >
                <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-4 border-t border-border">
            <a
              href="mailto:sales@gphusa.com?subject=Custom%20Reports%20Quote%20Request"
              className="inline-flex items-center text-primary font-medium hover:underline"
            >
              Contact sales →
            </a>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted mt-8">
        Payments processed securely by Stripe. Your card details are never stored on our servers.
      </p>
    </main>
    <TermsAcceptanceModal
      isOpen={tosPending !== null}
      onCancel={() => {
        if (checkoutPending !== null) return;
        setTosPending(null);
      }}
      onConfirm={(tosVersion, tosAcceptedAt) => {
        if (!tosPending) return;
        const { plan, priceId, seatCount } = tosPending;
        runCheckout(plan, priceId, seatCount, tosVersion, tosAcceptedAt);
      }}
      planSummary={tosPlanSummary}
      pending={checkoutPending !== null}
    />
    <Footer />
    </>
  );
}


// A 'feature'-category add-on panel below the tier grid. Each add-on supplies
// its own icon/tagline/bullets — deliberately hand-written marketing copy
// rather than something derived from the catalog row, which only carries a
// name and a one-line description. Price comes from the plan's first Price at
// its default seat count; the exact interval and seat count are picked later
// in /account/billing's add-on modal.
function AddonPanel({
  plan,
  icon,
  tagline,
  fallbackDescription,
  features,
  hasPaidTier,
  isSignedIn,
}: {
  plan: Plan;
  icon: React.ReactNode;
  tagline: string;
  fallbackDescription: string;
  features: string[];
  hasPaidTier: boolean;
  isSignedIn: boolean;
}) {
  const price = plan.prices[0] ?? null;
  const seatCount = plan.default_seat_count ?? 1;
  const totalCents = price ? computeTotalCents(price, seatCount) : null;

  return (
    <div className="rounded-2xl border border-border bg-muted-light/40 dark:bg-card-bg p-6 lg:p-8 flex flex-col">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold text-secondary dark:text-card-foreground">
              {plan.name}
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Add-on
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-primary">{tagline}</p>
        </div>
      </div>
      <p className="mt-4 text-muted dark:text-card-foreground/80 leading-relaxed">
        {plan.description || fallbackDescription}
      </p>

      <ul className="mt-4 space-y-2.5">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-foreground dark:text-card-foreground/90"
          >
            <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {price && totalCents !== null && (
        <p className="mt-4 text-sm text-muted">
          From {formatMoney(totalCents, price.currency)}
          {perMonthSuffix(totalCents, price.interval_count, price.currency)}
          {plan.requires_seat_assignment && ` for ${seatCount} seat${seatCount === 1 ? "" : "s"}`}
        </p>
      )}

      <div className="mt-6 pt-4 border-t border-border">
        {hasPaidTier ? (
          <Button href="/account/billing" variant="primary" size="sm">
            Add to your plan →
          </Button>
        ) : isSignedIn ? (
          <p className="text-sm text-muted">
            Available once you&apos;re on a paid plan — pick a tier above to add it.
          </p>
        ) : (
          <>
            <Link href="/signup" className="inline-flex items-center text-primary font-medium hover:underline">
              Sign up to get started →
            </Link>
            <p className="mt-1 text-xs text-muted">Available as an add-on on any paid plan.</p>
          </>
        )}
      </div>
    </div>
  );
}
