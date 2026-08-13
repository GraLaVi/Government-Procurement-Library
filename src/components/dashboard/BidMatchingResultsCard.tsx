"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KPICardSkeleton, formatNumber } from "@/components/analytics";

interface RunDateGroup {
  run_date: string;
  total_count: number;
}

type CardState =
  | { kind: "loading" }
  | { kind: "no-access" }
  | { kind: "no-profiles" }
  | { kind: "results"; count: number; isToday: boolean };

const CARD_CLASS =
  "block bg-card-bg rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-sm transition-all";

// Local YYYY-MM-DD so "today" is the user's calendar day, matching how the
// matcher's run dates read to them.
function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Dashboard KPI card surfacing today's bid-matching results. Self-contained:
 * it owns its data + loading/empty/upsell states so it can render regardless of
 * the surrounding business-summary state. Styled to mirror {@link KPICard}.
 */
export function BidMatchingResultsCard() {
  const { isLoading: authLoading, hasProductAccessByPrefix } = useAuth();
  const hasAccess = hasProductAccessByPrefix("bid_matching");

  const [state, setState] = useState<CardState>({ kind: "loading" });

  useEffect(() => {
    if (authLoading) return;

    // No access → upsell state, skip all network calls.
    if (!hasAccess) {
      // Runs on a keyed transition (open/close or an id change), not on every
      // render, so it cannot cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ kind: "no-access" });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [profilesRes, treeRes] = await Promise.all([
          fetch("/api/bid-matching/profiles", { credentials: "include" }),
          fetch("/api/bid-matching/results/date-tree", { credentials: "include" }),
        ]);
        if (cancelled) return;

        const profiles = profilesRes.ok ? await profilesRes.json() : null;
        const hasProfiles = Array.isArray(profiles) && profiles.length > 0;
        if (!hasProfiles) {
          setState({ kind: "no-profiles" });
          return;
        }

        const tree: RunDateGroup[] = treeRes.ok ? await treeRes.json() : [];
        // date-tree is sorted run_date DESC; total_count already sums all of
        // that day's runs across DIBBS + SAM. Count is "today's" only when the
        // most recent run date is actually today.
        const latest = Array.isArray(tree) && tree.length > 0 ? tree[0] : null;
        const isToday = latest?.run_date === todayLocalISO();
        setState({
          kind: "results",
          count: isToday ? latest!.total_count : 0,
          isToday: Boolean(isToday),
        });
      } catch {
        if (!cancelled) {
          // Treat fetch failure as "no results today" rather than hiding the
          // card — it still links through to the full bid-matching view.
          setState({ kind: "results", count: 0, isToday: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, hasAccess]);

  if (state.kind === "loading") {
    return <KPICardSkeleton />;
  }

  const label = <div className="text-sm text-muted mb-1">Bid Matching Results</div>;

  if (state.kind === "no-access") {
    return (
      <Link href="/bidmatching" className={CARD_CLASS}>
        {label}
        <div className="text-2xl font-bold text-card-foreground">—</div>
        <div className="text-sm text-muted mt-1">Get automated solicitation matches</div>
      </Link>
    );
  }

  if (state.kind === "no-profiles") {
    return (
      <Link href="/account/bidmatching" className={CARD_CLASS}>
        {label}
        <div className="text-2xl font-bold text-card-foreground">Set up</div>
        <div className="text-sm text-muted mt-1">Create a profile to start matching</div>
      </Link>
    );
  }

  // state.kind === "results"
  return (
    <Link href="/bidmatching" className={CARD_CLASS}>
      {label}
      <div className="text-2xl font-bold text-card-foreground">{formatNumber(state.count)}</div>
      <div className="text-sm text-muted mt-1">
        {state.count > 0 ? "New matches today" : "No new matches today"}
      </div>
    </Link>
  );
}
