"use client";

import { ProfileHealthRow } from '@/lib/hooks/useAnalytics';
import { formatNumber } from './ChartColors';

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
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-1">Profile Health</h3>
        <p className="text-xs text-muted">No active bid-matching profiles.</p>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Profile Health</h3>
        <p className="text-xs text-muted mt-1">Active profiles — flag dormant or over-broad ones for tuning</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Profile</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Last Match</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Matches (30d)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => {
              const s = STATUS_STYLES[row.status] ?? STATUS_STYLES.productive;
              return (
                <tr key={row.profile_id} className="hover:bg-muted-light/30 transition-colors">
                  <td className="px-6 py-3 text-card-foreground truncate max-w-xs" title={row.profile_name}>
                    {row.profile_name}
                  </td>
                  <td className="px-6 py-3 text-muted whitespace-nowrap">{formatDate(row.last_match_date)}</td>
                  <td className="px-6 py-3 text-right text-card-foreground tabular-nums">
                    {formatNumber(row.matches_30d)}
                  </td>
                  <td className="px-6 py-3">
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
