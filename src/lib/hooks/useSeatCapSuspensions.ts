import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { ManagedUser } from '@/lib/users/types';

// Users deactivated because the org exceeded its plan's user limit — i.e.
// `deactivated_reason = 'seat_cap'` (migration 036). Deliberately excludes
// anyone an admin switched off on purpose: those aren't restored by adding
// seats and shouldn't be counted in a "you lost access" message.
export function useSeatCapSuspensions(enabled: boolean): {
  suspended: ManagedUser[] | null;
  isLoading: boolean;
  /** Re-read after reactivating someone, so the restore prompt and the
   *  banner drop the users that are no longer suspended. */
  reload: () => void;
} {
  const [suspended, setSuspended] = useState<ManagedUser[] | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setSuspended(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // include_inactive is required: the default listing hides exactly the
        // users we're looking for, which is the whole reason a downgrade looks
        // like data loss from the users page.
        const response = await fetchWithAuth('/api/users?include_inactive=true', {
          credentials: 'include',
        });
        if (cancelled) return;
        if (!response.ok) {
          setSuspended([]);
          return;
        }
        const data = await response.json();
        const users: ManagedUser[] = Array.isArray(data) ? data : data.users ?? [];
        setSuspended(
          users.filter((u) => !u.is_active && u.deactivated_reason === 'seat_cap'),
        );
      } catch {
        // Soft-fail to "nothing to report" rather than throwing. This drives an
        // explanatory banner, never access itself, and the affected users were
        // emailed regardless.
        if (!cancelled) setSuspended([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken]);

  return { suspended, isLoading, reload };
}
