"use client";

import { RecentMatch } from '@/lib/hooks/useAnalytics';
import { SolicitationNumberLink } from '@/components/library/SolicitationNumberLink';

interface BidMatchesClosingSoonTableProps {
  data: RecentMatch[];
}

// Parse a "YYYY-MM-DD" (or ISO timestamp) as a local-calendar date so the
// displayed day doesn't shift in US timezones where `new Date("2026-05-07")`
// would parse as UTC midnight (= May 6 evening locally).
function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Calendar-day delta (close_date - today). Negative = already past.
function calendarDaysUntil(value: string): number {
  const close = parseLocalDate(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((close.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function BidMatchesClosingSoonTable({ data }: BidMatchesClosingSoonTableProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Bid Matches — Closing Soon</h3>
        <div className="text-muted text-sm">No open matches from your bid-matching profiles</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Bid Matches — Closing Soon</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Solicitation #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Close Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Profile</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Found</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((match, i) => {
              const closeDate = match.close_date
                ? formatLocalDate(match.close_date)
                : '-';
              const daysUntil = match.close_date
                ? calendarDaysUntil(match.close_date)
                : null;

              let badge: string | null = null;
              if (daysUntil !== null) {
                if (daysUntil < 0) badge = 'Closed';
                else if (daysUntil === 0) badge = 'Today';
                else if (daysUntil <= 7) badge = `${daysUntil}d`;
              }

              return (
                <tr key={i} className="hover:bg-muted-light/30 transition-colors">
                  <td className="px-6 py-3 font-mono">
                    {match.solicitation_number ? (
                      <SolicitationNumberLink solicitationNumber={match.solicitation_number} />
                    ) : '-'}
                  </td>
                  <td className="px-6 py-3 text-card-foreground whitespace-nowrap">
                    {closeDate}
                    {badge && (
                      <span className="ml-2 text-xs font-medium text-error">
                        {badge}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-card-foreground">{match.profile_name || '-'}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {match.condition_types.length > 0 ? match.condition_types.map((ct, j) => (
                        <span
                          key={j}
                          className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary"
                        >
                          {ct}
                        </span>
                      )) : '-'}
                    </div>
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
