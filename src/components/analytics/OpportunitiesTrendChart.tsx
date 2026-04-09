"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { MonthCount } from '@/lib/hooks/useAnalytics';
import { CHART_COLORS } from './ChartColors';

interface OpportunitiesTrendChartProps {
  data: MonthCount[];
}

export function OpportunitiesTrendChart({ data }: OpportunitiesTrendChartProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">SAM.gov Opportunity Trend (12 Months)</h3>
        <div className="h-72 flex items-center justify-center text-muted">No trend data available</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">SAM.gov Opportunity Trend (12 Months)</h3>
      <ResponsiveContainer width="100%" height={288}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--card-foreground)',
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCount)"
            name="Opportunities"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
