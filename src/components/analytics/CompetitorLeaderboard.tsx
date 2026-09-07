"use client";

import { CompetitorRow } from '@/lib/hooks/useAnalytics';
import { formatCurrency, formatNumber } from './ChartColors';
import { CardInfoBadge } from './CardInfoBadge';
import {
  analyticsCardClass, analyticsCardHeaderClass, analyticsCardPaddedClass,
  analyticsRowClass, analyticsTableClass, analyticsTableWrapClass,
  analyticsTdClass, analyticsTheadRowClass, analyticsThClass,
} from './AnalyticsTable';

const INFO_COPY = "Vendors who've won the most value on your parts, last 2 years. Source: DIBBS award history.";

interface CompetitorLeaderboardProps {
  data: CompetitorRow[];
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CompetitorLeaderboard({ data }: CompetitorLeaderboardProps) {
  if (!data.length) {
    return (
      <div className={analyticsCardPaddedClass}>
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">Competitors on Your Parts</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <div className="text-muted text-sm">No competing vendor activity in the last 24 months.</div>
      </div>
    );
  }

  return (
    <div className={analyticsCardClass}>
      <div className={analyticsCardHeaderClass}>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Competitors on Your Parts</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted mt-1">Top vendors winning on parts you supply (last 24 months)</p>
      </div>
      <div className={analyticsTableWrapClass}>
        <table className={analyticsTableClass}>
          <thead>
            <tr className={analyticsTheadRowClass}>
              <th className={analyticsThClass}>CAGE</th>
              <th className={analyticsThClass}>Company</th>
              <th className={`${analyticsThClass} !text-right`}>Your Parts Won</th>
              <th className={`${analyticsThClass} !text-right`}>Total $</th>
              <th className={analyticsThClass}>Last Award</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => (
              <tr key={i} className={analyticsRowClass}>
                <td className={`${analyticsTdClass} font-mono text-card-foreground`}>{row.cage_code || '—'}</td>
                <td className={`${analyticsTdClass} text-card-foreground truncate max-w-xs`} title={row.company_name || ''}>
                  {row.company_name || <span className="text-muted">Unknown</span>}
                </td>
                <td className={`${analyticsTdClass} text-right text-card-foreground tabular-nums`}>
                  {formatNumber(row.parts_won_count)}
                </td>
                <td className={`${analyticsTdClass} text-right text-card-foreground font-semibold tabular-nums`}>
                  {formatCurrency(Number(row.total_value))}
                </td>
                <td className={`${analyticsTdClass} text-muted whitespace-nowrap`}>{formatDate(row.last_award_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
