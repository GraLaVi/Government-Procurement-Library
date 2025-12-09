// Entity Search Types

export type EntitySearchType =
  | "cage"
  | "uei"
  | "duns"
  | "entity_name"
  | "contact_email"
  | "contact_phone"
  | "contact_name";

// ===========================================
// Vendor Search API Types (from VENDOR_SEARCH.md)
// ===========================================

// Search result item (from /search endpoint)
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

// Search response with pagination
export interface VendorSearchResponse {
  results: VendorSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

// Vendor address (nested in detail response)
export interface VendorAddress {
  address_type: "physical" | "mailing";
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  postal_code_ext: string | null;
  country_code: string | null;
  congressional_district: string | null;
}

// Vendor contact (nested in detail response)
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

// Full vendor detail (from /{cage_code} endpoint)
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
  addresses: VendorAddress[];
  contacts: VendorContact[];
}

// Booking month data (from /bookings endpoint)
export interface BookingMonth {
  month_ending: string;
  month_label: string;
  dscp_booked: number;
  dscp_rank: number;
  dscr_booked: number;
  dscr_rank: number;
  dscc_booked: number;
  dscc_rank: number;
  other_booked: number;
  other_rank: number;
  month_total: number;
}

// Bookings totals
export interface BookingTotals {
  dscp_total: number;
  dscr_total: number;
  dscc_total: number;
  other_total: number;
  grand_total: number;
}

// Bookings response (from /{cage_code}/bookings endpoint)
export interface VendorBookingsResponse {
  cage_code: string;
  months: BookingMonth[];
  totals: BookingTotals;
}

// ===========================================
// Legacy Types (kept for backward compatibility)
// ===========================================

// Entity Contact Information
export interface EntityContact {
  name: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  title?: string | null;
}

// Main Entity Model (matches backend CageEntity)
export interface CageEntity {
  cage_code: string;
  uei: string | null;
  duns: string | null;
  dodaac: string | null;
  legal_business_name: string;
  dba_name: string | null;

  // Address fields
  physical_address_line_1: string | null;
  physical_address_line_2: string | null;
  physical_address_city: string | null;
  physical_address_state: string | null;
  physical_address_zip: string | null;
  physical_address_country_code: string | null;

  // Contact fields
  phone?: string | null;
  fax?: string | null;
  entity_url: string | null;

  // Government Business POC
  govt_bus_poc_first_name: string | null;
  govt_bus_poc_last_name: string | null;
  govt_bus_poc_title: string | null;

  // Status fields
  sam_extract_code: string | null;
  registration_expiration_date: string | null;
  exclusion_status_flag: boolean | null;
  last_update_date?: string | null;
}

// Search History Item (stored in localStorage)
export interface SearchHistoryItem {
  id: string;
  searchType: EntitySearchType;
  query: string;
  timestamp: number;
}

// Search Response
export interface EntitySearchResponse {
  results: CageEntity[];
  total_count: number;
}

// Search Type Configuration
export interface SearchTypeConfig {
  value: EntitySearchType;
  label: string;
  placeholder: string;
  minLength: number;
}

export const SEARCH_TYPE_OPTIONS: SearchTypeConfig[] = [
  {
    value: "cage",
    label: "CAGE Code",
    placeholder: "Enter 5-character CAGE code (e.g., 1ABC0)",
    minLength: 5,
  },
  {
    value: "uei",
    label: "UEI",
    placeholder: "Enter 12-character Unique Entity Identifier",
    minLength: 12,
  },
  {
    value: "duns",
    label: "DUNS",
    placeholder: "Enter 9-digit DUNS number",
    minLength: 9,
  },
  {
    value: "entity_name",
    label: "Entity Name",
    placeholder: "Enter company or organization name (min 3 characters)",
    minLength: 3,
  },
  {
    value: "contact_email",
    label: "Contact Email",
    placeholder: "Enter contact email address (min 3 characters)",
    minLength: 3,
  },
  {
    value: "contact_phone",
    label: "Contact Phone",
    placeholder: "Enter phone number (min 10 digits)",
    minLength: 10,
  },
  {
    value: "contact_name",
    label: "Contact Name",
    placeholder: "Enter contact first and last name",
    minLength: 3,
  },
];

// Helper to get config for a search type
export function getSearchTypeConfig(searchType: EntitySearchType): SearchTypeConfig {
  return SEARCH_TYPE_OPTIONS.find((opt) => opt.value === searchType) || SEARCH_TYPE_OPTIONS[0];
}

// Helper to get label for a search type
export function getSearchTypeLabel(searchType: EntitySearchType): string {
  return getSearchTypeConfig(searchType).label;
}

// Search History localStorage key
export const SEARCH_HISTORY_KEY = "gralavi_entity_search_history";
export const MAX_SEARCH_HISTORY = 10;
