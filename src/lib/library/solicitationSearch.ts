// src/lib/library/solicitationSearch.ts
//
// Types and helpers for solicitation search — SAM.gov notices with NO part link.
//
// These live outside types.ts because nothing here describes a part. The notices
// this surface covers are services, repairs, construction and the tail of supply
// buys whose NSN was never parsed, so there is no NSN, no line item, no
// manufacturer and no procurement history to model. That absence is the reason
// the results get their own table and panel instead of the parts detail page.

/** One notice in a search result list. Mirrors the API's SolicitationSearchResult. */
export interface SolicitationResult {
  opp_id: number;
  notice_id: string;
  solicitation_number: string | null;
  title: string | null;
  agency: string | null;
  sub_tier: string | null;
  office: string | null;
  notice_type: string | null;
  posted_date: string | null;
  close_date: string | null;
  is_open: boolean;
  naics_code: string | null;
  psc_code: string | null;
  set_aside_code: string | null;
  set_aside_description: string | null;
  place_of_performance_city: string | null;
  place_of_performance_state: string | null;
  /** Viewable documents. 0 is common for agencies we do not harvest yet. */
  document_count: number;
  /** The notice's page on SAM.gov — the fallback when document_count is 0. */
  ui_link: string | null;
  /** False when `description` is a bare URL rather than a body. */
  has_description_text: boolean;
  /**
   * Award / order number, on Award Notice rows. This is the number a contract
   * search matched, and the one to display for such a row — see displayNumber.
   */
  award_number: string | null;
}

/**
 * The number to show for a row, which is not always `solicitation_number`.
 *
 * On an award notice SAM records the originating RFQ in `solicitation_number`
 * and the resulting order in `award_number`, and on ~90% of awards those are
 * different numbers. Searching the award number `36C25026P0932` and being shown
 * `36C25026Q0773` is the bug this exists to prevent: the row displays a number
 * the searcher never typed and cannot place.
 */
type NumberFields = Pick<
  SolicitationResult,
  "notice_type" | "award_number" | "solicitation_number" | "notice_id"
>;

const stripPunctuation = (v: string | null | undefined) =>
  (v || "").toUpperCase().replace(/[-\s]/g, "");

/**
 * The parent contract an award was ordered against, when there is one.
 *
 * SAM publishes a task order's `award.number` as the parent contract and the
 * order number concatenated with no separator — `GS35F235BA` + `36C24226F0091`,
 * where GS-35F-235BA is the vendor's GSA Multiple Award Schedule contract and
 * the VA ordered against it. There is no separate field in the payload; the
 * only way to see the seam is that the award number ENDS WITH the solicitation
 * number.
 *
 * Returns the prefix, punctuation stripped (these numbers are stored
 * unpunctuated in practice), or null when the award number is not a
 * concatenation. Rare — about 86 of 104k award notices — but when it happens,
 * showing the joined string is the difference between a number someone
 * recognises and one they do not.
 */
export function parentContractNumber(r: NumberFields): string | null {
  if (r.notice_type !== "Award Notice" || !r.award_number) return null;
  const award = stripPunctuation(r.award_number);
  const order = stripPunctuation(r.solicitation_number);
  if (!order || award.length <= order.length || !award.endsWith(order)) return null;
  return award.slice(0, award.length - order.length);
}

/**
 * The number to show for a row, which is not always `solicitation_number`.
 *
 * On an award notice SAM records the originating RFQ in `solicitation_number`
 * and the resulting order in `award_number`, and on ~90% of awards those are
 * different numbers. Searching the award number `36C25026P0932` and being shown
 * `36C25026Q0773` is the bug this exists to prevent: the row displays a number
 * the searcher never typed and cannot place.
 *
 * The exception is a task order against a parent contract, where `award_number`
 * is the two concatenated. There the ORDER number is what was searched and what
 * identifies the buy; the parent belongs beside it, not glued to its front.
 */
export function displayNumber(r: NumberFields): string {
  if (r.notice_type === "Award Notice" && r.award_number) {
    if (parentContractNumber(r) && r.solicitation_number) return r.solicitation_number;
    return r.award_number;
  }
  return r.solicitation_number || r.notice_id;
}

/** One notice in full, for the detail panel. */
export interface SolicitationDetailResult extends SolicitationResult {
  description: string | null;
  department_name: string | null;
  place_of_performance_zip: string | null;
  place_of_performance_country: string | null;
  archive_date: string | null;
  primary_contact: SamContact | null;
  secondary_contact: SamContact | null;
  /**
   * Award fields, populated on Award Notice rows (reached via the
   * contract-number lookup). `award_amount` is TEXT in the source column and
   * free-form as SAM publishes it — parse defensively, never assume a number.
   */
  award_number: string | null;
  award_amount: string | null;
  awardee_name: string | null;
  awardee_cage: string | null;
  awardee_uei: string | null;
}

/** SAM publishes award_amount as free text; only format it when it really is a number. */
export function parseAwardAmount(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && cleaned !== "" ? n : null;
}

