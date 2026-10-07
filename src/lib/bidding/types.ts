// Types and code lists for the Bidding add-on.
//
// Mirrors src/bidding/schemas.py in ALAN-FastAPI-Web. Field numbers in
// comments (013, 025, ...) are DIBBS Batch Quote Upload fields; the code
// lists and their wording come from DLA's spec
// (ALAN-FastAPI-Web/docs/dibbs_batch_quote_format.html). The backend
// validates every code against the same spec, so a list here that drifts
// fails loudly on save rather than silently.

import type { BidTermDefinitions, SolicitationBidTerms } from "@/lib/library/bidTerms";
import type { RfqWonPart } from "@/lib/rfq/types";

export interface BiddingProfileFields {
  small_business_rep: string | null; // 013
  joint_venture: string | null; // 018
  joint_venture_remarks: string | null; // 019
  affirmative_action: string | null; // 021
  previous_contracts: string | null; // 022
  alternate_disputes: string | null; // 023
  payment_discount_terms: string | null; // 025
  default_days_quote_valid: number | null; // 027
  boa_fss_bpa: string | null; // 029
  boa_contract_number: string | null; // 030
  boa_expiration_date: string | null; // 031, ISO date
  fob_city: string | null; // 033
  fob_state: string | null; // 034
  fob_country: string | null; // 035
  inspection_packaging_cage: string | null; // 037
  inspection_supplies_cage: string | null; // 038
  child_labor_cert: string | null; // 120
  /** Not a DIBBS field: added to a vendor's lead time to suggest 051. */
  default_handling_days: number | null;
}

export interface BiddingProfile extends BiddingProfileFields {
  id: number;
  cage_code: string;
  is_default: boolean;
  updated_at: string | null;
}

export interface BiddingProfileSuggestion extends BiddingProfileFields {
  cage_code: string;
  /** field -> where the suggested value came from */
  sources: Record<string, string>;
}

export interface BiddingProfilesOverview {
  profiles: BiddingProfile[];
  /** CAGEs a profile may be kept for. v1: the company's own CAGE only. */
  allowed_cages: string[];
  /** Customer admins only — a profile is the company's representations to DLA. */
  can_edit: boolean;
}

export const EMPTY_PROFILE_FIELDS: BiddingProfileFields = {
  small_business_rep: null,
  joint_venture: null,
  joint_venture_remarks: null,
  affirmative_action: null,
  previous_contracts: null,
  alternate_disputes: null,
  payment_discount_terms: null,
  default_days_quote_valid: null,
  boa_fss_bpa: null,
  boa_contract_number: null,
  boa_expiration_date: null,
  fob_city: null,
  fob_state: null,
  fob_country: null,
  inspection_packaging_cage: null,
  inspection_supplies_cage: null,
  child_labor_cert: null,
  default_handling_days: null,
};

export interface CodeOption {
  value: string;
  label: string;
}

// 013 Small Business and Other Contractor Representations
export const SMALL_BUSINESS_REP_OPTIONS: CodeOption[] = [
  { value: "A", label: "A — Large Business / Other Business" },
  { value: "B", label: "B — Small Business" },
  { value: "C", label: "C — Nonprofit Institution" },
  { value: "E", label: "E — Educational Institution (other than HBCU or Minority)" },
  { value: "F", label: "F — Historically Black College or University (HBCU)" },
  { value: "G", label: "G — JWOD Participating Nonprofit Agency" },
  { value: "M", label: "M — Small Disadvantaged Business" },
  { value: "P", label: "P — Minority Institution (other than HBCU)" },
  { value: "X", label: "X — Intragovernmental" },
];

// 018 Joint Venture
export const JOINT_VENTURE_OPTIONS: CodeOption[] = [
  { value: "JV", label: "JV — Is a joint venture complying with 13 CFR 121.103(h) and 125" },
  { value: "JN", label: "JN — Is not such a joint venture" },
];

// 021 Affirmative Action Compliance
export const AFFIRMATIVE_ACTION_OPTIONS: CodeOption[] = [
  { value: "Y6", label: "Y6 — Developed and on file" },
  { value: "N6", label: "N6 — Not developed and not on file" },
  { value: "NH", label: "NH — No previous contracts subject to the requirements" },
  { value: "NA", label: "NA — Not applicable" },
];

// 022 Previous Contracts and Compliance Reports
export const PREVIOUS_CONTRACTS_OPTIONS: CodeOption[] = [
  { value: "Y4", label: "Y4 — Participated and filed" },
  { value: "Y5", label: "Y5 — Participated and not filed" },
  { value: "N4", label: "N4 — Not participated" },
  { value: "NA", label: "NA — Not applicable" },
];

