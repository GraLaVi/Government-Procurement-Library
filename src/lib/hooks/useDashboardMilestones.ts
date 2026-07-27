import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRecentActions } from '@/lib/hooks/useRecentActions';
import { usePaymentMethodStatus } from '@/lib/hooks/usePaymentMethodStatus';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export interface DashboardMilestone {
  id:
    | 'search_part'
    | 'search_vendor'
    | 'add_payment_method'
    | 'create_bid_profile';
  label: string;
  href: string;
  completed: boolean;
  // Slug of the Help Center article (/help/<slug>) that explains this step.
  // Rendered as a contextual "Learn more" deep-link next to the action CTA.
  learnMoreSlug?: string;
}

interface BidProfileSummary {
  is_active: boolean;
}

// "has bid-matching access AND no active profile" → show the milestone.
// 403/network error from the profile list = treat as "no access" so the
// nudge stays hidden for users who can't use the feature anyway.
interface BidProfileGate {
  hasAccess: boolean;
  hasActiveProfile: boolean;
}

function trialDeadlineSuffix(days: number): string {
  if (days <= 0) return ' — trial ends today';
  if (days === 1) return ' — trial ends tomorrow';
  return ` — trial ends in ${days} days`;
}

// Dashboard onboarding milestones, derived from existing recent_actions data.
// Each milestone auto-completes the first time the user performs the action —
// no manual "dismiss" needed. The checklist hides itself when allComplete is
// true (see OnboardingChecklist).
//
// The "Add a payment method" milestone is conditionally spliced in for
// customers with at least one trialing subscription and no card on file.
// Free-only customers never see it. A customer can hold more than one
// concurrent trial (e.g. a library tier plus the RFQ add-on); this stepper
// is a fixed small set of steps (not a variable-length list like the
// dashboard banner), so it stays a single milestone and just surfaces
// whichever trial ends soonest — pmStatus.trials is already sorted that
// way. Also admin-only — billing (where this links) is gated to customer
// admins, and a non-admin member can't act on this nudge even if shown it.
export function useDashboardMilestones(): {
  milestones: DashboardMilestone[];
  allComplete: boolean;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const parts = useRecentActions('parts_search');
  const vendors = useRecentActions('vendor_search');
  const { status: pmStatus, isLoading: pmLoading } = usePaymentMethodStatus();

  const [bidGate, setBidGate] = useState<BidProfileGate | null>(null);
  const [bidLoading, setBidLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchWithAuth('/api/bid-matching/profiles', {
          credentials: 'include',
        });
        if (cancelled) return;
        if (!response.ok) {
          // 403 = no bid-matching access (free tier, etc.) — hide milestone.
          setBidGate({ hasAccess: false, hasActiveProfile: false });
          return;
        }
        const data: BidProfileSummary[] = await response.json();
        setBidGate({
          hasAccess: true,
          hasActiveProfile: Array.isArray(data) && data.some((p) => p.is_active),
        });
      } catch {
        if (cancelled) return;
        setBidGate({ hasAccess: false, hasActiveProfile: false });
      } finally {
        if (!cancelled) setBidLoading(false);
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
        learnMoreSlug: 'parts-search',
      },
      {
        id: 'search_vendor',
        label: 'Look up a vendor',
        href: '/library/vendor-search',
        completed: vendors.actions.length > 0,
        learnMoreSlug: 'vendor-research',
      },
    ];

    if (user?.roles?.includes('admin') && pmStatus && pmStatus.trials.length > 0 && !pmStatus.has_payment_method) {
      // Sorted soonest-ending first by the backend — the first entry is the
      // most urgent one to surface here.
      const soonest = pmStatus.trials[0];
      base.push({
        id: 'add_payment_method',
        label: `Add a payment method${trialDeadlineSuffix(soonest.days_remaining)}`,
        href: '/account/billing',
        completed: false,
        learnMoreSlug: 'plans-and-pricing',
      });
    }

    if (bidGate && bidGate.hasAccess && !bidGate.hasActiveProfile) {
      base.push({
        id: 'create_bid_profile',
        label: 'Set up a bid-matching profile',
        href: '/account/bidmatching',
        completed: false,
        learnMoreSlug: 'bid-matching-profiles',
      });
    }
    return base;
  }, [parts.actions, vendors.actions, pmStatus, bidGate, user]);

  return {
    milestones,
    allComplete: milestones.every((m) => m.completed),
    isLoading:
      parts.isLoading || vendors.isLoading || pmLoading || bidLoading,
  };
}
