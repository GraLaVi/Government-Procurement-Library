"use client";

import { SetAsideMarketRow } from '@/lib/hooks/useAnalytics';
import { formatNumber } from './ChartColors';

interface SetAsideMarketTableProps {
  data: SetAsideMarketRow[];
}

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return <span className="text-muted text-xs">—</span>;
  const max = Math.max(...values, 1);
  const w = 84;
  const h = 22;
  const stepX = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - (v / max) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function YoYPill({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-muted text-xs">—</span>;
  const positive = pct >= 0;
  const cls = positive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
  const arrow = positive ? '▲' : '▼';
  return (
    <span className={`text-xs font-medium ${cls} whitespace-nowrap`}>
      {arrow} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function SetAsideMarketTable({ data }: SetAsideMarketTableProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Set-Aside Distribution</h3>
        <div className="text-muted text-sm">No set-aside data available</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Set-Aside Distribution</h3>
        <p className="text-xs text-muted mt-1">Active SAM.gov opportunities, with 12-month posting trend and YoY change</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted-light/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Set-Aside</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Open</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">12mo Trend</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">YoY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => {
              const label = row.description || row.code || 'Unknown';
              return (
                <tr key={i} className="hover:bg-muted-light/30 transition-colors">
                  <td className="px-6 py-3 text-card-foreground">{label}</td>
                  <td className="px-6 py-3 text-right text-card-foreground font-medium tabular-nums">
                    {formatNumber(row.open_count)}
                  </td>
                  <td className="px-6 py-3 text-primary">
                    <Sparkline values={row.trend_12mo} />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <YoYPill pct={row.yoy_pct} />
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
