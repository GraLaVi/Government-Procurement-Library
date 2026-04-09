"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CodeCount } from '@/lib/hooks/useAnalytics';
import { SET_ASIDE_COLORS } from './ChartColors';

interface SetAsideChartProps {
  data: CodeCount[];
}

export function SetAsideChart({ data }: SetAsideChartProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Set-Aside Distribution</h3>
        <div className="h-72 flex items-center justify-center text-muted">No set-aside data available</div>
      </div>
    );
  }

  // Show top 8, group the rest as "Other"
  const sorted = [...data].sort((a, b) => b.count - a.count);
  let chartData: { name: string; value: number }[];
  if (sorted.length > 8) {
    const top = sorted.slice(0, 8);
    const otherCount = sorted.slice(8).reduce((sum, d) => sum + d.count, 0);
    chartData = [
      ...top.map(d => ({ name: d.description || d.code || 'Unknown', value: d.count })),
      { name: 'Other', value: otherCount },
    ];
  } else {
    chartData = sorted.map(d => ({ name: d.description || d.code || 'Unknown', value: d.count }));
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Set-Aside Distribution</h3>
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
            formatter={(value) => [Number(value).toLocaleString(), 'Opportunities']}
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
