import { useEffect, useMemo, useState } from 'react';
import { useRecentActions } from '@/lib/hooks/useRecentActions';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export interface DashboardMilestone {
  id: 'search_part' | 'search_vendor' | 'add_payment_method';
  label: string;
  href: string;
  completed: boolean;
}

interface PaymentMethodStatus {
  is_subscriber: boolean;
  has_payment_method: boolean;
  subscription_status: string | null;
  trial_end: string | null;
  days_remaining: number | null;
}

function trialDeadlineSuffix(days: number | null | undefined): string {
  if (days == null) return '';
  if (days <= 0) return ' — trial ends today';
  if (days === 1) return ' — trial ends tomorrow';
  return ` — trial ends in ${days} days`;
}

// Dashboard onboarding milestones, derived from existing recent_actions data.
// Each milestone auto-completes the first time the user performs the action —
// no manual "dismiss" needed. The checklist hides itself when allComplete is
// true (see OnboardingChecklist).
//
// The "Add a payment method" milestone is conditionally spliced in for paid
// subscribers (Subscription row exists in an access-granting status) who
// don't yet have a card on file. Beta and Free-only customers never see it.
export function useDashboardMilestones(): {
  milestones: DashboardMilestone[];
  allComplete: boolean;
  isLoading: boolean;
} {
  const parts = useRecentActions('parts_search');
  const vendors = useRecentActions('vendor_search');

  const [pmStatus, setPmStatus] = useState<PaymentMethodStatus | null>(null);
  const [pmLoading, setPmLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchWithAuth('/api/billing/payment-method-status', {
          credentials: 'include',
        });
        if (cancelled) return;
        if (!response.ok) {
          // Unauthenticated / non-subscriber / server hiccup — treat as
          // "don't show the nudge" rather than surfacing an error.
          setPmStatus({
            is_subscriber: false,
            has_payment_method: false,
            subscription_status: null,
            trial_end: null,
            days_remaining: null,
          });
          return;
        }
        const data: PaymentMethodStatus = await response.json();
        setPmStatus(data);
      } catch {
        if (cancelled) return;
        setPmStatus({
          is_subscriber: false,
          has_payment_method: false,
          subscription_status: null,
          trial_end: null,
          days_remaining: null,
        });
      } finally {
        if (!cancelled) setPmLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const milestones = useMemo<DashboardMilestone[]>(() => {
    const base: DashboardMilestone[] = [
      {
        id: 'search_part',
        label: 'Search a part',
        href: '/library/parts',
        completed: parts.actions.length > 0,
      },
      {
        id: 'search_vendor',
        label: 'Look up a vendor',
        href: '/library/vendor-search',
        completed: vendors.actions.length > 0,
      },
    ];

    if (pmStatus && pmStatus.is_subscriber && !pmStatus.has_payment_method) {
      base.push({
        id: 'add_payment_method',
        label: `Add a payment method${trialDeadlineSuffix(pmStatus.days_remaining)}`,
        href: '/account/billing',
        completed: false,
      });
    }
    return base;
  }, [parts.actions, vendors.actions, pmStatus]);

  return {
    milestones,
    allComplete: milestones.every((m) => m.completed),
    isLoading: parts.isLoading || vendors.isLoading || pmLoading,
  };
}
