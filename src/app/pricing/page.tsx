"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TermsAcceptanceModal } from "@/components/billing/TermsAcceptanceModal";
import { clearPendingSignup, readPendingSignup } from "@/lib/signup/pendingSignup";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { ChartIcon, CheckIcon } from "@/components/icons";

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

// Beta gate. When true (dev), Subscribe buttons open Stripe Checkout
// directly. When false (prod default during beta), they're disabled and
// visitors are funneled to /signup, which routes them into the beta
// application queue. Shares the same env flag /signup uses to gate the
// self-serve path picker — both gestures bypass the beta queue, so they
// move together. Existing subscribers' "Manage in portal" CTA is NOT
// gated by this; people already on a plan can always manage it.
const DIRECT_SUBSCRIBE_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_DEV_SIGNUP === "true";

type PriceTier = {
  up_to_quantity: number | null; // null = infinity
  unit_amount_cents: number;
  flat_amount_cents: number;
};

type Price = {
  id: number;
  stripe_price_id: string;
  interval_unit: string;
  interval_count: number;
  unit_amount_cents: number;
  currency: string;
  billing_scheme: "per_unit" | "tiered";
  tiers_mode: "volume" | "graduated" | null;
  tiers: PriceTier[];
};

type Plan = {
  kind: "product" | "product_group";
  id: number;
  key: string;
  name: string;
  description: string | null;
  default_seat_count: number | null;
  default_trial_days: number | null;
  // True = per-seat product (admin assigns each user a seat). False = org-wide
  // (every user under the customer gets access automatically; checkout uses
  // quantity=1 and the seat picker is hidden on /pricing).
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

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

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

function intervalLabel(months: number): string {
  switch (months) {
    case 1:
      return "Monthly";
    case 3:
      return "Quarterly";
    case 6:
      return "Semi-annual";
    case 12:
      return "Annual";
    default:
      return `Every ${months} months`;
  }
}

// Find the volume bracket the seat count falls into (first tier whose up_to >= qty,
// or the last/infinity tier).
function findVolumeTier(tiers: PriceTier[], quantity: number): PriceTier | null {
  if (tiers.length === 0) return null;
  for (const t of tiers) {
    if (t.up_to_quantity === null || quantity <= t.up_to_quantity) return t;
  }
  return tiers[tiers.length - 1];
}

// Compute the period total for a given price + seat count, regardless of scheme.
// Returns null when the price/tiers don't support this seat count
// (e.g. graduated mode is not yet supported).
function computeTotalCents(price: Price, quantity: number): number | null {
  if (price.billing_scheme === "per_unit") {
    return price.unit_amount_cents * quantity;
  }
  if (price.billing_scheme === "tiered" && price.tiers_mode === "volume") {
    const t = findVolumeTier(price.tiers, quantity);
    if (!t) return null;
    return t.unit_amount_cents * quantity + t.flat_amount_cents;
  }
  // Graduated tiers — not modeled yet on the pricing page; surface "—".
  return null;
}

// Maximum seats we let the picker reach. For tiered prices we use the largest
// finite up_to bound × 2; for unbounded ("up_to: inf"), default to 1000.
function maxPickerSeats(price: Price): number {
  if (price.billing_scheme !== "tiered" || price.tiers.length === 0) return 1000;
  const finite = price.tiers
    .map((t) => t.up_to_quantity)
    .filter((x): x is number => typeof x === "number");
  if (finite.length === 0) return 1000;
  return Math.max(...finite) * 2;
}

// "$X / mo" given a total for a 1/3/6/12-month interval. Returns "" if interval=1.
function perMonthSuffix(totalCents: number, intervalCount: number, currency: string): string {
  if (intervalCount === 1) return "/mo";
  return ` (${formatMoney(totalCents / intervalCount, currency)}/mo)`;
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

  // Fetch the user's current subscription once we know they're logged in.
  // Used to badge "Currently on this plan" and swap the Subscribe CTA for
  // "Manage in portal" on the matching plan card.
  useEffect(() => {
    if (authLoading || !user) {
      setCurrentSub(null);
      return;
    }
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
        const active = (data as CurrentSub[]).find(
          (s) => CURRENT_SUB_STATUSES.has(s.status) && s.plan_id !== null,
        );
        setCurrentSub(active || null);
      } catch {
        if (!cancelled) setCurrentSub(null);
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
    if (!DIRECT_SUBSCRIBE_ENABLED) return;
    const priceId = selected[plan.id];
    if (!priceId) return;
    const seatCount = Math.max(1, seats[plan.id] || plan.default_seat_count || 1);
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
    setTosPending({ plan, priceId, seatCount });
  };

  const handleTosConfirm = async (tosVersion: string, tosAcceptedAt: string) => {
    if (!tosPending) return;
    const { plan, priceId, seatCount } = tosPending;

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

      // Logged-in flow.
      const response = await fetch("/api/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: priceId,
          seat_quantity: seatCount,
          tos_version: tosVersion,
          tos_accepted_at: tosAcceptedAt,
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
  // card is hardcoded above the list, so it always lands first.
  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => {
      const tierDelta = tierSortKey(a) - tierSortKey(b);
      if (tierDelta !== 0) return tierDelta;
      return a.name.localeCompare(b.name);
    }),
    [plans],
  );

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

      {!DIRECT_SUBSCRIBE_ENABLED && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-sm max-w-2xl mx-auto">
          <p className="text-foreground font-medium">We&apos;re currently in private beta</p>
          <p className="text-muted mt-1">
            Subscriptions are paused while beta testing wraps up. To request access,{" "}
            <a href="/signup" className="text-primary font-medium hover:underline">
              apply via signup
            </a>
            .
          </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <li>• 1 user</li>
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
          // Flat-rate plans always charge for quantity=1 — a single flat
          // license covers the whole tier ("up to N users"), billed once
          // regardless of how many users are assigned, so a per-seat picker
          // would be misleading. This covers both org-wide plans
          // (!requires_seat_assignment) and seat-assigned tiers that bill a
          // flat fee for an allowance (`max_customer_users` set, e.g. Basic
          // and Advanced up to 3). The backend enforces this by billing
          // quantity=1.
          const billsFlat = !plan.requires_seat_assignment || plan.max_customer_users != null;
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
                          ? ` · up to ${plan.max_customer_users} users`
                          : " · all users included"
                        : isVolume
                          ? ` · ${seatCount} seat${seatCount === 1 ? "" : "s"}`
                          : isTiered
                            ? ""
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
              {activePrice && !isGraduated && !billsFlat && (
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

              {/* Tier table (volume only) */}
              {isVolume && activePrice.tiers.length > 1 && (
                <div className="mb-4 border border-border rounded-lg overflow-hidden text-xs">
                  <div className="px-3 py-1.5 bg-muted-light/40 text-muted">Volume tiers</div>
                  <div className="divide-y divide-border">
                    {activePrice.tiers.map((t, idx) => {
                      const lower = idx === 0 ? 1 : (activePrice.tiers[idx - 1].up_to_quantity ?? 0) + 1;
                      const upper = t.up_to_quantity;
                      const isCurrent = findVolumeTier(activePrice.tiers, seatCount) === t;
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
                      !DIRECT_SUBSCRIBE_ENABLED ||
                      !activePrice ||
                      isGraduated ||
                      totalCents === null ||
                      checkoutPending === plan.id ||
                      (!!user && !user.email_verified)
                    }
                  >
                    {!DIRECT_SUBSCRIBE_ENABLED
                      ? "Beta — apply via signup"
                      : checkoutPending === plan.id
                        ? "Starting checkout…"
                        : !user
                          ? "Sign up to subscribe"
                          : !user.email_verified
                            ? "Verify email to subscribe"
                            : "Subscribe"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

      </div>

      {/* Data Reports — bespoke engagements, no Stripe product. Rendered
          outside the tier grid as a full-width horizontal panel (same
          treatment and content as the landing-page Products section) so
          the two views match. <h2> instead of <h3> because the pricing
          page's heading hierarchy starts at <h1> (landing nests under an
          <h2>, hence <h3> there). */}
      <div className="mt-6 rounded-2xl border border-border bg-muted-light/40 dark:bg-card-bg p-8 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
          {/* Left: identity + pitch */}
          <div>
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
          </div>

          {/* Right: features + CTA */}
          <div className="lg:border-l lg:border-border lg:pl-8">
            <ul className="space-y-2.5">
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
            <div className="mt-6">
              <a
                href="mailto:sales@gphusa.com?subject=Custom%20Reports%20Quote%20Request"
                className="inline-flex items-center text-primary font-medium hover:underline"
              >
                Contact sales →
              </a>
            </div>
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
      onConfirm={handleTosConfirm}
      planSummary={tosPlanSummary}
      pending={checkoutPending !== null}
    />
    <Footer />
    </>
  );
}
