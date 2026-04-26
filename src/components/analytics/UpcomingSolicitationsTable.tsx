"use client";

import { UpcomingSolicitation } from '@/lib/hooks/useAnalytics';
import { SolicitationNumberLink } from '@/components/library/SolicitationNumberLink';

interface UpcomingSolicitationsTableProps {
  data: UpcomingSolicitation[];
}

export function UpcomingSolicitationsTable({ data }: UpcomingSolicitationsTableProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Upcoming Solicitations</h3>
        <div className="text-muted text-sm">No upcoming solicitations matched to your parts</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Upcoming Solicitations (Closing Soonest)</h3>
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
                ? new Date(sol.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '-';
              const daysUntil = sol.close_date
                ? Math.ceil((new Date(sol.close_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <tr key={i} className="hover:bg-muted-light/30 transition-colors">
                  <td className="px-6 py-3 font-mono">
                    {sol.solicitation_number ? (
                      <SolicitationNumberLink solicitationNumber={sol.solicitation_number} />
                    ) : '-'}
                  </td>
                  <td className="px-6 py-3 text-card-foreground whitespace-nowrap">
                    {closeDate}
                    {daysUntil !== null && daysUntil <= 7 && (
                      <span className="ml-2 text-xs font-medium text-error">
                        {daysUntil <= 0 ? 'Today' : `${daysUntil}d`}
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
