"use client";

import { useCallback, useState } from "react";
import { usePreferences } from "@/lib/hooks/usePreferences";
import {
  resolveResultsLayout,
  type ResultsLayout,
} from "@/lib/preferences/resultsLayout";

/**
 * The detail layout in force right now, plus an on-demand switch for the
 * toolbar toggle.
 *
 * Seeded from user_preferences.results_layout, and switching writes straight
 * back to it — the toggle *is* the preference, just reachable from the record
 * you happen to be looking at. One source of truth, so the preferences page
 * never disagrees with what you last picked here.
 *
 * The write is best-effort: detail pages render for signed-out visitors too,
 * whose PUT 401s. Their switch still works for the session.
 */
export function useResultsLayout() {
  const { preferences, updatePreferences } = usePreferences();

  // usePreferences fetches on mount, so the saved value only lands after the
  // first render. Derive rather than seed into state: before any click the
  // layout simply tracks the preference as it arrives, and after one the
  // override wins — no effect, and no in-flight GET snapping the layout back.
  const [override, setOverride] = useState<ResultsLayout | null>(null);
  const layout = override ?? resolveResultsLayout(preferences);

  const changeLayout = useCallback(
    (next: ResultsLayout) => {
      setOverride(next);
      // Nothing to recover on failure: the layout already switched on screen
      // and usePreferences has logged it.
      updatePreferences({ results_layout: next }).catch(() => {});
    },
    [updatePreferences],
  );

  return { layout, changeLayout };
}
