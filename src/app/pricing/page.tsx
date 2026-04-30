"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { readPendingSignup } from "@/lib/signup/pendingSignup";

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
};

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
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

  const handleSubscribe = async (plan: Plan) => {
    const priceId = selected[plan.id];
    if (!priceId) return;
    const seatCount = Math.max(1, seats[plan.id] || plan.default_seat_count || 1);

    // Not logged in — Option 2 flow: if /signup already stashed the
    // visitor's account details, package everything and call the combined
    // signup-and-checkout endpoint. Otherwise send them through /signup
    // first to collect those details.
    if (!authLoading && !user) {
      const pending = readPendingSignup();
      if (!pending) {
        const next = `/pricing?plan=${priceId}&seats=${seatCount}`;
        router.push(`/signup?plan=${priceId}&seats=${seatCount}&next=${encodeURIComponent(next)}`);
        return;
      }

      setCheckoutPending(plan.id);
      setError(null);
      try {
        const resp = await fetch("/api/billing/signup-and-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...pending,
            price_id: priceId,
            seat_quantity: seatCount,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.checkout_url) {
          setError(data.error || "Failed to start checkout. Please try again.");
          return;
        }
        // Hand the browser off to Stripe Checkout. The pending blob stays
        // in sessionStorage; /account/billing's finalize step clears it
        // once tokens are issued.
        window.location.href = data.checkout_url;
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred");
      } finally {
        setCheckoutPending(null);
      }
      return;
    }

    setCheckoutPending(plan.id);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: priceId,
          seat_quantity: seatCount,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.checkout_url) {
        setError(data.error || "Failed to start checkout");
        return;
      }
      // Hand the browser off to Stripe Checkout.
      window.location.href = data.checkout_url;
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setCheckoutPending(null);
    }
  };

  const emptyState = useMemo(
    () => !isLoading && plans.length === 0,
    [isLoading, plans.length],
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const activePriceId = selected[plan.id];
          const activePrice = plan.prices.find((p) => p.id === activePriceId);
          // Org-wide plans always charge for quantity=1 — they grant access
          // to every user under the customer regardless of seat count, so a
          // picker would be misleading.
          const isOrgWide = !plan.requires_seat_assignment;
          const seatCount = isOrgWide
            ? 1
            : Math.max(1, seats[plan.id] || plan.default_seat_count || 1);
          const totalCents = activePrice ? computeTotalCents(activePrice, seatCount) : null;
          const isTiered = activePrice?.billing_scheme === "tiered";
          const isVolume = isTiered && activePrice?.tiers_mode === "volume";
          const isGraduated = isTiered && activePrice?.tiers_mode === "graduated";
          const maxSeats = activePrice ? maxPickerSeats(activePrice) : 1;
          return (
            <div
              key={`${plan.kind}-${plan.id}`}
              className="bg-card-bg border border-border rounded-xl p-6 flex flex-col"
            >
              <h2 className="text-xl font-semibold text-card-foreground">{plan.name}</h2>
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
                      {isOrgWide
                        ? " · all users included"
                        : isVolume
                          ? ` · ${seatCount} seat${seatCount === 1 ? "" : "s"}`
                          : isTiered
                            ? ""
                            : ` · ${seatCount} seat${seatCount === 1 ? "" : "s"}`}
                    </div>
                    {plan.default_trial_days && plan.default_trial_days > 0 && (
                      <div className="text-xs text-primary mt-1">
                        Free for {plan.default_trial_days} days, cancel anytime.
                      </div>
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

              {/* Seat picker — only shown for per-seat plans. Org-wide plans
                  charge a flat fee that covers every user under the customer,
                  so the picker would be confusing. */}
              {activePrice && !isGraduated && !isOrgWide && (
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
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleSubscribe(plan)}
                  disabled={
                    !activePrice ||
                    isGraduated ||
                    totalCents === null ||
                    checkoutPending === plan.id ||
                    (!!user && !user.email_verified)
                  }
                >
                  {checkoutPending === plan.id
                    ? "Starting checkout…"
                    : !user
                      ? "Sign up to subscribe"
                      : !user.email_verified
                        ? "Verify email to subscribe"
                        : "Subscribe"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
    <Footer />
    </>
  );
}
