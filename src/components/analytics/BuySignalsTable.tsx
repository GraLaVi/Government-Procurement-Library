"use client";

import Link from 'next/link';
import { BuySignalRow } from '@/lib/hooks/useAnalytics';
import { DemandSignalChip } from './DemandSignalChip';
import { CardInfoBadge } from './CardInfoBadge';
import { formatCurrency, formatNumber } from './ChartColors';

interface BuySignalsTableProps {
  data: BuySignalRow[];
}

function partSearchUrl(niin: string): string {
  const params = new URLSearchParams({ search_type: 'nsn_niin', q: niin });
  return `/library/parts?${params.toString()}`;
}

const INFO_COPY =
  "Parts you supply that DLA's own inventory system is flagging for a near-term buy — on backorder, or below the reorder point that triggers DLA's replenishment orders. This is DLA's own buy trigger, not a prediction. Source: DLA's monthly on-hand/reorder-point FOIA data, as of the date shown.";

export function BuySignalsTable({ data }: BuySignalsTableProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-sm font-semibold text-card-foreground">Buy Signals</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted">
          None of your parts are currently on backorder or below DLA&apos;s reorder point.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Buy Signals</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted mt-1">
          Parts you supply that DLA is flagging for a near-term buy
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">NIIN / Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Signal</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">On Hand</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Reorder Pt</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Backorder</th>
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
                  <DemandSignalChip kind={row.signal_type === 'on_backorder' ? 'on_backorder' : 'below_reorder_point'} />
                </td>
                <td className="px-4 py-3 text-right text-card-foreground tabular-nums">
                  {row.total_stock != null ? formatNumber(row.total_stock) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-muted tabular-nums">
                  {row.reorder_point != null ? formatNumber(row.reorder_point) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-card-foreground tabular-nums">
                  {row.backorder_qty != null ? formatNumber(row.backorder_qty) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-card-foreground font-semibold tabular-nums">
                  {row.est_buy_value != null ? formatCurrency(row.est_buy_value) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
