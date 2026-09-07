"use client";

import { PartPriceBenchmark } from '@/lib/hooks/useAnalytics';
import { formatNumber } from './ChartColors';
import { DemandSignalChip, DemandSignalKind } from './DemandSignalChip';
import { CardInfoBadge } from './CardInfoBadge';
import {
  analyticsCardClass, analyticsCardHeaderClass, analyticsCardPaddedClass,
  analyticsRowClass, analyticsTableClass, analyticsTableWrapClass,
  analyticsTdClass, analyticsTheadRowClass, analyticsThClass,
} from './AnalyticsTable';

const DEMAND_TYPE_KINDS: DemandSignalKind[] = ['recurring', 'one_off', 'unknown'];

const WINNING_PRICE_INFO_COPY =
  'Min / median / max unit price that actually won, per part, over the last 12 months — price to win without underbidding. Source: DIBBS award history.';
const DEMAND_TYPE_INFO_COPY =
  "Whether DLA's forecast and annual-demand data suggest this part is bought repeatedly (worth defending on price) or was likely a one-time buy. Source: DLA demand-forecast FOIA data.";

interface WinningPriceBenchmarkTableProps {
  data: PartPriceBenchmark[];
}

function formatUnitPrice(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1000) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

// Visual: small horizontal bar showing the min→max range with the median
// marked as a tick. Helps customers eyeball pricing spread at a glance.
function PriceRangeBar({ row }: { row: PartPriceBenchmark }) {
  const { min_unit_price: lo, max_unit_price: hi, median_unit_price: mid } = row;
  if (lo == null || hi == null || mid == null || hi <= lo) {
    return <span className="text-muted text-xs">—</span>;
  }
  const w = 120;
  const h = 8;
  const span = hi - lo;
  const midX = ((mid - lo) / span) * w;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <rect x={0} y={h / 2 - 1.5} width={w} height={3} rx={1.5} fill="currentColor" opacity={0.18} />
      <rect x={midX - 1.5} y={0} width={3} height={h} rx={1} fill="currentColor" />
    </svg>
  );
}

export function WinningPriceBenchmarkTable({ data }: WinningPriceBenchmarkTableProps) {
  if (!data.length) {
    return (
      <div className={analyticsCardPaddedClass}>
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">Winning Price Benchmark</h3>
          <CardInfoBadge content={WINNING_PRICE_INFO_COPY} />
        </div>
        <div className="text-muted text-sm">
          No award data available in the last 12 months for your parts.
        </div>
      </div>
    );
  }

  return (
    <div className={analyticsCardClass}>
      <div className={analyticsCardHeaderClass}>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Winning Price Benchmark</h3>
          <CardInfoBadge content={WINNING_PRICE_INFO_COPY} />
        </div>
        <p className="text-xs text-muted mt-1">
          Min / median / max winning unit price over the last 12 months — your most-active parts
        </p>
      </div>
      <div className={analyticsTableWrapClass}>
        <table className={analyticsTableClass}>
          <thead>
            <tr className={analyticsTheadRowClass}>
              <th className={analyticsThClass}>NSN / Description</th>
              <th className={`${analyticsThClass} !text-right`}>Awards</th>
              <th className={`${analyticsThClass} !text-right`}>Min</th>
              <th className={`${analyticsThClass} !text-right`}>Median</th>
              <th className={`${analyticsThClass} !text-right`}>Max</th>
              <th className={analyticsThClass}>Range</th>
              <th className={analyticsThClass}>
                <span className="inline-flex items-center gap-1.5">
                  Demand
                  <CardInfoBadge content={DEMAND_TYPE_INFO_COPY} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => {
              const nsn = row.fsc && row.niin ? `${row.fsc}-${row.niin}` : row.niin || '-';
              const desc = row.description || '';
              const demandKind = DEMAND_TYPE_KINDS.includes(row.demand_type as DemandSignalKind)
                ? (row.demand_type as DemandSignalKind)
                : null;
              return (
                <tr key={i} className={analyticsRowClass}>
                  <td className={analyticsTdClass}>
                    <div className="font-mono text-xs text-card-foreground">{nsn}</div>
                    {desc && (
                      <div className="text-xs text-muted truncate max-w-[280px]" title={desc}>{desc}</div>
                    )}
                  </td>
                  <td className={`${analyticsTdClass} text-right text-card-foreground tabular-nums`}>
                    {formatNumber(row.award_count)}
                  </td>
                  <td className={`${analyticsTdClass} text-right text-muted tabular-nums`}>
                    {formatUnitPrice(row.min_unit_price)}
                  </td>
                  <td className={`${analyticsTdClass} text-right text-card-foreground font-semibold tabular-nums`}>
                    {formatUnitPrice(row.median_unit_price)}
                  </td>
                  <td className={`${analyticsTdClass} text-right text-muted tabular-nums`}>
                    {formatUnitPrice(row.max_unit_price)}
                  </td>
                  <td className={`${analyticsTdClass} text-primary`}>
                    <PriceRangeBar row={row} />
                  </td>
                  <td className={analyticsTdClass}>
                    {demandKind ? <DemandSignalChip kind={demandKind} /> : <span className="text-muted text-xs">—</span>}
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
