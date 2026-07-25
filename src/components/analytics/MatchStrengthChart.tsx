"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { MatchStrengthDay } from '@/lib/hooks/useAnalytics';
import { CHART_COLORS } from './ChartColors';
import { CardInfoBadge } from './CardInfoBadge';

const INFO_COPY =
  "Daily HARD vs SOFT bid-match signal strength, last 30 days. HARD = matched an exact identifier (NIIN/CAGE); SOFT = matched a keyword condition. Source: your active bid-match profiles.";

interface MatchStrengthChartProps {
  data: MatchStrengthDay[];
}

export function MatchStrengthChart({ data }: MatchStrengthChartProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">Match Strength (HARD vs SOFT)</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <div className="h-64 flex items-center justify-center text-muted">No matches in the last 30 days</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <div className="flex items-center gap-1.5 mb-1">
        <h3 className="text-sm font-semibold text-card-foreground">Match Strength (HARD vs SOFT)</h3>
        <CardInfoBadge content={INFO_COPY} />
      </div>
      <p className="text-xs text-muted mb-4">Daily counts over the last 30 days — HARD matches deserve immediate attention</p>
      <ResponsiveContainer width="100%" height={256}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--card-foreground)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--muted)' }} iconType="circle" iconSize={8} />
          <Bar dataKey="hard" stackId="strength" name="HARD" fill={CHART_COLORS.primary} radius={[0, 0, 0, 0]} />
          <Bar dataKey="soft" stackId="strength" name="SOFT" fill={CHART_COLORS.tertiary} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
