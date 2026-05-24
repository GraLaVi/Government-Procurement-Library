// Amendment vocabulary + helpers shared by AmendmentTimeline and the
// row-level "amended" indicator. Stable values written by the worker —
// don't extend or rename without coordinating with ALAN-Worker.

export type AmendmentSource = "dibbs" | "sam";

export type AmendmentChangeReason =
  | "new_item"
  | "set_aside_change"
  | "status_change"
  | "close_date_change"
  | "issue_date_change"
  | "metadata";

export interface AmendmentEntry {
  id: number;
  solicitation_id: number;
  solicitation_number: string | null;
  amendment_number: number;
  detected_at: string;
  source: AmendmentSource | string;
  change_reason: AmendmentChangeReason | string;
  changed_fields: string[];
  prior_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  sam_notice_id: string | null;
}

export interface SolicitationAmendmentsResponse {
  solicitation_id: number;
  solicitation_number: string | null;
  amendments: AmendmentEntry[];
}

export interface SolicitationAmendmentSummary {
  solicitation_id: number;
  amendment_count: number;
  latest_detected_at: string | null;
  latest_change_reason: string | null;
}

export const CHANGE_REASON_LABELS: Record<string, string> = {
  new_item: "New line item added",
  set_aside_change: "Set-aside changed",
  status_change: "Status changed",
  close_date_change: "Close date changed",
  issue_date_change: "Issue date changed",
  metadata: "Metadata updated",
};

// Human labels for the raw column names we see in `changed_fields` and
// the `prior_state` / `new_state` JSONB keys. Falls back to title-cased
// column name when no override exists.
export const FIELD_LABELS: Record<string, string> = {
  close_date: "Close date",
  issue_date: "Issue date",
  status: "Status",
  // Both keys render with the same user-facing label. set_aside_code is the
  // canonical key written by the worker post-refactor; set_aside is the
  // legacy key on historical rows.
  set_aside: "Set-aside",
  set_aside_code: "Set-aside",
  set_aside_description: "Set-aside description",
  buyer_name: "Buyer",
  agency_code: "Agency",
  new_item: "Line item",
  part_id: "Part",
  first_pr_number: "PR number",
};

// Field keys (and their legacy aliases) that store canonical set-aside codes
// resolvable against code_definitions where code_type='SET_ASIDE'.
export const SET_ASIDE_FIELD_KEYS: ReadonlySet<string> = new Set([
  "set_aside",
  "set_aside_code",
]);

export function isSetAsideField(key: string): boolean {
  return SET_ASIDE_FIELD_KEYS.has(key);
}

// Read an amendment field from a prior_state / new_state JSONB blob, tolerant
// of the worker's set-aside key rename (set_aside → set_aside_code). Newer
// rows store the value under `set_aside_code`; older rows store it under
// `set_aside`. Either key resolves to the same value regardless of which one
// `changed_fields` reported.
export function pickAmendmentValue(
  state: Record<string, unknown> | null | undefined,
  fieldKey: string,
): unknown {
  if (!state) return undefined;
  if (state[fieldKey] !== undefined) return state[fieldKey];
  if (fieldKey === "set_aside_code" && state.set_aside !== undefined) return state.set_aside;
  if (fieldKey === "set_aside" && state.set_aside_code !== undefined) return state.set_aside_code;
  return undefined;
}

// Resolve a raw amendment value for a set-aside field to a human label.
// Canonical worker rows store uppercase codes (e.g. "HZC") which we look up
// against the code_definitions map. Legacy rows store already-readable
// label strings (e.g. "hubzone set-aside"); for those we fall back to the
// raw string and just title-case it so it reads cleanly.
export function resolveSetAsideLabel(
  value: unknown,
  byCode: ReadonlyMap<string, { label: string }>,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  if (!trimmed) return "—";
  const hit = byCode.get(trimmed) ?? byCode.get(trimmed.toUpperCase());
  if (hit) return hit.label;
  // Legacy label like "hubzone set-aside" — title-case for readability.
  return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function labelForField(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function labelForChangeReason(reason: string): string {
  return CHANGE_REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}

// Time-ago string. Keep low-effort — falls back to a date for older
// entries so a 3-month-old amendment doesn't read "92 days ago."
export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return new Date(iso).toLocaleDateString();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Render a state value (from prior_state / new_state JSONB) for display.
// Dates and strings render as-is; nested objects fall back to JSON so
// the timeline still shows something for unexpected payload shapes.
export function renderStateValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
