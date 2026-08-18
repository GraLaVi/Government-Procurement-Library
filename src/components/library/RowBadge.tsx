"use client";

import type { ReactNode } from "react";

/**
 * The badge worn by every pill in a data-table row — bid-matching results,
 * the Send RFQs queue, and the Parts / Vendor solicitation tabs.
 *
 * Rows had accumulated four different pill shapes (rounded-full, rounded-md,
 * bare rounded, borderless) at three type sizes, so a single row could show
 * five badges that looked like they came from five products. This is the one
 * shape they all use now: 10px semibold, 4px corners, always bordered.
 *
 * This is now the only badge in the app. It replaced `ui/Badge`, a
 * rounded-full pill that applied `capitalize` to its children — which
 * title-cased any multi-word label passed to it, and which call sites worked
 * around rather than fixed. Text here renders as authored; a caller wanting
 * capitalization asks for it (see SolStatusBadge, whose API returns
 * lower-cased status strings).
 */

export type RowBadgeTone =
  | "neutral"   // context, no judgement (set-aside, IDC)
  | "amber"     // attention (amended, prior wins)
  | "sky"       // informational flag (first article, updated)
  | "green"     // good / open / fast
  | "red"       // closed / excluded
  | "blue"      // awarded
  | "indigo"    // source marker (SAM)
  | "slate"     // inactive / cancelled
  | "outline";  // stated but de-emphasised (an aged win)

// Each tone carries a dark counterpart: a light -100 chip is legible on a
// dark card (dark text on a light patch) but reads as a row of bright
// stickers against the rest of the UI. The dark form inverts the
// relationship — a dim wash of the hue at /10 with the light -300 text —
// matching the treatment in components/analytics/TimeToCloseChips.tsx.
const TONES: Record<RowBadgeTone, string> = {
  neutral: "bg-muted/15 text-foreground border-border",
  amber: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  sky: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  outline: "bg-transparent text-muted border-border",
};

/** Hover tints for badges that are actually buttons. */
// In dark the hover deepens the same wash rather than lightening the chip,
// so the direction of the feedback matches what the eye expects on a dark
// surface.
const TONE_HOVERS: Record<RowBadgeTone, string> = {
  neutral: "hover:bg-muted/25",
  amber: "hover:bg-amber-200 dark:hover:bg-amber-500/20",
  sky: "hover:bg-sky-100 dark:hover:bg-sky-500/20",
  green: "hover:bg-green-200 dark:hover:bg-green-500/20",
  red: "hover:bg-red-200 dark:hover:bg-red-500/20",
  blue: "hover:bg-blue-200 dark:hover:bg-blue-500/20",
  indigo: "hover:bg-indigo-200 dark:hover:bg-indigo-500/20",
  slate: "hover:bg-slate-200 dark:hover:bg-slate-500/20",
  outline: "hover:text-foreground",
};

/** Shape and type, without any color. */
export const ROW_BADGE_BASE =
  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 whitespace-nowrap";

/**
 * Class string for a row badge, for the cases that must render their own
 * element — a <button> that opens a popover, or a <select> styled as a pill.
 */
export function rowBadgeClass(
  tone: RowBadgeTone = "neutral",
  opts?: { interactive?: boolean; className?: string },
): string {
  const hover = opts?.interactive ? ` ${TONE_HOVERS[tone]} cursor-pointer transition-colors` : "";
  return `${ROW_BADGE_BASE} ${TONES[tone]}${hover} ${opts?.className ?? ""}`.trim();
}

export function RowBadge({
  tone = "neutral", title, className = "", children,
}: {
  tone?: RowBadgeTone;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={rowBadgeClass(tone, { className })} title={title}>
      {children}
    </span>
  );
}
