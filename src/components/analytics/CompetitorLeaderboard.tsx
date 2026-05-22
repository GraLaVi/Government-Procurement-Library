"use client";

import { CompetitorRow } from '@/lib/hooks/useAnalytics';
import { formatCurrency, formatNumber } from './ChartColors';

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
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Competitors on Your Parts</h3>
        <div className="text-muted text-sm">No competing vendor activity in the last 24 months.</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Competitors on Your Parts</h3>
        <p className="text-xs text-muted mt-1">Top vendors winning on parts you supply (last 24 months)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">CAGE</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Your Parts Won</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Total $</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Last Award</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-muted-light/30 transition-colors">
                <td className="px-6 py-3 font-mono text-card-foreground">{row.cage_code || '—'}</td>
                <td className="px-6 py-3 text-card-foreground truncate max-w-xs" title={row.company_name || ''}>
                  {row.company_name || <span className="text-muted">Unknown</span>}
                </td>
                <td className="px-6 py-3 text-right text-card-foreground tabular-nums">
                  {formatNumber(row.parts_won_count)}
                </td>
                <td className="px-6 py-3 text-right text-card-foreground font-semibold tabular-nums">
                  {formatCurrency(Number(row.total_value))}
                </td>
                <td className="px-6 py-3 text-muted whitespace-nowrap">{formatDate(row.last_award_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
