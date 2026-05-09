import { useMemo } from 'react';
import { useRecentActions } from '@/lib/hooks/useRecentActions';

export interface DashboardMilestone {
  id: 'search_part' | 'search_vendor';
  label: string;
  href: string;
  completed: boolean;
}

// Dashboard onboarding milestones, derived from existing recent_actions data.
// Each milestone auto-completes the first time the user performs the action —
// no manual "dismiss" needed. The checklist hides itself when allComplete is
// true (see OnboardingChecklist).
export function useDashboardMilestones(): {
  milestones: DashboardMilestone[];
  allComplete: boolean;
  isLoading: boolean;
} {
  const parts = useRecentActions('parts_search');
  const vendors = useRecentActions('vendor_search');

  const milestones = useMemo<DashboardMilestone[]>(
    () => [
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
    ],
    [parts.actions, vendors.actions],
  );

  return {
    milestones,
    allComplete: milestones.every((m) => m.completed),
    isLoading: parts.isLoading || vendors.isLoading,
  };
}
