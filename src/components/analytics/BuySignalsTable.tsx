"use client";

import Link from 'next/link';
import { BuySignalRow } from '@/lib/hooks/useAnalytics';
import { DemandSignalChip } from './DemandSignalChip';
import { CardInfoBadge } from './CardInfoBadge';
import { formatCurrency, formatNumber } from './ChartColors';
import {
  analyticsCardClass, analyticsCardHeaderClass, analyticsCardPaddedClass,
  analyticsRowClass, analyticsTableClass, analyticsTableWrapClass,
  analyticsTdClass, analyticsTheadRowClass, analyticsThClass,
} from './AnalyticsTable';

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
      <div className={analyticsCardPaddedClass}>
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
    <div className={analyticsCardClass}>
      <div className={analyticsCardHeaderClass}>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Buy Signals</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted mt-1">
          Parts you supply that DLA is flagging for a near-term buy
        </p>
      </div>
      <div className={analyticsTableWrapClass}>
        <table className={analyticsTableClass}>
          <thead>
            <tr className={analyticsTheadRowClass}>
              <th className={analyticsThClass}>NIIN / Description</th>
              <th className={analyticsThClass}>Signal</th>
              <th className={`${analyticsThClass} !text-right`}>On Hand</th>
              <th className={`${analyticsThClass} !text-right`}>Reorder Pt</th>
              <th className={`${analyticsThClass} !text-right`}>Backorder</th>
              <th className={`${analyticsThClass} !text-right`}>Est. Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => (
              <tr key={i} className={analyticsRowClass}>
                <td className={analyticsTdClass}>
                  <Link href={partSearchUrl(row.niin)} className="font-mono text-xs text-primary hover:underline">
                    {row.fsc ? `${row.fsc}-${row.niin}` : row.niin}
                  </Link>
                  {row.description && (
                    <div className="text-xs text-muted truncate max-w-[280px]" title={row.description}>{row.description}</div>
                  )}
                </td>
                <td className={analyticsTdClass}>
                  <DemandSignalChip kind={row.signal_type === 'on_backorder' ? 'on_backorder' : 'below_reorder_point'} />
                </td>
                <td className={`${analyticsTdClass} text-right text-card-foreground tabular-nums`}>
                  {row.total_stock != null ? formatNumber(row.total_stock) : '—'}
                </td>
                <td className={`${analyticsTdClass} text-right text-muted tabular-nums`}>
                  {row.reorder_point != null ? formatNumber(row.reorder_point) : '—'}
                </td>
                <td className={`${analyticsTdClass} text-right text-card-foreground tabular-nums`}>
                  {row.backorder_qty != null ? formatNumber(row.backorder_qty) : '—'}
                </td>
                <td className={`${analyticsTdClass} text-right text-card-foreground font-semibold tabular-nums`}>
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
