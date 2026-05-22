"use client";

import { PartPriceBenchmark } from '@/lib/hooks/useAnalytics';
import { formatNumber } from './ChartColors';

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
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Winning Price Benchmark</h3>
        <div className="text-muted text-sm">
          No award data available in the last 12 months for your parts.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Winning Price Benchmark</h3>
        <p className="text-xs text-muted mt-1">
          Min / median / max winning unit price over the last 12 months — your most-active parts
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">NSN / Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Awards</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Min</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Median</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Max</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Range</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => {
              const nsn = row.fsc && row.niin ? `${row.fsc}-${row.niin}` : row.niin || '-';
              const desc = row.description || '';
              return (
                <tr key={i} className="hover:bg-muted-light/30 transition-colors">
                  <td className="px-6 py-3">
                    <div className="font-mono text-xs text-card-foreground">{nsn}</div>
                    {desc && (
                      <div className="text-xs text-muted truncate max-w-[280px]" title={desc}>{desc}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-card-foreground tabular-nums">
                    {formatNumber(row.award_count)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted tabular-nums">
                    {formatUnitPrice(row.min_unit_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-card-foreground font-semibold tabular-nums">
                    {formatUnitPrice(row.median_unit_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted tabular-nums">
                    {formatUnitPrice(row.max_unit_price)}
                  </td>
                  <td className="px-4 py-3 text-primary">
                    <PriceRangeBar row={row} />
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
