"use client";

import { ProfileHealthRow } from '@/lib/hooks/useAnalytics';
import { formatNumber } from './ChartColors';
import { CardInfoBadge } from './CardInfoBadge';
import {
  analyticsCardClass, analyticsCardHeaderClass, analyticsCardPaddedClass,
  analyticsRowClass, analyticsTableClass, analyticsTableWrapClass,
  analyticsTdClass, analyticsTheadRowClass, analyticsThClass,
} from './AnalyticsTable';

const INFO_COPY =
  "Per-profile health check — flags profiles that haven't matched anything recently ('dormant') or match far more than typical ('over broad') and may need narrowing. Source: your bid-match profile activity.";

interface ProfileHealthTableProps {
  data: ProfileHealthRow[];
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  productive: {
    label: 'Productive',
    cls: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10',
  },
  dormant: {
    label: 'Dormant',
    cls: 'text-muted bg-muted-light/50',
  },
  over_broad: {
    label: 'Over-broad',
    cls: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10',
  },
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProfileHealthTable({ data }: ProfileHealthTableProps) {
  if (!data.length) {
    return (
      <div className={analyticsCardPaddedClass}>
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-sm font-semibold text-card-foreground">Profile Health</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted">No active bid-matching profiles.</p>
      </div>
    );
  }

  return (
    <div className={analyticsCardClass}>
      <div className={analyticsCardHeaderClass}>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Profile Health</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted mt-1">Active profiles — flag dormant or over-broad ones for tuning</p>
      </div>
      <div className={analyticsTableWrapClass}>
        <table className={analyticsTableClass}>
          <thead>
            <tr className={analyticsTheadRowClass}>
              <th className={analyticsThClass}>Profile</th>
              <th className={analyticsThClass}>Last Match</th>
              <th className={`${analyticsThClass} !text-right`}>Matches (30d)</th>
              <th className={analyticsThClass}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => {
              const s = STATUS_STYLES[row.status] ?? STATUS_STYLES.productive;
              return (
                <tr key={row.profile_id} className={analyticsRowClass}>
                  <td className={`${analyticsTdClass} text-card-foreground truncate max-w-xs`} title={row.profile_name}>
                    {row.profile_name}
                  </td>
                  <td className={`${analyticsTdClass} text-muted whitespace-nowrap`}>{formatDate(row.last_match_date)}</td>
                  <td className={`${analyticsTdClass} text-right text-card-foreground tabular-nums`}>
                    {formatNumber(row.matches_30d)}
                  </td>
                  <td className={analyticsTdClass}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>
                      {s.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
