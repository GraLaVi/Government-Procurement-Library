"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

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
  description: string | null;
  default_seat_count: number | null;
  default_trial_days: number | null;
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

function perMonthSuffix(price: Price): string {
  if (price.interval_count === 1) return "/mo";
  const perMonth = price.unit_amount_cents / price.interval_count;
  return ` (${formatMoney(perMonth, price.currency)}/mo)`;
}

export default function PricingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState<number | null>(null);

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
      // Default selection: cheapest interval (usually monthly) per plan.
      const defaults: Record<number, number> = {};
      for (const p of data as Plan[]) {
        if (p.prices.length > 0) defaults[p.id] = p.prices[0].id;
      }
      setSelected(defaults);
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

  const handleSubscribe = async (plan: Plan) => {
    const priceId = selected[plan.id];
    if (!priceId) return;

    // Not logged in — bounce to login then come back here.
    if (!authLoading && !user) {
      router.push(`/login?next=${encodeURIComponent("/pricing")}`);
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
          seat_quantity: plan.default_seat_count || 1,
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
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                {activePrice ? (
                  <>
                    <div className="text-3xl font-bold text-foreground">
                      {formatMoney(activePrice.unit_amount_cents, activePrice.currency)}
                    </div>
                    <div className="text-muted text-sm">
                      {intervalLabel(activePrice.interval_count)}
                      {perMonthSuffix(activePrice)}
                      {plan.default_seat_count && plan.default_seat_count > 1
                        ? ` · ${plan.default_seat_count} seats included`
                        : " · per seat"}
                    </div>
                    {plan.default_trial_days && plan.default_trial_days > 0 && (
                      <div className="text-xs text-primary mt-1">
                        Free for {plan.default_trial_days} days, cancel anytime.
                      </div>
                    )}
                  </>
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

              <div className="mt-auto">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleSubscribe(plan)}
                  disabled={!activePrice || checkoutPending === plan.id}
                >
                  {checkoutPending === plan.id
                    ? "Starting checkout…"
                    : user
                      ? "Subscribe"
                      : "Sign in to subscribe"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
