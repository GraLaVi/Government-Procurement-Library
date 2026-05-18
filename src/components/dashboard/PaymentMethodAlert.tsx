"use client";

import Link from "next/link";
import { usePaymentMethodStatus } from "@/lib/hooks/usePaymentMethodStatus";

function trialDeadlineCopy(days: number | null | undefined): string | null {
  if (days == null) return null;
  if (days <= 0) return "Your trial ends today.";
  if (days === 1) return "Your trial ends tomorrow.";
  return `Your trial ends in ${days} days.`;
}

// Top-of-dashboard alert nudging paid subscribers who haven't added a card
// on file yet. Renders only when is_subscriber && !has_payment_method, so
// free-tier and beta-only customers never see it.
export function PaymentMethodAlert() {
  const { status, isLoading } = usePaymentMethodStatus();

  if (isLoading || !status) return null;
  if (!status.is_subscriber || status.has_payment_method) return null;

  const trialCopy = trialDeadlineCopy(status.days_remaining);

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
          <div className="text-sm text-muted">
            {trialCopy
              ? `${trialCopy} Add a card to keep your subscription active.`
              : "Add a card on file to keep your subscription active."}
          </div>
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
