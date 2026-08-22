"use client";

import { ROW_BADGE_BASE } from "@/components/library/RowBadge";

/**
 * The Send RFQs row glyph for own-inventory coverage: the Inventory cube in
 * the RowBadge shape with a stocked/quotable fraction. Filled green = every
 * quotable line stocked; outlined = partial. Renders nothing when nothing is
 * stocked — the glyph is the signal, not its absence.
 */
export function StockCoverageGlyph({
  stocked,
  quotable,
}: {
  stocked: number | null | undefined;
  quotable: number | null | undefined;
}) {
  if (!stocked || !quotable) return null;
  const full = stocked >= quotable;
  const tone = full
    ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30"
    : "bg-transparent text-green-800 border-green-300 dark:text-green-300 dark:border-green-500/30";
  const title = full
    ? `All ${quotable} solicited part${quotable !== 1 ? "s are" : " is"} in your inventory — expand the row for quantities and locations.`
    : `${stocked} of ${quotable} solicited parts are in your inventory — expand the row for quantities and locations.`;
  return (
    <span className={`${ROW_BADGE_BASE} ${tone} cursor-help`} title={title}>
      <svg className="w-[11px] h-[11px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      {stocked}/{quotable}
    </span>
  );
}
