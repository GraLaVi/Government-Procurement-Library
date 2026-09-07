"use client";

import { UpcomingSolicitation } from '@/lib/hooks/useAnalytics';
import { SolicitationNumberLink } from '@/components/library/SolicitationNumberLink';
import { CardInfoBadge } from './CardInfoBadge';
import {
  analyticsCardClass, analyticsCardHeaderClass, analyticsCardPaddedClass,
  analyticsRowClass, analyticsTableClass, analyticsTableWrapClass,
  analyticsTdClass, analyticsTheadRowClass, analyticsThClass,
} from './AnalyticsTable';

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
      <div className={analyticsCardPaddedClass}>
        <h3 className="text-sm font-semibold text-card-foreground mb-4 inline-flex items-center gap-1">
          <span>Upcoming Solicitations</span>
          <CardInfoBadge content={INFO_COPY} />
        </h3>
        <div className="text-muted text-sm">No upcoming solicitations matched to your parts</div>
      </div>
    );
  }

  return (
    <div className={analyticsCardClass}>
      <div className={analyticsCardHeaderClass}>
        <h3 className="text-sm font-semibold text-card-foreground inline-flex items-center gap-1">
          <span>Upcoming Solicitations (Closing Soonest)</span>
          <CardInfoBadge content={INFO_COPY} />
        </h3>
      </div>
      <div className={analyticsTableWrapClass}>
        <table className={analyticsTableClass}>
          <thead>
            <tr className={analyticsTheadRowClass}>
              <th className={analyticsThClass}>Solicitation #</th>
              <th className={analyticsThClass}>Close Date</th>
              <th className={analyticsThClass}>NSN</th>
              <th className={analyticsThClass}>Description</th>
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
                <tr key={i} className={analyticsRowClass}>
                  <td className={`${analyticsTdClass} font-mono`}>
                    {sol.solicitation_number ? (
                      <SolicitationNumberLink solicitationNumber={sol.solicitation_number} />
                    ) : '-'}
                  </td>
                  <td className={`${analyticsTdClass} text-card-foreground whitespace-nowrap`}>
                    {closeDate}
                    {badge && (
                      <span className="ml-2 text-xs font-medium text-error">
                        {badge}
                      </span>
                    )}
                  </td>
                  <td className={`${analyticsTdClass} font-mono text-muted`}>{nsn}</td>
                  <td className={`${analyticsTdClass} text-muted truncate max-w-xs`}>{sol.description || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
