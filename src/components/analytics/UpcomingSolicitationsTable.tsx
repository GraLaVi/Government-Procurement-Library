"use client";

import { UpcomingSolicitation } from '@/lib/hooks/useAnalytics';
import { SolicitationNumberLink } from '@/components/library/SolicitationNumberLink';
import { CardInfoBadge } from './CardInfoBadge';

interface UpcomingSolicitationsTableProps {
  data: UpcomingSolicitation[];
}

const INFO_COPY =
  "The next 5 solicitations closing soonest that match parts you supply. Source: DIBBS/SAM open solicitations.";

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

export function UpcomingSolicitationsTable({ data }: UpcomingSolicitationsTableProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4 inline-flex items-center gap-1">
          <span>Upcoming Solicitations</span>
          <CardInfoBadge content={INFO_COPY} />
        </h3>
        <div className="text-muted text-sm">No upcoming solicitations matched to your parts</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground inline-flex items-center gap-1">
          <span>Upcoming Solicitations (Closing Soonest)</span>
          <CardInfoBadge content={INFO_COPY} />
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Solicitation #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Close Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">NSN</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((sol, i) => {
              const nsn = sol.fsc && sol.niin ? `${sol.fsc}-${sol.niin}` : sol.niin || '-';
              const closeDate = sol.close_date
                ? formatLocalDate(sol.close_date)
                : '-';
              const daysUntil = sol.close_date
                ? calendarDaysUntil(sol.close_date)
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
                    {sol.solicitation_number ? (
                      <SolicitationNumberLink solicitationNumber={sol.solicitation_number} />
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
                  <td className="px-6 py-3 font-mono text-muted">{nsn}</td>
                  <td className="px-6 py-3 text-muted truncate max-w-xs">{sol.description || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
