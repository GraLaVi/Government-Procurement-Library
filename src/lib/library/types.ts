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
}

export interface VendorSolicitationsResponse {
  cage_code: string;
  solicitations: VendorSolicitation[];
  total_count: number;
}

export interface VendorDetail {
  cage_code: string;
  uei: string | null;
  duns: string | null;
  dodaac: string | null;
  legal_business_name: string | null;
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

// Format NIIN with dashes: 012345678 → 0123-45-678
export function formatNiin(niin: string | null | undefined): string | null {
  if (!niin || niin.length !== 9) return niin || null;
  return `${niin.slice(0, 4)}-${niin.slice(4, 6)}-${niin.slice(6)}`;
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

export type PartsSearchType = 'nsn' | 'niin' | 'fsc' | 'description' | 'keyword';

export interface PartSearchResult {
  id: number;
  nsn: string;
  niin: string | null;
  fsc: string | null;
  description: string | null;
  unit_of_issue: string | null;
  unit_price: number | null;
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
  unit_price: number | null;
  estimated_value: number | null;
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
    value: 'nsn',
    label: 'NSN',
    description: 'National Stock Number (FSC + NIIN)',
    placeholder: 'Enter NSN (e.g., 5306-001234567 or 5340-00-000-0060)',
    minLength: 4,
    maxLength: 25,
    // Allow flexible dash placement - NSN can have dashes anywhere
    // Backend will parse and extract FSC (4) + NIIN (9) from any format
    // Pattern allows alphanumeric with optional dashes anywhere
    pattern: /^[A-Za-z0-9\-]+$/,
    patternError: 'NSN must contain only alphanumeric characters and dashes',
  },
  {
    value: 'niin',
    label: 'NIIN',
    description: 'National Item Identification Number',
    placeholder: 'Enter 9-character NIIN',
    minLength: 9,
    maxLength: 9,
    pattern: /^[A-Za-z0-9]{9}$/,
    patternError: 'NIIN must be exactly 9 alphanumeric characters',
  },
  {
    value: 'fsc',
    label: 'FSC',
    description: 'Federal Supply Classification',
    placeholder: 'Enter 4-character FSC',
    minLength: 4,
    maxLength: 4,
    pattern: /^[A-Za-z0-9]{4}$/,
    patternError: 'FSC must be exactly 4 alphanumeric characters',
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
    description: 'Search NSN, NIIN, FSC, or description',
    placeholder: 'Enter keyword (min 3 chars)',
    minLength: 3,
    maxLength: 255,
  },
];

// Helper function to get config for a parts search type
export function getPartsSearchTypeConfig(type: PartsSearchType): PartsSearchTypeConfig {
  const config = PARTS_SEARCH_TYPE_CONFIGS.find((c) => c.value === type);
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
    case 'nsn':
      // Normalize NSN format (remove dashes, spaces)
      const nsnClean = query.trim().replace(/[- ]/g, '').toUpperCase();
      params.set('nsn', nsnClean);
      break;
    case 'niin':
      // Normalize NIIN by removing dashes and spaces
      const niinClean = query.trim().replace(/[- ]/g, '').toUpperCase();
      params.set('niin', niinClean);
      break;
    case 'fsc':
      params.set('fsc', query.trim().toUpperCase());
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
  
  // If it's 13 characters, format as FSC-NIIN
  if (clean.length === 13) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  
  // If it already has a dash in the right place, return as-is
  if (nsn.includes('-') && nsn.length === 14) {
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