// 023 Alternate Disputes Resolution (DLAD 5452.233-9001)
export const ALTERNATE_DISPUTES_OPTIONS: CodeOption[] = [
  { value: "A", label: "A — Agree to use alternate dispute resolution" },
  { value: "B", label: "B — Do not agree" },
];

// 025 Prompt Payment Discount Terms
export const PAYMENT_TERMS_OPTIONS: CodeOption[] = [
  { value: "1", label: "Net 30" },
  { value: "10", label: "2% 10 days" },
  { value: "3", label: "1/2% 20 days" },
  { value: "6", label: "1/2% 10 days" },
  { value: "8", label: "1/4% 20 days" },
];

// 029 BOA / FSS / BPA
export const BOA_FSS_BPA_OPTIONS: CodeOption[] = [
  { value: "NAP", label: "Not applicable" },
  { value: "BOA", label: "Basic Ordering Agreement (BOA)" },
  { value: "FSS", label: "Federal Supply Schedule (FSS)" },
  { value: "BPA", label: "Blanket Purchase Agreement (BPA)" },
];

// 120 Child Labor Certification (FAR 52.222-18)
export const CHILD_LABOR_OPTIONS: CodeOption[] = [
  { value: "N", label: "N — No" },
  {
    value: "U",
    label: "U — May supply, but not aware of any such use of child labor based on good-faith effort",
  },
  { value: "Y", label: "Y — Yes (makes every quote a Bid With Exception)" },
];

// ============================================================================
// Bids (plan Part 4)
// ============================================================================

export type BidStatus =
  | "draft" | "queued" | "exported" | "verified" | "submitted" | "rejected" | "withdrawn" | "expired";

export type BidTab = "ready" | "sent" | "accepted" | "rejected" | "withdrawn";

export const BID_TABS: { id: BidTab; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "sent", label: "Sent" },
  { id: "accepted", label: "Accepted" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
];

/** Status wording that says who uploads (decision 28): sending queues the
 *  bid for OUR upload; it has not reached DLA yet. */
