"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { PartValue } from '@/lib/hooks/useAnalytics';
import { CHART_COLORS, formatCurrency } from './ChartColors';

interface TopAwardedPartsChartProps {
  data: PartValue[];
}

export function TopAwardedPartsChart({ data }: TopAwardedPartsChartProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Top Awarded Parts (by Value)</h3>
        <div className="h-64 flex items-center justify-center text-muted">No award data available</div>
      </div>
    );
  }

  // Build chart data with truncated labels
  const chartData = data.map(p => ({
    name: p.niin
      ? `${p.niin}${p.description ? ' - ' + p.description.slice(0, 30) : ''}`
      : p.description?.slice(0, 40) || 'Unknown',
    value: Number(p.total_value),
    awards: p.award_count,
  }));

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Top Awarded Parts (by Value)</h3>
      <ResponsiveContainer width="100%" height={data.length * 52 + 40}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tickFormatter={(v) => formatCurrency(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={200}
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--card-foreground)',
            }}
            formatter={(value, name) => {
              if (name === 'value') return [formatCurrency(Number(value)), 'Total Value'];
              return [String(value), String(name)];
            }}
          />
          <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 3, 3, 0]} name="value" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
