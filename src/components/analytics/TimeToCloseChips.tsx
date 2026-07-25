"use client";

import { TimeToCloseBucket } from '@/lib/hooks/useAnalytics';
import { CardInfoBadge } from './CardInfoBadge';

const INFO_COPY =
  'Close-date urgency for matches from the latest run, grouped into buckets. Source: your latest bid-matching run.';

interface TimeToCloseChipsProps {
  data: TimeToCloseBucket[];
}

const STYLES: Record<string, { ring: string; text: string; bg: string; dot: string }> = {
  urgent: {
    ring: 'border-rose-300 dark:border-rose-500/40',
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50/60 dark:bg-rose-500/5',
    dot: 'bg-rose-500',
  },
  soon: {
    ring: 'border-amber-300 dark:border-amber-500/40',
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50/60 dark:bg-amber-500/5',
    dot: 'bg-amber-500',
  },
  comfortable: {
    ring: 'border-emerald-300 dark:border-emerald-500/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50/60 dark:bg-emerald-500/5',
    dot: 'bg-emerald-500',
  },
  long: {
    ring: 'border-slate-300 dark:border-slate-500/40',
    text: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-50/60 dark:bg-slate-500/5',
    dot: 'bg-slate-500',
  },
};

export function TimeToCloseChips({ data }: TimeToCloseChipsProps) {
  if (!data.length) return null;
  const totalCount = data.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <div className="flex items-center gap-1.5 mb-1">
        <h3 className="text-sm font-semibold text-card-foreground">Time to Close (Latest Run)</h3>
        <CardInfoBadge content={INFO_COPY} />
      </div>
      <p className="text-xs text-muted mb-4">
        {totalCount > 0
          ? `Days remaining on the ${totalCount.toLocaleString()} matches from your most recent run`
          : 'No matches in the most recent run'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.map((b) => {
          const s = STYLES[b.bucket] ?? STYLES.comfortable;
          return (
            <div key={b.bucket} className={`rounded-lg border ${s.ring} ${s.bg} px-4 py-3`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className={`text-xs font-medium ${s.text}`}>{b.label}</span>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${s.text}`}>{b.count.toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
