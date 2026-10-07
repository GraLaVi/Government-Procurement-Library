// Types and code lists for the Bidding add-on.
//
// Mirrors src/bidding/schemas.py in ALAN-FastAPI-Web. Field numbers in
// comments (013, 025, ...) are DIBBS Batch Quote Upload fields; the code
// lists and their wording come from DLA's spec
// (ALAN-FastAPI-Web/docs/dibbs_batch_quote_format.html). The backend
// validates every code against the same spec, so a list here that drifts
// fails loudly on save rather than silently.

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
