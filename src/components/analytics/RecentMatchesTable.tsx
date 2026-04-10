"use client";

import { RecentMatch } from '@/lib/hooks/useAnalytics';

interface RecentMatchesTableProps {
  data: RecentMatch[];
}

export function RecentMatchesTable({ data }: RecentMatchesTableProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Recent Matches</h3>
        <div className="text-muted text-sm">No bid-matching results yet</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Recent Matches</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Solicitation #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Close Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Profile</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Matched On</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Found</th>
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
                <tr key={i} className="hover:bg-muted-light/30 transition-colors">
                  <td className="px-6 py-3 font-mono">
                    {match.solicitation_number ? (
                      <a
                        href={`/library/parts?search_type=solicitation&q=${encodeURIComponent(match.solicitation_number)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 hover:underline"
                      >
                        {match.solicitation_number}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-3 text-card-foreground whitespace-nowrap">{closeDate}</td>
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
                  <td className="px-6 py-3 text-muted whitespace-nowrap">{matchedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
