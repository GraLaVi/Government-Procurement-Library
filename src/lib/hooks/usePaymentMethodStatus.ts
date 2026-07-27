import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

// One currently-trialing subscription. A customer can hold more than one at
// once (e.g. a library tier plus the RFQ add-on), each on its own
// independent trial clock — see docs/billing-dev.md.
export interface TrialInfo {
  subscription_id: number;
  label: string;
  trial_end: string;
  days_remaining: number;
}

export interface PaymentMethodStatus {
  has_payment_method: boolean;
  // Every trialing subscription, soonest-ending first. Empty for Free-only
  // customers and once every trial has converted/ended.
  trials: TrialInfo[];
}

const FALLBACK: PaymentMethodStatus = {
  has_payment_method: false,
  trials: [],
};

// Fetches /api/billing/payment-method-status. Drives both the dashboard
// onboarding nudge and the top-of-dashboard alert. On error, returns the
// "no subscriber" fallback rather than throwing so callers degrade silently.
export function usePaymentMethodStatus(): {
  status: PaymentMethodStatus | null;
  isLoading: boolean;
} {
  const [status, setStatus] = useState<PaymentMethodStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchWithAuth('/api/billing/payment-method-status', {
          credentials: 'include',
        });
        if (cancelled) return;
        if (!response.ok) {
          setStatus(FALLBACK);
          return;
        }
        const data: PaymentMethodStatus = await response.json();
        setStatus(data);
      } catch {
        if (cancelled) return;
        setStatus(FALLBACK);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, isLoading };
}
