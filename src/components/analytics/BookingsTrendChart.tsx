"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BookingMonth } from '@/lib/hooks/useAnalytics';
import { AGENCY_COLORS, formatCurrency } from './ChartColors';
import { CardInfoBadge } from './CardInfoBadge';

const INFO_COPY =
  "DLA's monthly booked (awarded) value by buying center — DSCP/DSCR/DSCC/Other — last 13 months. Source: DIBBS award data.";

interface BookingsTrendChartProps {
  data: BookingMonth[];
}

export function BookingsTrendChart({ data }: BookingsTrendChartProps) {
  if (!data.length) {
    return (
      <div className="bg-card-bg rounded-xl border border-border p-6">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">DLA Bookings Trend (13 Months)</h3>
          <CardInfoBadge content={INFO_COPY} />
        </div>
        <div className="h-72 flex items-center justify-center text-muted">No booking data available</div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <div className="flex items-center gap-1.5 mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">DLA Bookings Trend (13 Months)</h3>
        <CardInfoBadge content={INFO_COPY} />
      </div>
      <ResponsiveContainer width="100%" height={288}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="month_label"
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
            formatter={(value) => [formatCurrency(Number(value))]}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: 'var(--muted)' }}
            iconType="square"
            iconSize={10}
          />
          <Bar dataKey="dscp_booked" name="DSCP (Philadelphia)" stackId="a" fill={AGENCY_COLORS.dscp} />
          <Bar dataKey="dscr_booked" name="DSCR (Richmond)" stackId="a" fill={AGENCY_COLORS.dscr} />
          <Bar dataKey="dscc_booked" name="DSCC (Columbus)" stackId="a" fill={AGENCY_COLORS.dscc} />
          <Bar dataKey="other_booked" name="Other" stackId="a" fill={AGENCY_COLORS.other} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
