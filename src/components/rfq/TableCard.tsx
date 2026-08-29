import type { ElementType, ReactNode } from "react";

/**
 * Card panel for RFQ tables, matching the bid-matching results panel: content
 * sits on a bg-card-bg card, with an optional header row (section heading,
 * filters, actions) separated by a bottom border.
 *
 * `as="section"` keeps the RFQ detail page's <section> semantics — its print
 * CSS applies break-inside: avoid per section.
 *
 * ---------------------------------------------------------------------------
 * The class tokens below are the app's ONE table style, taken from the
 * bid-matching results table. Every hand-rolled table imports them rather than
 * spelling out padding and borders, which is how /rfq, /rfq/worklist and
 * /rfq/coverage ended up looking like three different products: a bg-primary/10
 * uppercase header on one, a bg-card-bg/60 sentence-case header on another, and
 * a third set of paddings on the third.
 *
 * Changing a token here changes every table. That is the point — don't
 * override padding or borders at the call site; pass extra classes only for
 * per-column concerns (alignment, whitespace-nowrap, a width).
 *
 * These stay hand-rolled rather than moving to the library's DataTable: they
 * embed controls (selects, checkboxes, row expanders) and server-side
 * sort/paging that DataTable does not support.
 * ---------------------------------------------------------------------------
 */

/** Scroll container. Wide tables scroll inside their own border, never the page. */
export const tableWrapClass = "overflow-x-auto rounded-lg border border-border";

/** The <table> itself. */
export const tableClass = "w-full text-xs";

/** <thead> row. */
export const tableHeadRowClass = "bg-muted-light border-b border-border";

/** Plain (unsortable) <th>. */
export const thClass = "text-left px-2.5 py-1.5 font-semibold text-foreground";

/** Standard data <td>. Add text color / alignment per cell as needed. */
export const tdClass = "px-2.5 py-1.5";

/** Data row: separator plus hover. */
export const rowClass = "border-b border-border last:border-0 hover:bg-muted-light/50 transition-colors";

/**
 * Sortable column header. Generic over the page's sort-key union so call sites
 * keep their type safety.
 */
export function SortHeader<K extends string>({
  label, sortKey, sortBy, sortDir, onSort, align = "left", className = "", title,
}: {
  label: string; sortKey: K; sortBy: K; sortDir: "asc" | "desc";
  onSort: (k: K) => void; align?: "left" | "right"; className?: string;
  /** What the column means, when the label alone is ambiguous ("Bid due" vs
   *  "Quote due"). Sits on the header; the button keeps its "Sort by …" hint. */
  title?: string;
}) {
  const active = sortBy === sortKey;
  return (
    // Written out in full — Tailwind scans for complete class names, so a
    // `text-${align}` template would never be generated.
    <th
      className={`${align === "right" ? "text-right" : "text-left"} px-2.5 py-1.5 font-semibold text-foreground ${className}`}
      title={title}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Sort by ${label.toLowerCase()}`}
        className={`inline-flex items-center gap-1 font-semibold cursor-pointer select-none ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-foreground" : "text-foreground/70 hover:text-foreground"}`}
      >
        {label}
        {/* The inactive arrow stays faint rather than absent so the column
            reads as sortable before it is clicked. */}
        <svg
          className={`w-3 h-3 shrink-0 ${active ? "text-primary" : "text-muted/40"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={active && sortDir === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
          />
        </svg>
      </button>
    </th>
  );
}
/** Compact filter <select> in a TableCard header. Lives here rather than in
 *  one page so every table that grows a filter row looks like the others —
 *  it was defined privately in the RFQ worklist until the inventory Items tab
 *  needed the same control. */
export const filterSelectClass =
  "px-1.5 py-0.5 rounded border border-border bg-card-bg text-card-foreground text-xs cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

export function TableCard({
  as: Tag = "div",
  header,
  children,
  className = "",
}: {
  as?: ElementType;
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag className={`bg-card-bg rounded-lg border border-border p-4 ${className}`}>
      {header && (
        <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-border">
          {header}
        </div>
      )}
      {children}
    </Tag>
  );
}
