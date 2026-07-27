"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentMethodStatus } from "@/lib/hooks/usePaymentMethodStatus";

function trialEndsFragment(days: number): string {
  if (days <= 0) return "ends today";
  if (days === 1) return "ends tomorrow";
  return `ends in ${days} days`;
}

// Top-of-dashboard alert nudging paid subscribers who haven't added a card
// on file yet. Renders only when there's at least one trialing subscription
// and no card on file, so free-tier customers never see it. A customer can
// hold more than one concurrent trial (e.g. a library tier plus the RFQ
// add-on) — one card covers all of them, so this is a single banner listing
// every trial rather than one banner per subscription. Also admin-only:
// billing (where the CTA links) is gated to customer admins, and non-admin
// members can't add a payment method even if shown this — see
// /account/billing's own admin gate for the same check.
export function PaymentMethodAlert() {
  const { user } = useAuth();
  const { status, isLoading } = usePaymentMethodStatus();

  if (!user?.roles?.includes("admin")) return null;
  if (isLoading || !status) return null;
  if (status.trials.length === 0 || status.has_payment_method) return null;

  const { trials } = status;

  return (
    <div className="bg-warning/10 border border-warning/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <svg
          className="w-5 h-5 text-warning shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            Add a payment method
          </div>
          {trials.length === 1 ? (
            <div className="text-sm text-muted">
              Your trial {trialEndsFragment(trials[0].days_remaining)}. Add a card to keep your subscription active.
            </div>
          ) : (
            <div className="text-sm text-muted">
              <div>Add a card to keep every trial below active:</div>
              <ul className="mt-0.5 space-y-0.5">
                {trials.map((t) => (
                  <li key={t.subscription_id}>
                    {t.label} — {trialEndsFragment(t.days_remaining)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <Link
        href="/account/billing"
        className="shrink-0 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
      >
        Add payment method
      </Link>
    </div>
  );
}
