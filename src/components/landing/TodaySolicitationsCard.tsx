"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/components/analytics";

interface TodayStats {
  total_new_count: number;
  dibbs_count: number;
  dibbs_est_value_usd: number;
  awards_today_usd: number;
}

const ZERO_STATS: TodayStats = {
  total_new_count: 0,
  dibbs_count: 0,
  dibbs_est_value_usd: 0,
  awards_today_usd: 0,
};

export function TodaySolicitationsCard() {
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/landing/today-stats");
        if (cancelled) return;
        if (!response.ok) {
          setStats(ZERO_STATS);
          return;
        }
        const data: TodayStats = await response.json();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(ZERO_STATS);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: Array<{ label: string; sublabel: string; value: string }> = stats
    ? [
        {
          label: "New solicitations today",
          sublabel: "DIBBS + SAM.gov",
          value: stats.total_new_count.toLocaleString(),
        },
        {
          label: "Estimated value",
          sublabel: "Added today",
          value: formatCurrency(stats.dibbs_est_value_usd),
        },
        {
          label: "Awarded today",
          sublabel: "Federal contracts",
          value: formatCurrency(stats.awards_today_usd),
        },
      ]
    : [];

  return (
    <div className="relative bg-white dark:bg-card-bg rounded-2xl shadow-2xl shadow-primary/10 border border-border p-6 lg:p-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-secondary dark:text-card-foreground">
              Today&apos;s Solicitations
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              Live
            </span>
          </div>

          {isLoading || !stats
            ? [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="p-4 bg-muted-light rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-2/3 bg-muted/30 rounded animate-pulse" />
                      <div className="mt-2 h-3 w-1/3 bg-muted/20 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-16 bg-muted/30 rounded animate-pulse" />
                  </div>
                </div>
              ))
            : rows.map((row) => (
                <div
                  key={row.label}
                  className="p-4 bg-muted-light rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="font-medium text-foreground dark:text-card-foreground text-sm">
                        {row.label}
                      </h4>
                      <p className="text-xs text-muted dark:text-card-foreground/70 mt-1">
                        {row.sublabel}
                      </p>
                    </div>
                    <span className="text-primary font-semibold text-sm whitespace-nowrap">
                      {row.value}
                    </span>
                  </div>
                </div>
              ))}
        </div>
    </div>
  );
}
