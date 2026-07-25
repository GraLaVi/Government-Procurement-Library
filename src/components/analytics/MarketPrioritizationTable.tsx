"use client";

import Link from 'next/link';
import { ProspectRow } from '@/lib/hooks/useAnalytics';
import { DemandSignalChip, DemandSignalKind } from './DemandSignalChip';
import { CardInfoBadge } from './CardInfoBadge';
import { formatCurrency, formatNumber } from './ChartColors';

interface MarketPrioritizationTableProps {
  data: ProspectRow[];
}

function partSearchUrl(niin: string): string {
  const params = new URLSearchParams({ search_type: 'nsn_niin', q: niin });
  return `/library/parts?${params.toString()}`;
}

const SIGNAL_KIND_MAP: Record<string, DemandSignalKind> = {
  on_backorder: 'on_backorder',
  below_reorder_point: 'below_reorder_point',
  low_coverage: 'low_coverage',
};

const INFO_COPY =
  "Parts outside your current catalog, in Federal Supply Classes where you already have award history, that DLA is flagging for a near-term buy — ranked by estimated order value. A prospecting list for parts worth getting qualified on. Source: DLA demand/inventory FOIA data + DIBBS award history (for the price estimate).";

export function MarketPrioritizationTable({ data }: MarketPrioritizationTableProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-sm font-semibold text-card-foreground">Market Prioritization</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted">
          No prospecting opportunities found in your Federal Supply Classes right now.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Market Prioritization</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted mt-1">
          Parts worth getting qualified on — ranked by estimated order value
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">NSN / Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Signal</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Forecast (12mo)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Est. Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-muted-light/30 transition-colors">
                <td className="px-6 py-3">
                  <Link href={partSearchUrl(row.niin)} className="font-mono text-xs text-primary hover:underline">
                    {row.fsc ? `${row.fsc}-${row.niin}` : row.niin}
                  </Link>
                  {row.description && (
                    <div className="text-xs text-muted truncate max-w-[280px]" title={row.description}>{row.description}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <DemandSignalChip kind={SIGNAL_KIND_MAP[row.signal_type] ?? 'unknown'} />
                </td>
                <td className="px-4 py-3 text-right text-muted tabular-nums">
                  {row.forecast_next_12mo != null ? formatNumber(row.forecast_next_12mo) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-card-foreground font-semibold tabular-nums">
                  {row.est_value != null ? formatCurrency(row.est_value) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
