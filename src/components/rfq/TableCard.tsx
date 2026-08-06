import type { ElementType, ReactNode } from "react";

/**
 * Card panel for RFQ tables, matching the bid-matching results panel: content
 * sits on a bg-card-bg card, with an optional header row (section heading,
 * filters, actions) separated by a bottom border.
 *
 * `as="section"` keeps the RFQ detail page's <section> semantics — its print
 * CSS applies break-inside: avoid per section.
 *
 * The class tokens below mirror the library's shared DataTable
 * (src/config/dataTable.config.ts styling defaults) so RFQ tables read as
 * the same family as parts/vendor search results. RFQ tables stay
 * hand-rolled — they embed controls (selects, checkboxes, expanders) and
 * server-side sort/paging DataTable doesn't support — but the visual
 * tokens are shared.
 */

/** <thead> row: library header background + border. */
export const tableHeadRowClass = "border-b border-border bg-primary/10 text-left";

/** Plain (unsortable) <th>. */
export const thClass =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted";

/** Standard data <td>. Add text color / alignment per cell as needed. */
export const tdClass = "px-3 py-2 text-xs";

/** Row hover, matching DataTable's hoverClass. */
export const rowHoverClass = "hover:bg-primary/8 transition-colors";

/**
 * Sortable column header, styled like DataTable's sort UI (chevron glyphs,
 * active column's indicator in primary). Generic over the page's sort-key
 * union so call sites keep their type safety.
 */
export function SortHeader<K extends string>({
  label, sortKey, sortBy, sortDir, onSort, className = "",
}: {
  label: string; sortKey: K; sortBy: K; sortDir: "asc" | "desc";
  onSort: (k: K) => void; className?: string;
}) {
  const active = sortBy === sortKey;
  return (
    <th className={`px-3 py-2 text-left ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide cursor-pointer select-none ${
          active ? "text-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        {label}
        <span className={active ? "text-primary" : "text-muted"}>
          {active && sortDir === "asc" ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          ) : active && sortDir === "desc" ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          )}
        </span>
      </button>
    </th>
  );
}
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
