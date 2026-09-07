/**
 * Class tokens for the analytics dashboard's card-and-table widgets.
 *
 * ---------------------------------------------------------------------------
 * Why these are separate from components/rfq/TableCard, which calls itself the
 * app's one table style:
 *
 * An analytics table is not a table on a page — it IS its own card. The shell
 * below carries the border and radius, the header block carries the title, and
 * the table runs edge to edge inside them with no border of its own. That is
 * what makes the padding load-bearing: `px-6` on a cell is the same gutter as
 * `px-6` on the card header directly above it and `p-6` on every KPICard and
 * chart card beside it in the dashboard grid, so the first column lines up with
 * the card title. Dropping to the RFQ tables' `px-2.5` would misalign all
 * twelve widgets against their own headers and their neighbours.
 *
 * So: same typographic decisions as TableCard — sentence-case headers at the
 * body size rather than tracked micro-caps, one neutral header band, one hover
 * — expressed at the dashboard's own scale.
 *
 * Changing a token here changes every analytics widget. Don't respell padding
 * or borders at the call site; pass extra classes only for per-column concerns
 * (alignment, whitespace-nowrap, tabular-nums, a max-width).
 * ---------------------------------------------------------------------------
 */

/** Card shell for a widget whose body is a table (table meets the card edge). */
export const analyticsCardClass =
  "bg-card-bg rounded-xl border border-border overflow-hidden";

/** Card shell for the empty state, which has no table to run to the edge. */
export const analyticsCardPaddedClass =
  "bg-card-bg rounded-xl border border-border p-6";

/** Title block above the table. Its px-6 is the gutter the cells match. */
export const analyticsCardHeaderClass = "px-6 py-4 border-b border-border";

/** Scroll container. The card owns the border, so this adds none. */
export const analyticsTableWrapClass = "overflow-x-auto";

/** The <table> itself. */
export const analyticsTableClass = "w-full text-sm";

/** <thead> row. */
export const analyticsTheadRowClass = "border-b border-border bg-muted-light";

/**
 * Plain <th>. Sentence case at the body size, not tracked micro-caps: column
 * labels read as labels without shouting. Right-aligned numeric columns pass
 * `!text-right` — the override is needed because text-left is baked in here.
 */
export const analyticsThClass =
  "px-6 py-3 text-left font-semibold text-foreground";

/** Standard data <td>. Add text color / alignment per cell as needed. */
export const analyticsTdClass = "px-6 py-3";

/**
 * Data row: hover only. The separator stays on `<tbody className="divide-y
 * divide-border">`, which already handles the last row correctly — unlike the
 * RFQ tables, which fold a border-b into the row token instead.
 */
export const analyticsRowClass = "hover:bg-muted-light/50 transition-colors";
