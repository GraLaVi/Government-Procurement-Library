// Vendor Search Types

export type VendorSearchType = 'cage' | 'uei' | 'entity_name';

export interface VendorSearchResult {
  cage_code: string;
  uei: string | null;
  duns: string | null;
  legal_business_name: string | null;
  dba_name: string | null;
  city: string | null;
  state: string | null;
  sam_status: string | null;
  small_business: boolean | null;
}

export interface VendorSearchResponse {
  results: VendorSearchResult[];
  total: number;
  // True when more than `total` vendors matched and the backend stopped
  // counting at its 100 cap — render the count as "100+". Optional so a
  // frontend deployed ahead of the API just shows the plain number.
  total_capped?: boolean;
  limit: number;
  offset: number;
}

export interface VendorAddress {
  address_type: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  postal_code_ext: string | null;
  country_code: string | null;
  congressional_district: string | null;
}

export interface VendorContact {
  contact_type: string;
  first_name: string | null;
  middle_initial: string | null;
  last_name: string | null;
  title: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
}

export interface VendorAward {
  contract_number: string;
  pr_number: string | null;
  award_date: string;
  niin: string | null;
  fsc: string | null;
  description: string | null;
  award_quantity: number;
  unit_price: number;
  total_value: number;
  agency_code: string | null;
  has_pdf?: boolean;
  order_detail_id?: number | null;
}

export interface VendorAwardsResponse {
  cage_code: string;
  awards: VendorAward[];
  total_count: number;
}

export interface VendorBookingMonth {
  month_ending: string;
  month_label: string;
  dscp_booked: number;
  dscp_rank: number | null;
  dscr_booked: number;
  dscr_rank: number | null;
  dscc_booked: number;
  dscc_rank: number | null;
  other_booked: number;
  other_rank: number | null;
  month_total: number;
}

export interface VendorBookingTotals {
  dscp_total: number;
  dscr_total: number;
  dscc_total: number;
  other_total: number;
  grand_total: number;
}

export interface VendorBookingsResponse {
  cage_code: string;
  months: VendorBookingMonth[];
  totals: VendorBookingTotals;
}

export interface VendorSolicitation {
  solicitation_id: number;
  solicitation_number: string;
  agency_code: string | null;
  // Nullable because SAM.gov rows may lack a response deadline.
  close_date: string | null;
  status: string;
  // Legacy raw set-aside string. Kept for one release; prefer set_aside_label.
  set_aside: string | null;
  set_aside_code?: string | null;
  set_aside_label?: string | null;
  // DLA Solicitation Type Indicator: "F" (Fast Auto Evaluation), "P" (Auto
  // Evaluation), "I" (Automated IDC). Null/absent means UNKNOWN, not "no" —
  // never render a negative for it. Always null on SAM rows.
  solicitation_type?: string | null;
  // Label resolved from code_definitions (code_type='SOLICITATION_TYPE').
  solicitation_type_label?: string | null;
  // Free-form rating value from solicitations.rating; null on SAM rows.
  rating?: string | null;
  // Part-level fields are null on SAM rows (an opportunity can span many parts).
  quantity: number | null;
  niin: string | null;
  fsc: string | null;
  description: string | null;
  unit_price: number | null;
  estimated_value: number | null;
  has_pdf?: boolean;
  // Origin of the row: "DLA" for DIBBS solicitations, "SAM" for SAM.gov
  // opportunities linked via sam_opportunity_parts.
  source?: string;
  // SAM.gov notice type (e.g. "Sources Sought"); null for DLA rows.
  notice_type?: string | null;
  // Public SAM.gov deep link for SAM rows (sam_opportunities.ui_link); null for DLA.
  sam_url?: string | null;
  // Full SAM.gov opportunity narrative (sam_opportunities.description); shown in a
  // modal off the solicitation number. Null/absent when there's no description.
  sam_description?: string | null;
  // Count of viewable documents on a SAM opportunity; 0 for DLA rows.
  document_count?: number;
  // The vendor's matched parts on this opportunity. Populated on SAM rows
  // (an opportunity can span several of the vendor's NSNs); empty on DLA rows,
  // which carry their single NSN in the niin/fsc fields above.
  nsns?: { fsc: string | null; niin: string | null }[];
}

