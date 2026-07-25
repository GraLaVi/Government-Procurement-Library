"use client";

// Standalone chip styling for DLA demand signals on the analytics page.
// Mirrors the tone palette/labels of PartDetail.tsx's DEMAND_SIGNAL_META /
// DemandSignalChip, but kept separate (not imported) since that component
// isn't exported for reuse outside the part detail page.

const TONES = {
  rose: {
    box: "border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-500/5",
    dot: "bg-rose-500",
  },
  amber: {
    box: "border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-500/5",
    dot: "bg-amber-500",
  },
  emerald: {
    box: "border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-500/5",
    dot: "bg-emerald-500",
  },
  slate: {
    box: "border-slate-300 dark:border-slate-500/40 text-slate-700 dark:text-slate-300 bg-slate-50/60 dark:bg-slate-500/5",
    dot: "bg-slate-500",
  },
} as const;

const SIGNAL_META = {
  on_backorder: { tone: "amber", label: "On backorder" },
  below_reorder_point: { tone: "rose", label: "Below reorder point" },
  low_coverage: { tone: "rose", label: "Low coverage" },
  recurring: { tone: "emerald", label: "Recurring demand" },
  one_off: { tone: "slate", label: "One-off buy" },
  unknown: { tone: "slate", label: "Unknown" },
} as const;

export type DemandSignalKind = keyof typeof SIGNAL_META;

interface DemandSignalChipProps {
  kind: DemandSignalKind;
}

export function DemandSignalChip({ kind }: DemandSignalChipProps) {
  const meta = SIGNAL_META[kind];
  const t = TONES[meta.tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap ${t.box}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {meta.label}
    </span>
  );
}
