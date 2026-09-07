"use client";

import { SetAsideMarketRow } from '@/lib/hooks/useAnalytics';
import { formatNumber } from './ChartColors';
import { CardInfoBadge } from './CardInfoBadge';
import {
  analyticsCardClass, analyticsCardHeaderClass, analyticsCardPaddedClass,
  analyticsRowClass, analyticsTableClass, analyticsTableWrapClass,
  analyticsTdClass, analyticsTheadRowClass, analyticsThClass,
} from './AnalyticsTable';

const INFO_COPY =
  'Currently open opportunities by set-aside category, with a 12-month trend and year-over-year change. Source: SAM.gov + DIBBS solicitations.';

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
      <div className={analyticsCardPaddedClass}>
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">Set-Aside Distribution</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <div className="text-muted text-sm">No set-aside data available</div>
      </div>
    );
  }

  return (
    <div className={analyticsCardClass}>
      <div className={analyticsCardHeaderClass}>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-card-foreground">Set-Aside Distribution</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <p className="text-xs text-muted mt-1">Active SAM.gov opportunities, with 12-month posting trend and YoY change</p>
      </div>
      <div className={analyticsTableWrapClass}>
        <table className={analyticsTableClass}>
          <thead>
            <tr className={analyticsTheadRowClass}>
              <th className={analyticsThClass}>Set-Aside</th>
              <th className={`${analyticsThClass} !text-right`}>Open</th>
              <th className={analyticsThClass}>12mo Trend</th>
              <th className={`${analyticsThClass} !text-right`}>YoY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => {
              const label = row.description || row.code || 'Unknown';
              return (
                <tr key={i} className={analyticsRowClass}>
                  <td className={`${analyticsTdClass} text-card-foreground`}>{label}</td>
                  <td className={`${analyticsTdClass} text-right text-card-foreground font-medium tabular-nums`}>
                    {formatNumber(row.open_count)}
                  </td>
                  <td className={`${analyticsTdClass} text-primary`}>
                    <Sparkline values={row.trend_12mo} />
                  </td>
                  <td className={`${analyticsTdClass} text-right`}>
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
