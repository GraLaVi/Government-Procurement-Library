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
  data_source: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_sam_sync: string | null;
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

// Main Entity Model (matches backend CageEntity - 146 columns)
export interface CageEntity {
  // Primary identifiers
  cage_code: string;
  uei: string | null;
  duns: string | null;
  dodaac: string | null;

  // Status and flags
  sam_extract_code: string | null;
  purpose_of_registration: string | null;
  entity_eft_indicator: string | null;
  exclusion_status_flag: boolean | null;
  no_public_display_flag: boolean | null;
  dnb_open_data_flag: boolean | null;

  // Dates
  initial_registration_date: string | null;
  registration_expiration_date: string | null;
  last_update_date: string | null;
  activation_date: string | null;
  entity_start_date: string | null;

  // Business Identity
  legal_business_name: string;
  dba_name: string | null;
  entity_division: string | null;
  entity_division_number: string | null;

  // Physical Address
  physical_address_line_1: string | null;
  physical_address_line_2: string | null;
  physical_address_city: string | null;
  physical_address_state: string | null;
  physical_address_zip: string | null;
  physical_address_zip_p4: string | null;
  physical_address_country_code: string | null;
  physical_congressional_district: string | null;

  // Mailing Address
  mailing_address_line_1: string | null;
  mailing_address_line_2: string | null;
  mailing_address_city: string | null;
  mailing_address_zip: string | null;
  mailing_address_zip_p4: string | null;
  mailing_address_country: string | null;
  mailing_address_state: string | null;

  // Corporate Info
  entity_structure: string | null;
  state_of_incorporation: string | null;
  country_of_incorporation: string | null;
  fiscal_year_end_close_date: string | null;
  entity_url: string | null;

  // Business Type classifications
  business_type_counter: number | null;
  business_type_string: string | null;

  // NAICS codes
  primary_naics: string | null;
  naics_code_counter: number | null;
  naics_code_string: string | null;

  // PSC codes
  psc_code_counter: number | null;
  psc_code_string: string | null;

  // NAICS exceptions
  naics_exception_counter: number | null;
  naics_exception_string: string | null;

  // SBA business types
  sba_business_types_counter: number | null;
  sba_business_types_string: string | null;

  // Disaster response
  disaster_response_counter: number | null;
  disaster_response_string: string | null;

  // Financial info
  credit_card_usage: string | null;
  debt_subject_offset_flag: boolean | null;

  // Government Business POC
  govt_bus_poc_first_name: string | null;
  govt_bus_poc_middle_initial: string | null;
  govt_bus_poc_last_name: string | null;
  govt_bus_poc_title: string | null;
  govt_bus_poc_st_add_1: string | null;
  govt_bus_poc_st_add_2: string | null;
  govt_bus_poc_city: string | null;
  govt_bus_poc_zip: string | null;
  govt_bus_poc_zip_p4: string | null;
  govt_bus_poc_country_code: string | null;
  govt_bus_poc_state: string | null;

  // Alternate Government Business POC
  alt_govt_bus_poc_first_name: string | null;
  alt_govt_bus_poc_middle_initial: string | null;
  alt_govt_bus_poc_last_name: string | null;
  alt_govt_bus_poc_title: string | null;
  alt_govt_bus_poc_st_add_1: string | null;
  alt_govt_bus_poc_st_add_2: string | null;
  alt_govt_bus_poc_city: string | null;
  alt_govt_bus_poc_zip: string | null;
  alt_govt_bus_poc_zip_p4: string | null;
  alt_govt_bus_poc_country_code: string | null;
  alt_govt_bus_poc_state: string | null;

  // Electronic Business POC
  elec_bus_poc_first_name: string | null;
  elec_bus_poc_middle_initial: string | null;
  elec_bus_poc_last_name: string | null;
  elec_bus_poc_title: string | null;
  elec_bus_poc_st_add_1: string | null;
  elec_bus_poc_st_add_2: string | null;
  elec_bus_poc_city: string | null;
  elec_bus_poc_zip: string | null;
  elec_bus_poc_zip_p4: string | null;
  elec_bus_poc_country_code: string | null;
  elec_bus_poc_state: string | null;

  // Alternate Electronic Business POC
  alt_elec_bus_poc_first_name: string | null;
  alt_elec_bus_poc_middle_initial: string | null;
  alt_elec_bus_poc_last_name: string | null;
  alt_elec_bus_poc_title: string | null;
  alt_elec_bus_poc_st_add_1: string | null;
  alt_elec_bus_poc_st_add_2: string | null;
  alt_elec_bus_poc_city: string | null;
  alt_elec_bus_poc_zip: string | null;
  alt_elec_bus_poc_zip_p4: string | null;
  alt_elec_bus_poc_country_code: string | null;
  alt_elec_bus_poc_state: string | null;

  // Past Performance POC
  past_perf_poc_first_name: string | null;
  past_perf_poc_middle_initial: string | null;
  past_perf_poc_last_name: string | null;
  past_perf_poc_title: string | null;
  past_perf_poc_st_add_1: string | null;
  past_perf_poc_st_add_2: string | null;
  past_perf_poc_city: string | null;
  past_perf_poc_zip: string | null;
  past_perf_poc_zip_p4: string | null;
  past_perf_poc_country_code: string | null;
  past_perf_poc_state: string | null;

  // Alternate Past Performance POC
  alt_past_perf_poc_first_name: string | null;
  alt_past_perf_poc_middle_initial: string | null;
  alt_past_perf_poc_last_name: string | null;
  alt_past_perf_poc_title: string | null;
  alt_past_perf_poc_st_add_1: string | null;
  alt_past_perf_poc_st_add_2: string | null;
  alt_past_perf_poc_city: string | null;
  alt_past_perf_poc_zip: string | null;
  alt_past_perf_poc_zip_p4: string | null;
  alt_past_perf_poc_country_code: string | null;
  alt_past_perf_poc_state: string | null;

  // Correspondence
  correspondence_flag: string | null;

  // Audit fields
  created_at: string | null;
  updated_at: string | null;
  last_sam_sync: string | null;
  import_source: string | null;
  data_quality_score: number | null;
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
export const SEARCH_HISTORY_KEY = "govt_proc_hub_entity_search_history";
export const MAX_SEARCH_HISTORY = 10;
