"use client";

import { HotPartRow } from '@/lib/hooks/useAnalytics';
import { formatNumber } from './ChartColors';
import { CardInfoBadge } from './CardInfoBadge';
import {
  analyticsCardClass, analyticsCardHeaderClass, analyticsCardPaddedClass,
  analyticsRowClass, analyticsTableClass, analyticsTableWrapClass,
  analyticsTdClass, analyticsTheadRowClass, analyticsThClass,
} from './AnalyticsTable';

const INFO_COPY =
  'Parts in your catalog with accelerating solicitation activity — more new postings in the last 30 days than their recent monthly average. Source: DIBBS/SAM solicitation postings.';

interface HotPartsTableProps {
  data: HotPartRow[];
}

function SurgeArrow({ surge }: { surge: number }) {
  if (surge > 0) {
    return (
      <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium text-xs whitespace-nowrap">
        ▲ +{surge.toFixed(1)}
      </span>
    );
  }
  if (surge < 0) {
    return (
      <span className="inline-flex items-center text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap">
        ▼ {surge.toFixed(1)}
      </span>
    );
  }
  return <span className="text-muted text-xs">flat</span>;
}

export function HotPartsTable({ data }: HotPartsTableProps) {
  if (!data.length) {
    return (
      <div className={analyticsCardPaddedClass}>
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">Hot Parts in Your Catalog</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <div className="text-muted text-sm">No solicitation activity in the last 30 days for your matched parts.</div>
      </div>
    );
  }

  return (
    <div className={analyticsCardClass}>
      <div className={analyticsCardHeaderClass}>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Hot Parts in Your Catalog</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted mt-1">Parts where new solicitation demand is accelerating vs the prior 90-day baseline</p>
      </div>
      <div className={analyticsTableWrapClass}>
        <table className={analyticsTableClass}>
          <thead>
            <tr className={analyticsTheadRowClass}>
              <th className={analyticsThClass}>NSN / Description</th>
              <th className={`${analyticsThClass} !text-right`}>Last 30d</th>
              <th className={`${analyticsThClass} !text-right`}>Baseline / mo</th>
              <th className={`${analyticsThClass} !text-right`}>Surge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => {
              const nsn = row.fsc && row.niin ? `${row.fsc}-${row.niin}` : row.niin || '-';
              return (
                <tr key={i} className={analyticsRowClass}>
                  <td className={analyticsTdClass}>
                    <div className="font-mono text-xs text-card-foreground">{nsn}</div>
                    {row.description && (
                      <div className="text-xs text-muted truncate max-w-[320px]" title={row.description}>
                        {row.description}
                      </div>
                    )}
                  </td>
                  <td className={`${analyticsTdClass} text-right text-card-foreground font-semibold tabular-nums`}>
                    {formatNumber(row.last_30d_count)}
                  </td>
                  <td className={`${analyticsTdClass} text-right text-muted tabular-nums`}>
                    {row.baseline_monthly_avg.toFixed(1)}
                  </td>
                  <td className={`${analyticsTdClass} text-right`}>
                    <SurgeArrow surge={row.surge} />
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