export interface VendorSolicitationsResponse {
  cage_code: string;
  solicitations: VendorSolicitation[];
  total_count: number;
}

export interface VendorTabCounts {
  cage_code: string;
  awards_count: number;
  bookings_count: number;
  solicitations_count: number;
}

export interface VendorCageSummaryResponse {
  search: VendorSearchResponse;
  detail: VendorDetail | null;
  tab_counts: VendorTabCounts | null;
}

export interface VendorDetail {
  cage_code: string;
  uei: string | null;
  duns: string | null;
  dodaac: string | null;
  legal_business_name: string;
  dba_name: string | null;
  entity_structure: string | null;
  entity_description: string | null;
  entity_url: string | null;
  sam_status: string | null;
  exclusion_status: boolean | null;
  registration_expiration_date: string | null;
  state_of_incorporation: string | null;
  country_of_incorporation: string | null;
  small_business: boolean | null;
  fiscal_year_end: string | null;
  data_source: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_sam_sync: string | null;
  addresses: VendorAddress[];
  contacts: VendorContact[];
  certifications?: VendorCertification[];
}

// Customer-published certification or set-aside (not from SAM)
export interface VendorCertification {
  kind: string;
  label: string;
  code: string | null;
  value: string | null;
  issued_date: string | null;
  expires_date: string | null;
}

// Search type configuration
export interface SearchTypeConfig {
  value: VendorSearchType;
  label: string;
  /** Segment label for the search bar's type switcher, where the full label
   * would crowd the row. Falls back to `label` when absent. */
  shortLabel?: string;
  description: string;
  placeholder: string;
  minLength: number;
  maxLength: number;
  pattern?: RegExp;
  patternError?: string;
}

export const SEARCH_TYPE_CONFIGS: SearchTypeConfig[] = [
  {
    value: 'cage',
    label: 'CAGE Code',
    shortLabel: 'CAGE',
    description: 'Commercial and Government Entity code',
    placeholder: 'Enter 5-character CAGE code',
    minLength: 5,
    maxLength: 5,
    pattern: /^[A-Za-z0-9]{5}$/,
    patternError: 'CAGE code must be exactly 5 alphanumeric characters',
  },
  {
    value: 'uei',
    label: 'UEI',
    description: 'Unique Entity Identifier',
    placeholder: 'Enter 12-character UEI',
    minLength: 12,
    maxLength: 12,
    pattern: /^[A-Za-z0-9]{12}$/,
    patternError: 'UEI must be exactly 12 alphanumeric characters',
  },
  {
    value: 'entity_name',
    label: 'Entity Name',
    shortLabel: 'Entity',
    description: 'Company or business name',
    placeholder: 'Enter company name (min 3 chars)',
    minLength: 3,
    maxLength: 255,
  },
];

// Helper function to get config for a search type
export function getSearchTypeConfig(type: VendorSearchType): SearchTypeConfig {
  const config = SEARCH_TYPE_CONFIGS.find((c) => c.value === type);
  if (!config) {
    throw new Error(`Unknown search type: ${type}`);
  }
  return config;
}

// Helper function to validate search input
export function validateSearchInput(
  type: VendorSearchType,
  value: string
): { valid: boolean; error?: string } {
  const config = getSearchTypeConfig(type);
  const trimmed = value.trim();

  if (trimmed.length < config.minLength) {
    return {
      valid: false,
      error: `Minimum ${config.minLength} characters required`,
    };
  }

  if (trimmed.length > config.maxLength) {
    return {
      valid: false,
      error: `Maximum ${config.maxLength} characters allowed`,
    };
  }

  if (config.pattern && !config.pattern.test(trimmed)) {
    return {
      valid: false,
      error: config.patternError || 'Invalid format',
    };
  }

  return { valid: true };
}

// Format a vendor search total for display. The API caps the count at 100 and
// sets total_capped when more matched, so a capped total renders as "100+"
// instead of claiming an exact 100.
export function formatVendorTotal(total: number, capped?: boolean): string {
  return capped ? `${total}+` : `${total}`;
}

