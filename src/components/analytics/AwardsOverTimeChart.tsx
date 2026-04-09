"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { MonthValue } from '@/lib/hooks/useAnalytics';
import { CHART_COLORS, formatCurrency } from './ChartColors';

interface AwardsOverTimeChartProps {
  data: MonthValue[];
}

export function AwardsOverTimeChart({ data }: AwardsOverTimeChartProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Your DIBBS Awards Over Time (24 Months)</h3>
        <div className="h-72 flex items-center justify-center text-muted">No award data available</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Your DIBBS Awards Over Time (24 Months)</h3>
      <ResponsiveContainer width="100%" height={288}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(v) => formatCurrency(v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--card-foreground)',
            }}
            formatter={(value, name) => {
              if (name === 'total_value') return [formatCurrency(Number(value)), 'Award Value'];
              return [String(value), String(name)];
            }}
          />
          <Line
            type="monotone"
            dataKey="total_value"
            stroke={CHART_COLORS.secondary}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS.secondary, r: 3 }}
            activeDot={{ r: 5 }}
            name="total_value"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
