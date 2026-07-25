"use client";

import { SetAsideWinRateRow } from '@/lib/hooks/useAnalytics';
import { formatNumber } from './ChartColors';
import { CardInfoBadge } from './CardInfoBadge';

const INFO_COPY =
  'Your win rate by set-aside category — awards won ÷ solicitations matched, last 24 months. Source: DIBBS solicitations + award history.';

interface SetAsideWinRateTableProps {
  data: SetAsideWinRateRow[];
}

function RatePill({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-muted text-xs">—</span>;
  let cls: string;
  if (pct >= 30) cls = 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10';
  else if (pct >= 10) cls = 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10';
  else cls = 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {pct.toFixed(1)}%
    </span>
  );
}

export function SetAsideWinRateTable({ data }: SetAsideWinRateTableProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">Set-Aside Win Rate</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <div className="text-muted text-sm">No matched or won solicitations in the last 24 months.</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Set-Aside Win Rate</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted mt-1">Won / matched ratio per set-aside type (last 24 months)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Set-Aside</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Matched</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Won</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Win Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-muted-light/30 transition-colors">
                <td className="px-6 py-3 text-card-foreground">{row.set_aside || 'Unspecified'}</td>
                <td className="px-6 py-3 text-right text-card-foreground tabular-nums">{formatNumber(row.matched_count)}</td>
                <td className="px-6 py-3 text-right text-card-foreground tabular-nums">{formatNumber(row.won_count)}</td>
                <td className="px-6 py-3 text-right"><RatePill pct={row.win_rate_pct} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