// Helper function to build search params for API call
export function buildSearchParams(
  type: VendorSearchType,
  query: string,
  limit: number = 50,
  offset: number = 0
): URLSearchParams {
  const params = new URLSearchParams();

  // Map search type to API parameter
  switch (type) {
    case 'cage':
      params.set('cage_code', query.trim().toUpperCase());
      break;
    case 'uei':
      params.set('uei', query.trim().toUpperCase());
      break;
    case 'entity_name':
      params.set('q', query.trim());
      break;
  }

  params.set('limit', limit.toString());
  params.set('offset', offset.toString());

  return params;
}

// Month names for formatting
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Format fiscal year end from MMDD format to "Month Day"
export function formatFiscalYearEnd(value: string | null | undefined): string | null {
  if (!value || value.length !== 4) return value || null;

  const month = parseInt(value.substring(0, 2), 10);
  const day = parseInt(value.substring(2, 4), 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return value;

  return `${MONTH_NAMES[month - 1]} ${day}`;
}

// SAM Status code mappings
const SAM_STATUS_MAP: Record<string, string> = {
  'A': 'Active',
  'I': 'Inactive',
  'E': 'Expired',
  'P': 'Pending',
  'S': 'Suspended',
  'D': 'Deleted',
};

// Format SAM status code to full text
export function formatSamStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  return SAM_STATUS_MAP[status.toUpperCase()] || status;
}

// A solicitation number as a PIID: issuing office, fiscal year, instrument
// type, serial. SAM and NECO both hand us the unpunctuated form, so restore
// the dashes people read it by. Anything already punctuated, or not matching
// the shape, is left exactly as it came.
const PIID_PATTERN = /^([A-Z][A-Z0-9]{5})(\d{2})([A-Z])([A-Z0-9]{3,})$/;

export function formatSolicitationNumber(value: string | null | undefined): string {
  if (!value) return '—';
  if (value.includes('-')) return value;
  const m = PIID_PATTERN.exec(value);
  return m ? `${m[1]}-${m[2]}-${m[3]}-${m[4]}` : value;
}

// Contact type mappings
const CONTACT_TYPE_MAP: Record<string, string> = {
  'govt_business': 'Government Business',
  'electronic_business': 'Electronic Business',
  'past_performance': 'Past Performance',
  'alternate_govt_business': 'Alternate Government Business',
  'alternate_electronic_business': 'Alternate Electronic Business',
  'alternate_past_performance': 'Alternate Past Performance',
};

