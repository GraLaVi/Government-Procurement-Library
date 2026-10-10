// Row highlight colors on Bid-Matching / the Bid Worklist. The account names
// up to five colors ("Ready to bid", "Need vendor quote", ...); anyone on the
// account can give a solicitation one of them, and everyone sees it — the same
// scope as the star. Stored server-side in bid_match_highlight_labels and
// bid_match_highlights.

/** The fixed palette. Keys are what the API stores; the backend validates
 *  against the same list (HIGHLIGHT_COLORS in src/bid_matching/models.py). */
export const HIGHLIGHT_PALETTE = [
  { key: "green", name: "Green", hex: "#16A34A" },
  { key: "amber", name: "Amber", hex: "#F59E0B" },
  { key: "sky", name: "Blue", hex: "#0EA5E9" },
  { key: "violet", name: "Violet", hex: "#8B5CF6" },
  { key: "rose", name: "Rose", hex: "#E11D48" },
  { key: "orange", name: "Orange", hex: "#EA580C" },
  { key: "pink", name: "Pink", hex: "#DB2777" },
  { key: "slate", name: "Gray", hex: "#64748B" },
] as const;

export type HighlightColor = (typeof HIGHLIGHT_PALETTE)[number]["key"];

export const MAX_HIGHLIGHT_LABELS = 5;

export interface HighlightLabel {
  id: number;
  name: string;
  color: HighlightColor;
}

/** What a row click does while the highlighter is on: mark with a label id,
 *  or clear. null means the highlighter is off. */
export type HighlightBrush = number | "erase" | null;

/** The "Show" filter: one label's rows, rows with no color, or everything. */
export type HighlightFilter = number | "none" | null;

export function highlightHex(color: string): string {
  return HIGHLIGHT_PALETTE.find((p) => p.key === color)?.hex ?? "#64748B";
}

/** The `highlight` query value the API takes, or null for no filter. */
export function highlightFilterParam(filter: HighlightFilter): string | null {
  return filter == null ? null : String(filter);
}

export function parseHighlightFilter(value: string | null): HighlightFilter {
  if (value === "none") return "none";
  const n = Number(value);
  return value && Number.isInteger(n) && n > 0 ? n : null;
}

/** Whether a row's color passes the filter. */
export function matchesHighlightFilter(highlightId: number | null | undefined, filter: HighlightFilter): boolean {
  if (filter == null) return true;
  if (filter === "none") return highlightId == null;
  return highlightId === filter;
}
