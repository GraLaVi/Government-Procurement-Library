"use client";

import { RecentMatch } from '@/lib/hooks/useAnalytics';
import { SolicitationNumberLink } from '@/components/library/SolicitationNumberLink';
import { CardInfoBadge } from './CardInfoBadge';
import {
  analyticsCardClass, analyticsCardHeaderClass, analyticsCardPaddedClass,
  analyticsRowClass, analyticsTableClass, analyticsTableWrapClass,
  analyticsTdClass, analyticsTheadRowClass, analyticsThClass,
} from './AnalyticsTable';

const INFO_COPY = 'Your 5 most recently matched solicitations. Source: your bid-matching results.';

interface RecentMatchesTableProps {
  data: RecentMatch[];
}

export function RecentMatchesTable({ data }: RecentMatchesTableProps) {
  if (!data.length) {
    return (
      <div className={analyticsCardPaddedClass}>
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">Recent Matches</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <div className="text-muted text-sm">No bid-matching results yet</div>
      </div>
    );
  }

  return (
    <div className={analyticsCardClass}>
      <div className={analyticsCardHeaderClass}>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Recent Matches</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
      </div>
      <div className={analyticsTableWrapClass}>
        <table className={analyticsTableClass}>
          <thead>
            <tr className={analyticsTheadRowClass}>
              <th className={analyticsThClass}>Solicitation #</th>
              <th className={analyticsThClass}>Close Date</th>
              <th className={analyticsThClass}>Profile</th>
              <th className={analyticsThClass}>Matched On</th>
              <th className={analyticsThClass}>Found</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((match, i) => {
              const closeDate = match.close_date
                ? new Date(match.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '-';
              const matchedAt = match.matched_at
                ? new Date(match.matched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '-';

              return (
                <tr key={i} className={analyticsRowClass}>
                  <td className={`${analyticsTdClass} font-mono`}>
                    {match.solicitation_number ? (
                      <SolicitationNumberLink solicitationNumber={match.solicitation_number} />
                    ) : '-'}
                  </td>
                  <td className={`${analyticsTdClass} text-card-foreground whitespace-nowrap`}>{closeDate}</td>
                  <td className={`${analyticsTdClass} text-card-foreground`}>{match.profile_name || '-'}</td>
                  <td className={analyticsTdClass}>
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
                  <td className={`${analyticsTdClass} text-muted whitespace-nowrap`}>{matchedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
