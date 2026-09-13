"use client";

import { useEffect, useState } from "react";

interface TodayStats {
  total_new_count: number;
  dibbs_count: number;
  dibbs_est_value_usd: number;
  awards_today_usd: number;
}

/**
 * The hero's one number: how many solicitations the matching engine has had
 * to read today. It is the size of the haystack, which is the whole argument
 * for the product.
 *
 * Renders nothing at all until the count arrives, and nothing if it fails —
 * a "Live" badge over a zero or a spinner is worse than no claim. Same public
 * endpoint the home-page hero card uses, so it is one cached call either way.
 */
export function LiveVolumeProof() {
  const [stats, setStats] = useState<TodayStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/landing/today-stats");
        if (!response.ok) return;
        const data: TodayStats = await response.json();
        if (!cancelled && data.total_new_count > 0) setStats(data);
      } catch {
        /* no claim is better than a wrong one */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;

  return (
    <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-card-bg px-4 py-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        Live
      </span>
      <span className="text-foreground">
        <span className="data-field text-xl font-bold text-primary">
          {stats.total_new_count.toLocaleString()}
        </span>{" "}
        new solicitations posted today across DIBBS and SAM.gov.
      </span>
    </div>
  );
}
