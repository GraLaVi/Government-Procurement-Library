// Vendor Search Types

export type VendorSearchType = 'cage' | 'uei' | 'duns' | 'entity_name' | 'contact_email';

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
  close_date: string;
  status: string;
  set_aside: string | null;
  quantity: number;
  niin: string | null;
  fsc: string | null;
  description: string | null;
  unit_price: number | null;
  estimated_value: number | null;
  has_pdf?: boolean;
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

export interface VendorDetail {
  cage_code: string;
  uei: string | null;
  duns: string | null;
  dodaac: string | null;
  legal_business_name: string;
  dba_name: string | null;
  entity_structure: string | null;
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
}

// Search type configuration
export interface SearchTypeConfig {
  value: VendorSearchType;
  label: string;
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
    value: 'duns',
    label: 'DUNS Number',
    description: 'Data Universal Numbering System',
    placeholder: 'Enter 9-13 digit DUNS number',
    minLength: 9,
    maxLength: 13,
    pattern: /^\d{9,13}$/,
    patternError: 'DUNS must be 9-13 digits',
  },
  {
    value: 'entity_name',
    label: 'Entity Name',
    description: 'Company or business name',
    placeholder: 'Enter company name (min 5 chars)',
    minLength: 5,
    maxLength: 255,
  },
  {
    value: 'contact_email',
    label: 'Contact Email',
    description: 'Email address of a vendor contact',
    placeholder: 'Enter contact email (min 5 chars)',
    minLength: 5,
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
    case 'duns':
      params.set('duns', query.trim());
      break;
    case 'entity_name':
      params.set('q', query.trim());
      break;
    case 'contact_email':
      params.set('contact_email', query.trim());
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

// Format date as "Nov 15, 2024"
export function formatAwardDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// Parts Search Types
// ============================================================================

export type PartsSearchType = 'nsn_niin' | 'solicitation' | 'mfg_part_number' | 'contract_number' | 'description' | 'keyword';

export interface PartSearchResult {
  id: number;
  nsn: string;
  niin: string | null;
  fsc: string | null;
  description: string | null;
  unit_of_issue: string | null;
  unit_price: number | null;
  
  // Key code fields for search results
  psclas: string | null;  // Product or Service Class
  nscode: string | null;  // NSN Status Code
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

export interface PartSolicitation {
  solicitation_id: number;
  solicitation_number: string;
  agency_code: string | null;
  close_date: string | null;
  status: string | null;
  set_aside: string | null;
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
}

export interface PartSolicitationsResponse {
  nsn: string;
  solicitations: PartSolicitation[];
  total_count: number;
}

export interface PartManufacturer {
  cage_code: string;
  vendor_name: string | null;
  part_number: string | null;
  rncc: string | null;
  rnvc: string | null;
  source_code: string | null;
}

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
}

export interface PartTabCounts {
  nsn: string;
  procurement_history_count: number;
  solicitations_count: number;
  manufacturers_count: number;
  technical_characteristics_count: number;
  end_use_description_count: number;
  has_packaging: boolean;
  has_procurement_item_description: boolean;
}

// Parts search type configuration
export interface PartsSearchTypeConfig {
  value: PartsSearchType;
  label: string;
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
    description: 'Find parts by solicitation number (dashes, spaces optional; case-insensitive)',
    placeholder: 'Enter solicitation number (dashes/spaces optional)',
    minLength: 3,
    maxLength: 60,
  },
  {
    value: 'mfg_part_number',
    label: 'Mfg Part Number',
    description: 'Manufacturer part number; search is case-insensitive and ignores extra spaces',
    placeholder: 'Enter manufacturer part number',
    minLength: 2,
    maxLength: 50,
  },
  {
    value: 'contract_number',
    label: 'Contract number',
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
  {
    value: 'keyword',
    label: 'Keyword',
    description: 'Searches part description; if the term looks like an NSN (13 chars) or NIIN (9 chars), those are matched too.',
    placeholder: 'e.g. NSN, NIIN, or description words (min 3 chars)',
    minLength: 3,
    maxLength: 255,
  },
];

// Helper function to get config for a parts search type
export function getPartsSearchTypeConfig(type: PartsSearchType | string): PartsSearchTypeConfig {
  // Backward compatibility: old saved recent actions may have 'nsn' or 'niin'
  const normalized = type === 'nsn' || type === 'niin' ? 'nsn_niin' : type;
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
    const normalized = trimmed.replace(/[- ]/g, '');
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
      const normalized = query.trim().replace(/[- ]/g, '').toUpperCase();
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
    case 'keyword':
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
  const clean = nsn.replace(/[- ]/g, '').toUpperCase();
  
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

// Format contract date
export function formatContractDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
