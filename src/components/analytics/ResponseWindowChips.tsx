"use client";

import { ResponseWindowBucket } from '@/lib/hooks/useAnalytics';

interface ResponseWindowChipsProps {
  data: ResponseWindowBucket[];
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
};

export function ResponseWindowChips({ data }: ResponseWindowChipsProps) {
  if (!data.length) return null;

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Response Window</h3>
      <p className="text-xs text-muted mb-4">Days remaining to bid on your matched open solicitations</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.map((b) => {
          const s = STYLES[b.bucket] ?? STYLES.comfortable;
          return (
            <div key={b.bucket} className={`rounded-lg border ${s.ring} ${s.bg} px-4 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className={`text-xs font-medium ${s.text}`}>{b.label}</span>
              </div>
              <span className={`text-xl font-bold tabular-nums ${s.text}`}>{b.count.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
