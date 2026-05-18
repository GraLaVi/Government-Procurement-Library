import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export interface PaymentMethodStatus {
  is_subscriber: boolean;
  has_payment_method: boolean;
  subscription_status: string | null;
  trial_end: string | null;
  days_remaining: number | null;
}

const FALLBACK: PaymentMethodStatus = {
  is_subscriber: false,
  has_payment_method: false,
  subscription_status: null,
  trial_end: null,
  days_remaining: null,
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
