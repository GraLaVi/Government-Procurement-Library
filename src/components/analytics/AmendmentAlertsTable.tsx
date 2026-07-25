"use client";

import { AmendmentAlertRow } from '@/lib/hooks/useAnalytics';
import { SolicitationNumberLink } from '@/components/library/SolicitationNumberLink';
import { CardInfoBadge } from './CardInfoBadge';

const INFO_COPY =
  "Solicitations you matched that were amended after the match was generated — check for changed terms before you bid. Source: DIBBS/SAM amendment history.";

interface AmendmentAlertsTableProps {
  data: AmendmentAlertRow[];
}

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return parseLocalDate(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelative(value: string | null): string {
  if (!value) return '—';
  const then = new Date(value).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  const months = Math.floor(diffDays / 30);
  return `${months}mo ago`;
}

const REASON_LABELS: Record<string, string> = {
  new_item: 'New item',
  set_aside_change: 'Set-aside changed',
  status_change: 'Status changed',
  close_date_change: 'Close date changed',
  issue_date_change: 'Issue date changed',
  metadata: 'Metadata changed',
};

export function AmendmentAlertsTable({ data }: AmendmentAlertsTableProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-sm font-semibold text-card-foreground">Amendment Alerts</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted">No matched solicitations have been amended in the last 90 days. All your intel is current.</p>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Amendment Alerts</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted mt-1">Matched solicitations changed AFTER your match was generated — review before bidding</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Solicitation #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Profile</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Close Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-muted-light/30 transition-colors">
                <td className="px-6 py-3 font-mono">
                  {row.solicitation_number ? (
                    <SolicitationNumberLink solicitationNumber={row.solicitation_number} />
                  ) : '—'}
                </td>
                <td className="px-6 py-3 text-card-foreground truncate max-w-[180px]" title={row.profile_name || ''}>
                  {row.profile_name || '—'}
                </td>
                <td className="px-6 py-3 text-card-foreground whitespace-nowrap">{formatDate(row.close_date)}</td>
                <td className="px-6 py-3 text-amber-700 dark:text-amber-300 whitespace-nowrap font-medium">
                  {formatRelative(row.latest_amendment_at)}
                </td>
                <td className="px-6 py-3 text-muted whitespace-nowrap">
                  {row.change_reason ? (REASON_LABELS[row.change_reason] || row.change_reason) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
