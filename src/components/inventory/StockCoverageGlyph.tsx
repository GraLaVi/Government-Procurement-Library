"use client";

import { createPortal } from "react-dom";
import { useAnchoredPopover } from "@/components/library/WinAndFirstArticleBadges";
import { formatContractDate } from "@/lib/library/types";
import type { MyStockSummary } from "@/lib/inventory/types";

/** One stocked part in the popover: the part's display identity plus the
 *  aggregated own-stock summary the page already computes for the panel. */
export interface StockGlyphEntry {
  key: string | number;
  identity: string;
  summary: MyStockSummary;
}

/**
 * The Send RFQs row glyph for own-inventory coverage: the Inventory cube in
 * the RowBadge shape with a stocked/quotable fraction. Filled green = every
 * quotable line stocked; outlined = partial; absent when nothing is stocked.
 *
 * Click opens an anchored popover (same mechanic as the win-history and FAT
 * badges) listing the stocked parts with quantity, condition, warehouse and
 * as-of. `onOpen` lets the page lazy-load that detail the way row expansion
 * does; until it lands the popover shows a spinner.
 */
export function StockCoverageGlyph({
  stocked,
  quotable,
  loading = false,
  entries,
  onOpen,
}: {
  stocked: number | null | undefined;
  quotable: number | null | undefined;
  loading?: boolean;
  entries?: StockGlyphEntry[];
  onOpen?: () => void;
}) {
  const { open, coords, btnRef, panelRef, toggle } = useAnchoredPopover();

  if (!stocked || !quotable) return null;
  const full = stocked >= quotable;
  const tone = full
    ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30 dark:hover:bg-green-500/20"
    : "bg-transparent text-green-800 border-green-300 hover:bg-green-500/10 dark:text-green-300 dark:border-green-500/30 dark:hover:bg-green-500/20";
  const label = full
    ? `All ${quotable} solicited part${quotable !== 1 ? "s are" : " is"} in your inventory — show details`
    : `${stocked} of ${quotable} solicited parts are in your inventory — show details`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          toggle(e);
          if (!open) onOpen?.();
        }}
        aria-expanded={open}
        aria-label={label}
        title="In your inventory"
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 cursor-pointer transition-colors ${tone}`}
      >
        <svg className="w-[11px] h-[11px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        {stocked}/{quotable}
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-96 rounded-md border border-border bg-background shadow-lg p-3"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">
            In your inventory · {stocked} of {quotable} solicited part{quotable !== 1 ? "s" : ""}
          </div>
          {loading || !entries ? (
            <div className="flex items-center gap-2 py-1 text-xs text-muted">
              <div className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              Loading your stock…
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs text-muted">No stock detail available.</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {entries.map((e) => (
                  <tr key={e.key} className="align-baseline">
                    <td className="py-0.5 pr-2 data-field text-foreground whitespace-nowrap">
                      {e.identity}
                    </td>
                    <td className="py-0.5 pr-2 text-right font-semibold text-foreground whitespace-nowrap">
                      {e.summary.totalQuantity.toLocaleString()} {e.summary.unitOfMeasure}
                      {e.summary.conditionCode ? ` · ${e.summary.conditionCode}` : ""}
                    </td>
                    <td className="py-0.5 pr-2 text-muted whitespace-nowrap">
                      {e.summary.warehouse || "—"}
                      {e.summary.otherLocations > 0 && ` +${e.summary.otherLocations}`}
                    </td>
                    <td className={`py-0.5 text-right whitespace-nowrap ${e.summary.isStale ? "text-amber-700 dark:text-amber-300" : "text-muted"}`}>
                      {formatContractDate(e.summary.asOfDate)}
                      {e.summary.isStale && " ⚠"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-[11px] text-muted">
            Your own stock only. Expand the row for the full parts list
            {entries?.some((e) => e.summary.isStale) ? "; ⚠ marks a stale count — recount before quoting" : ""}.
          </p>
        </div>,
        document.body
      )}
    </>
  );
}
