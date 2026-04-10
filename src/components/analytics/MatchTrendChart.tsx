"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { DayCount } from '@/lib/hooks/useAnalytics';
import { CHART_COLORS } from './ChartColors';

interface MatchTrendChartProps {
  data: DayCount[];
}

export function MatchTrendChart({ data }: MatchTrendChartProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Match Trend (Last 30 Days)</h3>
        <div className="h-72 flex items-center justify-center text-muted">No matches in the last 30 days</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Match Trend (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={288}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--card-foreground)',
            }}
            formatter={(value) => [Number(value), 'Matches']}
          />
          <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[2, 2, 0, 0]} name="Matches" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
