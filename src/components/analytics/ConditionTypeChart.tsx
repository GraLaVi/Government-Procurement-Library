"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ConditionTypeCount } from '@/lib/hooks/useAnalytics';
import { SET_ASIDE_COLORS } from './ChartColors';
import { CardInfoBadge } from './CardInfoBadge';

const INFO_COPY =
  'Matches broken down by which condition type triggered them (NIIN, FSC, keyword, etc.), last 90 days. Source: your bid-match profile conditions.';

interface ConditionTypeChartProps {
  data: ConditionTypeCount[];
}

export function ConditionTypeChart({ data }: ConditionTypeChartProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">Matches by Condition Type</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <div className="h-72 flex items-center justify-center text-muted">No condition data available</div>
      </div>
    );
  }

  const chartData = data.map(d => ({
    name: d.condition_type,
    value: d.count,
  }));

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <div className="flex items-center gap-1.5 mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">Matches by Condition Type</h3>
        <CardInfoBadge content={INFO_COPY} />
      </div>
      <ResponsiveContainer width="100%" height={288}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={SET_ASIDE_COLORS[index % SET_ASIDE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--card-foreground)',
            }}
            formatter={(value) => [Number(value).toLocaleString(), 'Matches']}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: 'var(--muted)' }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