export const BID_STATUS_LABELS: Record<BidStatus, string> = {
  draft: "Draft",
  queued: "Sent — waiting for DIBBS upload",
  exported: "Sent — waiting for DIBBS upload",
  verified: "Checked by DIBBS",
  submitted: "Submitted to DIBBS",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

export const BID_TYPE_LABELS: Record<string, string> = {
  BI: "Bid Without Exception",
  BW: "Bid With Exception",
  AB: "Alternate Bid",
  DQ: "No Bid",
};

export interface BidIssue {
  severity: "error" | "warning";
  field: number | null;
  message: string;
  line_id: number | null;
  product_key: string | null;
}

export interface BidLine {
  id: number;
  line_number: string | null;
  pr_number: string | null;
  nsn_part: string | null;
  nsn_part_key: string | null;
  unit_of_issue: string | null;
  solicited_quantity: number | null;
  required_delivery_days: number | null;
  permitted_variance_plus: number | null;
  permitted_variance_minus: number | null;
  quantity: number | null;
  unit_price: string | null; // Decimal, as a string
  delivery_days: number | null;
  first_article_waiver: string | null;
  is_no_bid: boolean;
  is_first_article: boolean;
  source_rfq_response_line_item_id: number | null;
  rfq_price_now: string | null;
  rfq_price_changed: boolean;
  editable_solicitation_fields: string[];
}

export interface BidPriceBreak {
  range_no: number;
  lower_quantity: number | null;
  upper_quantity: number | null;
  unit_price: string | null;
}

export interface BidProduct {
  id: number;
  nsn_part_key: string;
  is_pseudo_item: boolean;
  bidding_part_profile_id: number | null;
  values: Record<string, string | number | null>;
  inherited: string[];
  price_breaks: BidPriceBreak[];
  editable_solicitation_fields: string[];
}

export interface BidDetail {
  id: number;
  reference_number: number;
  status: BidStatus;
  version: number;
  solicitation_id: number | null;
  quote_for_cage: string;
  supersedes_bid_id: number | null;
  rfq_solicitation_work_id: number | null;
  header: Record<string, string | number | boolean | null>;
  editable_solicitation_fields: string[];
  bid_type_code: string;
  bid_type_name: string;
  bid_type_reasons: string[];
  variance_question: boolean;
  lines: BidLine[];
  products: BidProduct[];
  issues: BidIssue[];
  can_send: boolean;
  created_by_user_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  queued_at: string | null;
  dibbs_reason: string | null;
}

export interface BidCreateResponse {
  created: boolean;
  bid: BidDetail;
}

export interface BidSummary {
  id: number;
  reference_number: number;
  status: BidStatus;
  version: number;
  solicitation_id: number | null;
  solicitation_number: string | null;
  return_by_date: string | null;
  line_count: number;
  nsn_part: string | null;
  quantity: number | null;
  unit_price: string | null;
  delivery_days: number | null;
  bid_type_code: string | null;
  error_count: number;
  warning_count: number;
  first_error: string | null;
  can_quick_edit: boolean;
  rfq_price_changed: boolean;
  created_by_user_id: number | null;
  created_by_name: string | null;
  queued_at: string | null;
  dibbs_reason: string | null;
}

export interface BidPage {
  items: BidSummary[];
  total: number;
  counts: Record<BidTab, number>;
}

export interface BidContributor {
  user_id: number;
  name: string;
  bid_count: number;
}

export interface BidSendResult {
  queued: number[];
  failed: { id: number; reference_number: number | null; errors: string[] }[];
}

/** Bid on matches: the views over the team's matched solicitations. */
export type MatchView = "to_bid" | "started" | "all";

/** One matched DIBBS solicitation (GET /bidding/matches): the Send RFQs row's
 *  solicitation facts and badges, plus the latest bid on it. */
export interface MatchRow {
  solicitation_id: number;
  solicitation_number: string | null;
  agency_code: string | null;
  issue_date: string | null;
  close_date: string | null;
  status: string | null;
  buyer_name: string | null;
  set_aside: string | null;
  set_aside_code: string | null;
  set_aside_label: string | null;
  solicitation_type: string | null;
  solicitation_type_label: string | null;
  bid_terms?: SolicitationBidTerms | null;
  has_pdf: boolean;
  has_amendment_indicator: boolean;
  has_post_match_amendment: boolean;
  latest_post_match_amendment_at: string | null;
  match_count: number;
  last_matched_at: string | null;
  estimated_value: number | null;
  pr_numbers: string[];
  first_article: boolean;
  won_part_count: number;
  last_won_on: string | null;
  won_parts: RfqWonPart[];
  /** RFQ Enterprise priced it: "Bid" starts from those prices. */
  rfq_priced: boolean;
  bid_id: number | null;
  bid_reference_number: number | null;
  bid_status: BidStatus | null;
  /** The Send bids tab that lists the bid. */
  bid_tab: BidTab | null;
  bid_created_by_name: string | null;
}

export interface MatchBidder {
  user_id: number;
  name: string;
  count: number;
}

export interface MatchPage {
  items: MatchRow[];
  total: number;
  page: number;
  page_size: number;
  to_bid_count: number;
  started_count: number;
  bidders: MatchBidder[];
  bid_term_definitions?: BidTermDefinitions;
}

export interface BidPreview {
  text: string | null;
  rows: string[][];
  import_view: Record<string, Record<string, string>>;
  error: string | null;
}

export function bidReference(b: { reference_number: number; version: number }): string {
  return `BID-${b.reference_number}${b.version > 1 ? ` v${b.version}` : ""}`;
}

/** 'SPE7M526Q0821' -> 'SPE7M5-26-Q-0821', the way DLA prints it. */
export function displaySolicitationNumber(n: string | null): string {
  if (!n) return "—";
  return n.length === 13 && !n.includes("-") ? `${n.slice(0, 6)}-${n.slice(6, 8)}-${n.slice(8, 9)}-${n.slice(9)}` : n;
}

/** '6625012339212' -> '6625-01-233-9212'. Pseudo items stay as they are. */
export function displayNsn(n: string | null): string {
  if (!n) return "—";
  return /^\d{13}$/.test(n) ? `${n.slice(0, 4)}-${n.slice(4, 6)}-${n.slice(6, 9)}-${n.slice(9)}` : n;
}

// --- Code lists the editor needs (DIBBS spec wording) -----------------------

const yn = (yes: string, no: string): CodeOption[] => [
  { value: "Y", label: `Yes — ${yes}` },
  { value: "N", label: `No — ${no}` },
];

export const POINT_OPTIONS: CodeOption[] = [
  { value: "D", label: "Destination" },
  { value: "O", label: "Origin" },
];
export const MEETS_PACKAGING_OPTIONS = yn("meets the packaging requirement", "does not (Bid With Exception)");
export const NO_DO_MINIMUM_OPTIONS = yn("accept orders without a minimum quantity", "do not");
export const HUBZONE_WAIVER_OPTIONS: CodeOption[] = [
  { value: "Y", label: "Yes, request waiver" },
  { value: "N", label: "No waiver requested" },
  { value: "A", label: "Not applicable (not SBA-certified HUBZone)" },
];
export const SET_ASIDE_OPTIONS: CodeOption[] = [
  { value: "N", label: "N — Unrestricted / not set aside" },
  { value: "Y", label: "Y — Small business set-aside" },
  { value: "H", label: "H — HUBZone set-aside" },
  { value: "R", label: "R — SDVOSB set-aside" },
  { value: "L", label: "L — WOSB set-aside" },
  { value: "A", label: "A — 8(a) set-aside" },
  { value: "E", label: "E — EDWOSB set-aside" },
];
export const SOLICITATION_TYPE_OPTIONS: CodeOption[] = [
  { value: "F", label: "F — Fast Auto Evaluation" },
  { value: "P", label: "P — Auto Evaluation" },
  { value: "I", label: "I — Automated Indefinite Delivery Contract (AIDC)" },
];
export const YES_NO_OPTIONS: CodeOption[] = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];
export const HAZMAT_OPTIONS = yn("hazardous material to be delivered", "no hazardous material");
export const HAZARD_LABEL_OPTIONS: CodeOption[] = [
  { value: "1", label: "1 — Hazard Communication Standard" },
  { value: "2", label: "2 — Federal Insecticide, Fungicide and Rodenticide Act" },
  { value: "3", label: "3 — Federal Food, Drug, and Cosmetic Act" },
  { value: "4", label: "4 — Consumer Product Safety Act" },
  { value: "5", label: "5 — Federal Hazardous Substance Act" },
  { value: "6", label: "6 — Federal Alcohol Administration Act" },
  { value: "7", label: "7 — Not applicable" },
];
export const MATERIAL_OPTIONS: CodeOption[] = [
  { value: "0", label: "0 — New" },
  { value: "1", label: "1 — Other than new (used)" },
  { value: "2", label: "2 — Reconditioned" },
  { value: "3", label: "3 — Remanufactured" },
  { value: "4", label: "4 — Unused former Government surplus" },
];
export const END_PRODUCT_OPTIONS: CodeOption[] = [
  { value: "D", label: "D — Domestic end product" },
  { value: "Q", label: "Q — Qualifying country end product" },
  { value: "NQ", label: "NQ — Non-qualifying country end product" },
  { value: "N", label: "N — Free Trade Agreement country end product" },
  { value: "QA", label: "QA — Qualifying country end product (FTA)" },
  { value: "O", label: "O — Other foreign end product" },
  { value: "C", label: "C — Canadian end product" },
  { value: "QE", label: "QE — Qualifying country end product (FTA, except Canada)" },
  { value: "P", label: "P — Free Trade Agreement country end product (ALT IV)" },
  { value: "US", label: "US — US-made end product" },
  { value: "QD", label: "QD — Qualifying country end product (Trade Agreements)" },
  { value: "DE", label: "DE — Designated country end product" },
  { value: "ND", label: "ND — Non-designated country end product" },
];
export const MANUFACTURER_DEALER_OPTIONS: CodeOption[] = [
  { value: "DD", label: "DD — Dealer" },
  { value: "MM", label: "MM — Manufacturer" },
  { value: "QD", label: "QD — Qualified Supplier List dealer" },
  { value: "QM", label: "QM — Qualified Supplier List manufacturer" },
];
export const PART_OFFERED_OPTIONS: CodeOption[] = [
  { value: "1", label: "1 — Exact product" },
  { value: "2", label: "2 — Alternate product (makes this an Alternate Bid)" },
  { value: "3", label: "3 — Superseding P/N, administrative change only" },
  { value: "4", label: "4 — Superseding P/N, minor or no configuration change" },
  { value: "5", label: "5 — Previously approved product" },
  { value: "6", label: "6 — CAGE in error: same corporation, different division" },
  { value: "7", label: "7 — CAGE in error: sold to a different corporation" },
  { value: "8", label: "8 — Part number not recognized" },
  { value: "9", label: "9 — Obsolete part number" },
  { value: "A", label: "A — Other CAGE/PN correction" },
];
export const SUPPLIES_OFFERED_OPTIONS: CodeOption[] = [
  { value: "1", label: "1 — In accordance with every spec/standard/drawing cited" },
  { value: "2", label: "2 — Based on a different revision" },
  { value: "3", label: "3 — Based on changes to the cited documents" },
  { value: "4", label: "4 — Based on other technical data / description in error" },
];
export const HLQ_CODE_OPTIONS: CodeOption[] = [
  { value: "8", label: "8 — SAE AS9100" },
  { value: "7", label: "7 — ISO 9001:2015" },
  { value: "6", label: "6 — SAE AS9003 or tailored ISO 9001" },
  { value: "2", label: "2 — Other equivalent" },
  { value: "1", label: "1 — None (Bid With Exception)" },
];
