"use client";

import { useEffect, useState } from "react";
import type { SolicitationAmendmentSummary } from "@/lib/amendments";

// Fetch amendment summaries for a list of solicitation IDs and return
// them as a Map keyed by solicitation_id. Sols with no amendments are
// simply absent from the map — callers do `map.get(id)?.amendment_count`
// to decide whether to render the "Amended" pill.
//
// Debounces by sorted-id key so re-renders that don't actually change
// the input list don't refetch. Single batch POST per change.
export function useAmendmentSummaries(
  solicitationIds: number[],
): Map<number, SolicitationAmendmentSummary> {
  const [summaries, setSummaries] = useState<Map<number, SolicitationAmendmentSummary>>(new Map());
  // Stable key so useEffect doesn't refire on identical id sets.
  const key = solicitationIds.length === 0 ? "" : [...solicitationIds].sort((a, b) => a - b).join(",");

  useEffect(() => {
    if (!key) {
      // Runs on a keyed transition (open/close or an id change), not on every
      // render, so it cannot cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSummaries(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/library/solicitations/amendments/summary", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(key.split(",").map(Number)),
        });
        if (!res.ok) {
          if (!cancelled) setSummaries(new Map());
          return;
        }
        const data: SolicitationAmendmentSummary[] = await res.json();
        if (cancelled) return;
        const next = new Map<number, SolicitationAmendmentSummary>();
        for (const s of data) next.set(s.solicitation_id, s);
        setSummaries(next);
      } catch {
        if (!cancelled) setSummaries(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return summaries;
}