/** SAM stores contacts as free-form JSON; every field is optional in practice. */
export interface SamContact {
  fullName?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  [key: string]: unknown;
}

/** Exact-number lookup. Adds what the number matched and we refused to return. */
export interface SolicitationLookupResponse extends SolicitationSearchResponse {
  /**
   * Notice types this number DID match but that are not solicitations —
   * typically ["Award Notice"]. Empty means the number matched nothing at all.
   * The difference is the difference between an answer and a typo.
   */
  excluded_notice_types: string[];
}

export interface SolicitationSearchResponse {
  results: SolicitationResult[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export type SolicitationStatus = 'open' | 'closed' | 'all';
export type SolicitationSort = 'closing' | 'posted' | 'relevance';

/** Everything the filter rail controls. Kept flat so it round-trips through URL params. */
export interface SolicitationFilters {
  naics: string;
  psc: string;
  set_aside: string;
  agency: string;
  state: string;
  status: SolicitationStatus;
  posted_from: string;
  posted_to: string;
  /** null = no preference; true/false = has / has no viewable documents. */
  has_documents: boolean | null;
}

export const EMPTY_SOLICITATION_FILTERS: SolicitationFilters = {
  naics: '',
  psc: '',
  set_aside: '',
  agency: '',
  state: '',
  status: 'open',
  posted_from: '',
  posted_to: '',
  has_documents: null,
};

// Agency labels the backend can emit, for the filter dropdown. This list has to
// match SAM_SEARCH_AGENCY_LABEL_CASES in the API's sam_scope.py: the filter
// compares against the rendered label, so a label spelled differently here
// silently matches nothing rather than erroring.
export const SOLICITATION_AGENCIES = [
  'Navy',
  'Army',
  'Air Force',
  'DLA',
  'Veterans Affairs',
  'Homeland Security',
  'Interior',
  'Health & Human Services',
  'Agriculture',
] as const;

/** True when any filter differs from the default, used to show a "clear" affordance. */
export function hasActiveFilters(f: SolicitationFilters): boolean {
  return (
    f.naics !== '' || f.psc !== '' || f.set_aside !== '' || f.agency !== '' ||
    f.state !== '' || f.posted_from !== '' || f.posted_to !== '' ||
    f.has_documents !== null || f.status !== 'open'
  );
}

/** Build the query string for /api/library/sam-opportunities/search. */
export function buildSolicitationSearchParams(
  keyword: string,
  filters: SolicitationFilters,
  sort: SolicitationSort,
  page: number,
  pageSize: number
): URLSearchParams {
  const params = new URLSearchParams();
  const q = keyword.trim();
  if (q) params.set('q', q);
  if (filters.naics.trim()) params.set('naics', filters.naics.trim());
  if (filters.psc.trim()) params.set('psc', filters.psc.trim());
  if (filters.set_aside.trim()) params.set('set_aside', filters.set_aside.trim());
  if (filters.agency) params.set('agency', filters.agency);
  if (filters.state.trim()) params.set('state', filters.state.trim().toUpperCase());
  if (filters.posted_from) params.set('posted_from', filters.posted_from);
  if (filters.posted_to) params.set('posted_to', filters.posted_to);
  if (filters.has_documents !== null) params.set('has_documents', String(filters.has_documents));
  params.set('status', filters.status);
  // Relevance needs something to rank against; the API falls back to closing
  // date without a keyword, and asking for it anyway would make the sort
  // control lie about what the table is doing.
  params.set('sort', sort === 'relevance' && !q ? 'closing' : sort);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  return params;
}

/** "in 5 days" / "today" / "closed 3 days ago" for the close-date column. */
export function describeCloseDate(closeDate: string | null, isOpen: boolean): string {
  if (!closeDate) return isOpen ? 'No deadline posted' : '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Date-only string: parse as local midnight, not UTC, so a deadline does not
  // read as a day early for anyone west of Greenwich.
  const [y, m, d] = closeDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  const close = new Date(y, m - 1, d);
  const days = Math.round((close.getTime() - today.getTime()) / 86400000);
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  if (days > 1) return `Closes in ${days} days`;
  if (days === -1) return 'Closed yesterday';
  return `Closed ${Math.abs(days)} days ago`;
}

/**
 * Urgency class for the close-date cell. Null when there is nothing to stress.
 *
 * Red is reserved for a deadline you can still act on and nearly cannot — the
 * bid-matching table deliberately renders already-closed solicitations muted
 * rather than red, on the grounds that a passed deadline is an ordinary
 * lifecycle stage and colouring it alarms without informing. Same rule here:
 * closed is muted, and the colour goes to the rows where three days left
 * actually changes what someone does today.
 */
export function closeDateTone(closeDate: string | null): string | null {
  if (!closeDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = closeDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  const days = Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86400000);
  if (days < 0) return 'text-muted';
  if (days <= 3) return 'text-error font-medium';
  if (days <= 7) return 'text-warning font-medium';
  return null;
}