// Format contact type to display name
export function formatContactType(type: string | null | undefined): string {
  if (!type) return 'Contact';
  return CONTACT_TYPE_MAP[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Format NIIN with dashes: 000010882 → 00-001-0882 (XX-XXX-XXXX)
export function formatNiin(niin: string | null | undefined): string | null {
  if (!niin || niin.length !== 9) return niin || null;
  return `${niin.slice(0, 2)}-${niin.slice(2, 5)}-${niin.slice(5)}`;
}

// Format currency
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

// Format number with commas
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

// Format date as "Nov 15, 2024".
// Parses "YYYY-MM-DD" (Postgres DATE serialization) as a local-calendar date
// so US-timezone users don't see the day shifted back by one — `new Date("2026-05-07")`
// would otherwise be UTC midnight, which toLocaleDateString renders as May 6 locally.
export function formatAwardDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr.slice(0, 10)) && !dateStr.includes('T');
  let date: Date;
  if (dateOnly) {
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(dateStr);
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// Parts Search Types
// ============================================================================

export type PartsSearchType = 'nsn_niin' | 'solicitation' | 'mfg_part_number' | 'contract_number' | 'description';

export interface PartSearchResult {
  id: number;
  nsn: string;  // "" for NSN-less (DIBBS part-number-only) parts — address these via partKey()/id
  niin: string | null;
  fsc: string | null;
  mfg_cage: string | null;         // manufacturer CAGE — part identity when there is no NSN
  mfg_part_number: string | null;  // manufacturer part number — part identity when there is no NSN
  description: string | null;
  unit_of_issue: string | null;
  unit_price: number | null;

  // Key code fields for search results
  psclas: string | null;  // Product or Service Class
  nscode: string | null;  // NSN Status Code

  // Only populated when searching by solicitation: sum of requested_quantity on that solicitation
  quantity?: number | null;
}

export interface PartSearchResponse {
  results: PartSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface PartDetail {
  id: number;
  nsn: string;
  niin: string | null;
  fsc: string | null;
  fsc_description: string | null;  // FSC description for the Overview-tab hover tooltip
  description: string | null;
  unit_of_issue: string | null;
  unit_price: number | null;
  gac: number | null;  // Group Acquisition Code

  // Status and classification codes
  status_code: string | null;
  pmi_code: string | null;      // Precious Metals Indicator
  hazmat_code: string | null;   // Hazardous Material Indicator Code (hmic)
  demil_code: string | null;    // Demilitarization Code
  ciic_code: string | null;     // Controlled Inventory Item Code
  criticality_code: string | null;
  adp_code: string | null;      // Automatic Data Processing Code
  esdc: string | null;          // Essential Support Data Code

  // Manufacturer info
  mfg_cage: string | null;
  mfg_part_number: string | null;
  product_class: string | null;

  // Supply chain codes
  service_agency: string | null;
  source_of_supply: string | null;  // sos
  acquisition_advice_code: string | null;  // aac
  quantity_unit_pack: string | null;  // qup
  shelf_life_code: string | null;   // slc
  repairability_code: string | null;
  acquisition_method_code: string | null;  // amcode
  pi_code: string | null;       // Place of Inspection Code (picode)
  ids_indicator: string | null; // DLA Buy Type Indicator (idsind)

  // NIIN dates
  niin_assignment_date: string | null;  // nadate
  niin_status_date: string | null;      // nsdate

  // Legacy compatibility aliases (some UI might use old names)
  psclas?: string | null;  // Product or Service Class
  amcode?: string | null;  // Acquisition Method Code (same as acquisition_method_code)
  picode?: string | null;  // Place of Inspection Code (same as pi_code)
  pmi?: string | null;     // Precious Metals Indicator (same as pmi_code)
  cc?: string | null;      // Criticality Code (same as criticality_code)
  adp?: string | null;     // ADPE Identification Code (same as adp_code)
  hmic?: string | null;    // Hazardous Material Indicator (same as hazmat_code)
  dmil?: string | null;    // Demilitarization Code (same as demil_code)
  sa?: string | null;      // Storage Activity (same as service_agency)
  sos?: string | null;     // Source of Supply (same as source_of_supply)
  aac?: string | null;     // Activity Address Code (same as acquisition_advice_code)
  qup?: string | null;     // Quality Assurance Purchase (same as quantity_unit_pack)
  slc?: string | null;     // Source of Supply Code (same as shelf_life_code)
  ciic?: string | null;    // Controlled Item Inventory Code (same as ciic_code)
  rc?: string | null;      // Retention Code (same as repairability_code)
  nscode?: string | null;  // NSN Status Code (same as status_code)
  nsdate?: string | null;  // NSN Status Date (same as niin_status_date)
  nadate?: string | null;  // Date Added (same as niin_assignment_date)
  idsind?: string | null;  // DLA Buy Type Indicator (same as ids_indicator)

  // Audit fields
  created_at: string | null;
  updated_at: string | null;
}

// ============================================================================
// Procurement Item Description Types
// ============================================================================

export interface SDDTBlock {
  id: number;
  title: string;
  text_content: string;
  sequence_number: number;
}

export interface ProcurementItemDescription {
  description: string | null;
  pid_type: string | null;
  has_description: boolean;
  sddt_blocks: SDDTBlock[] | null;
}

export interface ProcurementItemDescriptionResponse {
  nsn: string;
  description: ProcurementItemDescription | null;
}

export interface PartDetailResponse {
  part: PartDetail;
}

export interface PartProcurementRecord {
  id: number;
  contract_number: string | null;
  contract_date: string | null;
  cage_code: string | null;
  vendor_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_value: number | null;
  delivery_code: string | null;
  source_code: string | null;
  has_pdf?: boolean;
  order_detail_id?: number | null;
}

export interface PartProcurementHistoryResponse {
  nsn: string;
  records: PartProcurementRecord[];
  total_count: number;
}

// Award details for an awarded solicitation, from order_details + the awardee vendor.
// Present only when the solicitation has a linked award; drives the contract modal.
export interface SolicitationAward {
  contract_number: string | null;
  award_date: string | null;
  quantity: number | null;
  unit_of_measure: string | null;
  unit_price: number | null;
  total_value: number | null;
  awardee_cage: string | null;
  awardee_name: string | null;
}

// One posting in a SAM.gov repost chain. Offices like NAVSUP WSS publish each
// amendment as a brand-new notice (same solicitation number, new notice id, new
// deep link), so the tab collapses the chain to a single row and hands the
// superseded postings back here — including their own documents, which are not
// always re-uploaded to the newest notice.
export interface SolicitationVersion {
  solicitation_id: number;
  posted_date: string | null;
  close_date: string | null;
  notice_type: string | null;
  status: string | null;
  quantity: number | null;
  sam_url: string | null;
  document_count: number;
  // True for the posting rendered as the table row.
  is_current: boolean;
}

export interface PartSolicitation {
  solicitation_id: number;
  solicitation_number: string;
  agency_code: string | null;
  close_date: string | null;
  // For DLA rows this is dla_solicitation_items.closed_status; for SAM rows a synthesized
  // open/closed value. Shown in the Status column when the row has no award.
  status: string | null;
  // True when `status` is "closed" only because the deadline passed, while
  // DIBBS — checked within the last 24h — still lists the solicitation as open.
  // DIBBS "open" means only that it has not been awarded or cancelled; quoting
  // stops at the close date regardless. So this marks a PENDING OUTCOME and must
  // never be worded as "you can still quote it". Always false on SAM rows.
  dibbs_listed_open?: boolean;
  // When update_solicitation_statuses last resolved this solicitation on DIBBS.
  // A confirmation writes only this column, so it is the only measure of how
  // fresh `status` is. Null/absent means never checked.
  last_status_check_at?: string | null;
  // Award details when the solicitation has a linked order_details row; null otherwise.
  // When present, the contract number is shown (opening a details modal) in place of status.
  award?: SolicitationAward | null;
  // Legacy raw set-aside string. Kept for one release; prefer set_aside_label.
  set_aside: string | null;
  set_aside_code?: string | null;
  set_aside_label?: string | null;
  // DLA Solicitation Type Indicator: "F" (Fast Auto Evaluation), "P" (Auto
  // Evaluation), "I" (Automated IDC). Null/absent means UNKNOWN, not "no" —
  // never render a negative for it. Always null on SAM rows.
  solicitation_type?: string | null;
  // Label resolved from code_definitions (code_type='SOLICITATION_TYPE').
  solicitation_type_label?: string | null;
  rating?: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  unit_price: number | null;
  estimated_value: number | null;
  buyer_name: string | null;
  buyer_email?: string | null;
  buyer_phone?: string | null;
  buyer_contact: string | null;
  purchase_req: string | null;
  has_pdf?: boolean;
  // Origin of the row: "DLA" for DIBBS solicitations, "SAM" for SAM.gov
  // opportunities linked via sam_opportunity_parts.
  source?: "DLA" | "SAM";
  // SAM.gov notice type (e.g. "Sources Sought", "Solicitation"). Null/absent for DLA.
  notice_type?: string | null;
  // Public SAM.gov deep link for SAM rows. Null/absent for DLA.
  sam_url?: string | null;
  // Number of viewable documents attached to a SAM opportunity. 0 for DLA rows.
  document_count?: number;
  // Postings collapsed into this row: 1 for a solicitation posted once, higher
  // when it was reposted (amended). Always 1 for DLA rows.
  version_count?: number;
  // The full repost chain, newest first, including the posting this row
  // represents. Empty for DLA rows and for SAM solicitations posted once.
  versions?: SolicitationVersion[];
}

export interface PartSolicitationsResponse {
  nsn: string;
  solicitations: PartSolicitation[];
  total_count: number;
}

export interface SamOpportunityDocument {
  item_id: number;
  name: string;
  kind: "file" | "link";
  is_pdf: boolean;
  mime_type: string | null;
  size: number | null;
  link_url: string | null;
}

export interface SamOpportunityDocumentsResponse {
  sam_opportunity_id: number;
  documents: SamOpportunityDocument[];
  total_count: number;
}

export interface PartManufacturer {
  cage_code: string;
  vendor_name: string | null;
  part_number: string | null;
  rncc: string | null;
  rnvc: string | null;
  is_approved_source: boolean;
  sam_status: string | null;
  registration_expiration_date: string | null;
  /** SAM health summary (Active, unexpired, not excluded). Informational —
   * never gates RFQ selection. */
  is_active: boolean;
  /** Active SAM.gov exclusion (debarment/suspension): no federal award can
   * be made to this vendor. Selectable, but warn LOUDLY. */
  is_excluded: boolean;
}

/** The strong warning for vendors with an active SAM.gov exclusion, shared
 * by every RFQ vendor picker so the wording never drifts. Exclusion =
 * debarment or suspension: federal agencies cannot award to these vendors,
 * so a quote from one is unusable unless the exclusion is lifted. */
export const EXCLUDED_VENDOR_WARNING =
  "EXCLUDED VENDOR: this vendor has an active SAM.gov exclusion (debarment or suspension). " +
  "Federal awards cannot be made to excluded vendors — a quote from them is unusable unless " +
  "the exclusion is lifted. Check SAM.gov before spending time here.";

export interface PartManufacturersResponse {
  nsn: string;
  manufacturers: PartManufacturer[];
  total_count: number;
}

export interface PartTechnicalCharacteristic {
  name: string;
  value: string | null;
  unit: string | null;
}

export interface PartTechnicalCharacteristicsResponse {
  nsn: string;
  characteristics: PartTechnicalCharacteristic[];
  total_count: number;
}

export interface EndUseDescription {
  description: string;
}

export interface PartEndUseDescriptionResponse {
  nsn: string;
  descriptions: EndUseDescription[];
  total_count: number;
}

export interface PartPackaging {
  qup: string | null;
  pres_mthd: string | null;
  clng_dry: string | null;
  presv_mat: string | null;
  wrap_mat: string | null;
  cush_dunn_mat: string | null;
  cush_dunn_thkness: string | null;
  unit_cont: string | null;
  opi: string | null;
  intrcdte_cont: string | null;
  intrcdte_cont_qty: string | null;
  special_marking_code: string | null;
  packaging_data: string | null;
  marking_text: string | null;
}

export interface PartPackagingResponse {
  nsn: string;
  packaging: PartPackaging | null;
  code_definitions: Record<string, string>;
  marking_code_definitions: Record<string, string>;
  // Section 2: supplemental free-text packaging block (e.g. from a solicitation)
  supplemental_text: string | null;
  supplemental_source: string | null;
  supplemental_title: string | null;
}

export interface PartTabCounts {
  nsn: string;
  // All count fields are nullable on the wire — Basic users get
  // procurement / manufacturers / packaging as null; Free users get
  // everything except solicitations_count_30d as null.
  procurement_history_count: number | null;
  solicitations_count: number | null;
  manufacturers_count: number | null;
  technical_characteristics_count: number | null;
  end_use_description_count: number | null;
  has_packaging: boolean | null;
  has_procurement_item_description: boolean | null;
  // Free-tier-only: count of solicitations posted in the last 30 days.
  // Null for Basic and Advanced.
  solicitations_count_30d?: number | null;
}

// ============================================================================
// Demand Intelligence (DLA forecasts + inventory position) — Advanced tier
// ============================================================================

export interface DemandForecastPoint {
  forecast_date: string; // ISO date, first day of forecast month
  forecast_qty: number;
}

export interface DemandTrendPoint {
  as_of_date: string; // ISO date, snapshot date
  total_stock: number | null;
  backorder_qty: number | null;
}

export interface PartDemand {
  nsn: string;
  niin: string | null;
  has_stock: boolean;
  has_forecast: boolean;
  // Latest inventory position
  total_stock: number | null;
  backorder_qty: number | null;
  annual_demand_qty: number | null;
  reorder_point: number | null;
  condition_code: string | null;
  // Derived signals. below_reorder_point is null when reorder_point is null
  // ("no signal"), never false in that case.
  below_reorder_point: boolean | null;
  on_backorder: boolean;
  months_of_supply: number | null;
  rop_gap: number | null;
  coverage_ratio: number | null;
  forecast_next_12mo: number | null;
  forecast_total_24mo: number | null;
  demand_type: string; // 'recurring' | 'one_off' | 'unknown'
  stock_trend: string | null; // 'rising' | 'falling' | 'flat' | null
  forecast_curve: DemandForecastPoint[];
  trend_series: DemandTrendPoint[];
  // Freshness
  stock_as_of_date: string | null;
  stock_data_date: string | null;
  forecast_data_date: string | null;
}

// Parts search type configuration
export interface PartsSearchTypeConfig {
  value: PartsSearchType;
  label: string;
  /** Segment label for the search bar's type switcher, where the full label
   * would crowd the row. Falls back to `label` when absent. */
  shortLabel?: string;
  description: string;
  placeholder: string;
  minLength: number;
  maxLength: number;
  pattern?: RegExp;
  patternError?: string;
}

export const PARTS_SEARCH_TYPE_CONFIGS: PartsSearchTypeConfig[] = [
  {
    value: 'nsn_niin',
    label: 'NSN/NIIN',
    description: 'National Stock Number (13 chars) or NIIN (9 chars); auto-detected',
    placeholder: 'Enter NSN or NIIN (e.g. 5306-001234567 or 00-001-0882)',
    minLength: 9,
    maxLength: 25,
    pattern: /^[A-Za-z0-9\- ]+$/,
    patternError: 'Enter a 9-digit NIIN or 13-character NSN (dashes optional)',
  },
  {
    value: 'solicitation',
    label: 'Solicitation number',
    shortLabel: 'Solicitation',
    description: 'Find parts by solicitation number (dashes, spaces optional; case-insensitive)',
    placeholder: 'Enter solicitation number (dashes/spaces optional)',
    minLength: 3,
    maxLength: 60,
  },
  {
    value: 'mfg_part_number',
    label: 'Mfg Part Number',
    shortLabel: 'Mfg Part #',
    description: 'Manufacturer part number; search is case-insensitive and ignores extra spaces',
    placeholder: 'Enter manufacturer part number',
    minLength: 2,
    maxLength: 50,
  },
  {
    value: 'contract_number',
    label: 'Contract number',
    shortLabel: 'Contract #',
    description: 'Find parts by contract/order number (dashes, spaces optional; case-insensitive)',
    placeholder: 'Enter contract number (dashes/spaces optional)',
    minLength: 2,
    maxLength: 50,
  },
  {
    value: 'description',
    label: 'Description',
    description: 'Part description text',
    placeholder: 'Enter part description (min 3 chars)',
    minLength: 3,
    maxLength: 255,
  },
];

// Helper function to get config for a parts search type
export function getPartsSearchTypeConfig(type: PartsSearchType | string): PartsSearchTypeConfig {
  // Backward compatibility: old saved recent actions may have 'nsn' or 'niin'
  const normalized = type === 'nsn' || type === 'niin' ? 'nsn_niin' : type === 'keyword' ? 'description' : type;
  const config = PARTS_SEARCH_TYPE_CONFIGS.find((c) => c.value === normalized);
  if (!config) {
    throw new Error(`Unknown parts search type: ${type}`);
  }
  return config;
}

// Helper function to validate parts search input
export function validatePartsSearchInput(
  type: PartsSearchType,
  value: string
): { valid: boolean; error?: string } {
  const config = getPartsSearchTypeConfig(type);
  const trimmed = value.trim();

  if (trimmed.length < config.minLength) {
    return {
      valid: false,
      error: `Minimum ${config.minLength} characters required`,
    };
  }

  if (trimmed.length > config.maxLength) {
    return {
      valid: false,
      error: `Maximum ${config.maxLength} characters allowed`,
    };
  }

  // NSN/NIIN: validate after normalizing (strip dashes/spaces); must be 9 (NIIN) or 13 (NSN) alphanumeric
  if (type === 'nsn_niin') {
    const normalized = trimmed.replace(/[\s\-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '');
    if (normalized.length !== 9 && normalized.length !== 13) {
      return {
        valid: false,
        error: config.patternError || 'Enter a 9-digit NIIN or 13-character NSN (dashes optional)',
      };
    }
    if (!/^[A-Za-z0-9]{9}$/.test(normalized) && !/^[A-Za-z0-9]{13}$/.test(normalized)) {
      return {
        valid: false,
        error: config.patternError || 'Enter only alphanumeric characters (dashes optional)',
      };
    }
    return { valid: true };
  }

  if (config.pattern && !config.pattern.test(trimmed)) {
    return {
      valid: false,
      error: config.patternError || 'Invalid format',
    };
  }

  return { valid: true };
}

// Helper function to build parts search params for API call
export function buildPartsSearchParams(
  type: PartsSearchType,
  query: string,
  limit: number = 50,
  offset: number = 0
): URLSearchParams {
  const params = new URLSearchParams();

  // Map search type to API parameter
  switch (type) {
    case 'nsn_niin': {
      const normalized = query.trim().replace(/[\s\-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '').toUpperCase();
      if (normalized.length === 13) {
        params.set('nsn', normalized);
      } else {
        params.set('niin', normalized);
      }
      break;
    }
    case 'solicitation':
      params.set('solicitation', query.trim());
      break;
    case 'mfg_part_number':
      params.set('mfg_part_number', query.trim());
      break;
    case 'contract_number':
      params.set('contract_number', query.trim());
      break;
    case 'description':
      params.set('q', query.trim());
      break;
  }

  params.set('limit', limit.toString());
  params.set('offset', offset.toString());

  return params;
}

// Format NSN for display: "5306-001234567" or "5306001234567" → "5306-001234567"
export function formatNSN(nsn: string | null | undefined): string | null {
  if (!nsn) return null;
  
  // Remove existing dashes and spaces
  const clean = nsn.replace(/[\s\-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '').toUpperCase();
  
  // If it's 13 characters, format as FSC-NIIN with dashes in NIIN: FSC-XX-XXX-XXXX
  if (clean.length === 13) {
    const fsc = clean.slice(0, 4);
    const niin = clean.slice(4);
    const formattedNiin = formatNiin(niin);
    return `${fsc}-${formattedNiin}`;
  }
  
  // If it already has proper formatting, return as-is
  if (nsn.includes('-')) {
    return nsn.toUpperCase();
  }
  
  // Otherwise return cleaned version
  return clean;
}

/**
 * Stable URL key for addressing a part in the read API.
 *
 * Normal parts are keyed by their NSN. DIBBS part-number-only parts have no NSN
 * (niin/fsc null → nsn comes back as ""), so they are keyed by internal id as
 * "ID-<part_id>"; the backend resolver accepts either form. Never returns "",
 * so it is always safe to interpolate into a /api/library/parts/<key> URL.
 */
export function partKey(p: { nsn?: string | null; id: number }): string {
  const nsn = p.nsn?.trim();
  return nsn ? nsn : `ID-${p.id}`;
}

/**
 * Human-readable identity of a part: its formatted NSN, or "CAGE / part number"
 * when the part has no NSN (DIBBS part-number-only parts). Falls back to "—".
 */
export function formatPartIdentity(p: {
  nsn?: string | null;
  mfg_cage?: string | null;
  mfg_part_number?: string | null;
}): string {
  const nsn = formatNSN(p.nsn ?? null);
  if (nsn) return nsn;
  const cage = p.mfg_cage?.trim();
  const pn = p.mfg_part_number?.trim();
  if (cage && pn) return `${cage} / ${pn}`;
  return pn || cage || '—';
}

/** True when a part has no NSN and is identified only by CAGE + part number. */
export function isPartNumberOnly(p: { nsn?: string | null; niin?: string | null }): boolean {
  return !p.nsn?.trim() && !p.niin?.trim();
}

// Format contract date
export function formatContractDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  // A date-only string ("YYYY-MM-DD") is parsed by `new Date()` as UTC midnight,
  // which then renders as the previous day in any timezone behind UTC. Parse those
  // as local time so the calendar date is preserved. Full datetime strings (with a
  // time component) keep their normal instant-based parsing.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
