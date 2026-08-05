// RFQ module client types. Mirror src/rfq/schemas.py on the backend.

/**
 * Legacy filler for rfq_line_items.description.
 *
 * Lines need at least one of nsn/part_number/description
 * (chk_rfq_line_item_identifier), and before the part description was carried
 * through, every part-number-less line was stamped with this literal. It is
 * still the last-resort filler for a line with no other identifier, and is
 * recognised on read so it never shows up as if it were a real description.
 */
export const PLACEHOLDER_LINE_DESCRIPTION = "Requested item";

/** A manufacturer row selected from the parts Manufacturers tab. */
export interface RfqManufacturerSelection {
  /** CAGE vendor (Manufacturers tab). Exactly one of cage_code /
   * rfq_vendor_id identifies the vendor. */
  cage_code: string | null;
  /** Private rfq_vendors row (Enterprise picker). */
  rfq_vendor_id?: number | null;
  vendor_name: string | null;
  part_number: string | null;
  nsn: string | null;
  /** parts.id of the part the row was selected from — carried through to
   * rfq_line_items.part_id so a line links back to the catalog part. */
  part_id: number | null;
  /** parts.description — the human-readable item name vendors see on the
   * respond page, alongside the part number. */
  description: string | null;
}

/** Stable grouping key for a vendor identity: "cage:<CAGE>" for SAM/DLA
 * vendors, "vendor:<id>" for private rfq_vendors rows. Mirrors the backend's
 * VendorKey discriminator in src/rfq/service.py. */
export function rfqVendorKey(ref: { cage_code?: string | null; rfq_vendor_id?: number | null }): string {
  return ref.rfq_vendor_id != null ? `vendor:${ref.rfq_vendor_id}` : `cage:${ref.cage_code ?? ""}`;
}

/** A customer-private vendor (rfq_vendors — Enterprise). */
export interface RfqVendor {
  id: number;
  vendor_code: string | null;
  company_name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  contacts: VendorContact[];
}

/** One line of a quick-send / batch payload (one part for one vendor). */
export interface RfqLineInput {
  cage_code?: string | null;
  rfq_vendor_id?: number | null;
  vendor_name?: string | null;
  source_part_number?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  part_id?: number | null;
  nsn?: string | null;
  part_number?: string | null;
  description?: string | null;
  quantity: number;
  unit_of_measure?: string | null;
  need_by_date?: string | null; // YYYY-MM-DD
  target_unit_price?: number | null;
  notes?: string | null;
  /** Stamped when composed from the Send RFQs work queue. */
  source_solicitation_id?: number | null;
  source_sam_opportunity_id?: number | null;
}

export interface QuickSendRequest {
  response_due_date?: string | null;
  save_contacts: boolean;
  items: RfqLineInput[];
}

export interface RfqSendResultItem {
  rfq_id: number;
  recipient_id: number;
  cage_code: string | null;
  rfq_vendor_id?: number | null;
  vendor_name: string | null;
  line_item_count: number;
  contact_email: string | null;
}

export interface RfqSendResponse {
  created: RfqSendResultItem[];
  rfq_count: number;
  vendor_count: number;
}

export interface VendorContactSuggestion {
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
}

export interface VendorContact {
  id: number;
  customer_id: number;
  cage_code: string | null;
  rfq_vendor_id?: number | null;
  contact_name: string | null;
  email: string;
  phone: string | null;
  title: string | null;
  is_default: boolean;
  source: string;
  created_at: string;
}

export interface VendorContactResolution {
  cage_code: string | null;
  rfq_vendor_id?: number | null;
  saved: VendorContact[];
  suggestion: VendorContactSuggestion | null;
}

export interface BatchItemInput {
  cage_code?: string | null;
  rfq_vendor_id?: number | null;
  vendor_name?: string | null;
  source_part_number?: string | null;
  part_id?: number | null;
  nsn?: string | null;
  part_number?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_of_measure?: string | null;
  need_by_date?: string | null;
  target_unit_price?: number | null;
  notes?: string | null;
  response_due_date?: string | null;
}

export interface BatchItem {
  id: number;
  customer_id: number;
  added_by_user_id: number;
  added_by_name: string | null;
  cage_code: string | null;
  rfq_vendor_id?: number | null;
  vendor_name: string | null;
  source_part_number: string | null;
  part_id: number | null;
  nsn: string | null;
  part_number: string | null;
  description: string | null;
  quantity: number | null;
  unit_of_measure: string | null;
  need_by_date: string | null;
  target_unit_price: number | null;
  notes: string | null;
  response_due_date: string | null;
  created_at: string;
  /** The email/name this item would be sent to right now (saved vendor
   * contact, falling back to a SAM.gov suggestion) — null if none on file. */
  resolved_contact_email: string | null;
  resolved_contact_name: string | null;
}

// ============================================================================
// Send RFQs work queue (Enterprise)
// ============================================================================

export type RfqWorkStatus =
  | "unworked" | "rfq_sent" | "quotes_in" | "priced" | "bid" | "no_bid" | "passed";

export const WORK_STATUS_LABELS: Record<RfqWorkStatus, string> = {
  unworked: "Unworked",
  rfq_sent: "RFQ Sent",
  quotes_in: "Quotes In",
  priced: "Priced",
  bid: "Bid",
  no_bid: "No Bid",
  passed: "Passed",
};

export interface RfqWorkItem {
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
  has_pdf: boolean;
  has_amendment_indicator: boolean;
  has_post_match_amendment: boolean;
  latest_post_match_amendment_at: string | null;
  match_count: number;
  last_matched_at: string | null;
  rfq_count: number;
  /** Vendor quotes received back across those RFQs. */
  quote_count: number;
  /** Sum of requested_quantity x part GAC over the solicitation's items —
   * the app's standard "Estimated value" formula (gac, not unit_price). */
  estimated_value: number | null;
  work_status: RfqWorkStatus;
  assigned_user_id: number | null;
  assigned_user_name: string | null;
  derived_user_ids: number[];
  derived_user_names: string[];
  notes: string | null;
}

export interface RfqWorklistPage {
  items: RfqWorkItem[];
  total: number;
  page: number;
  page_size: number;
  unassigned_count: number;
}

export interface RfqBuyer {
  user_id: number;
  name: string;
  email: string;
  is_enterprise_buyer: boolean;
}

// ============================================================================
// Vendor responsiveness (Enterprise)
// ============================================================================

/** Suppress the responsiveness badge below this many sends — a rate off one
 * data point is noise. Mirrors vendor_stats.MIN_SENDS_FOR_DISPLAY. */
export const MIN_SENDS_FOR_RESPONSIVENESS = 3;

export interface VendorResponsiveness {
  cage_code: string | null;
  rfq_vendor_id: number | null;
  vendor_name: string | null;
  rfqs_sent: number;
  responded: number;
  declined: number;
  unanswered: number;
  response_rate: number;
  decline_rate: number;
  open_rate: number;
  median_turnaround_days: number | null;
  last_responded_at: string | null;
  months: number;
}

// ============================================================================
// Quote comparison (Enterprise)
// ============================================================================

export interface ComparisonQuote {
  recipient_id: number;
  rfq_id: number;
  cage_code: string | null;
  rfq_vendor_id: number | null;
  vendor_name: string | null;
  submitted_at: string;
  quote_valid_until: string | null;
  currency: string;
  unit_price: number | null;
  quantity_available: number | null;
  lead_time_days: number | null;
  manufacturer: string | null;
  alternate_part_number: string | null;
  is_no_bid: boolean;
  /** Per-line vendor note. */
  notes: string | null;
  /** The vendor's overall message on their quote — usually where they write. */
  response_notes: string | null;
  is_best_price: boolean;
  is_approved_source: boolean;
  /** Buyer cost build-up (markup/shipping/other -> price to government). */
  response_line_id: number;
  markup_percent: number | null;
  shipping_amount: number | null;
  other_charges: number | null;
  price_to_gov: number | null;
  priced_at: string | null;
  /** Alternate part quoted by a NON-approved source — DLA rejects this on
   * AID-described items; never price it without an exception. */
  alternate_not_approved: boolean;
  quote_expired: boolean;
}

export interface NsnComparisonGroup {
  nsn: string | null;
  part_number: string | null;
  description: string | null;
  quantity: number | null;
  unit_of_measure: string | null;
  quotes: ComparisonQuote[];
}

export interface PendingVendor {
  recipient_id: number;
  vendor_name: string | null;
  cage_code: string | null;
  rfq_vendor_id: number | null;
  status: string;
}

export interface QuoteComparisonResponse {
  solicitation_id: number;
  groups: NsnComparisonGroup[];
  invited: number;
  quoted: number;
  declined: number;
  pending: PendingVendor[];
}

export interface RfqSettings {
  auto_close_enabled: boolean;
  auto_close_grace_days: number;
  default_response_due_days: number | null;
  response_alert_audience: "creator_only" | "all_users";
  // --- Enterprise ---
  allow_user_vendor_book_edits: boolean;
  default_quote_due_lead_days: number | null;
  default_markup_percent: number | null;
  reminder_enabled: boolean;
  reminder_max_count: number;
  reminder_cooldown_hours: number;
  unassigned_alert_threshold: number | null;
}

export interface RfqUserSettings {
  notify_on_response: boolean;
  bell_on_response: boolean;
  bell_granularity: "per_response" | "per_rfq" | "rolling";
  /** Enterprise: hide Send RFQs rows with estimated value below this floor
   * (null = no floor). Personal, not org-wide. */
  worklist_min_est_value: number | null;
}

export interface BatchContributor {
  user_id: number;
  name: string;
  item_count: number;
}

export interface RfqListItem {
  id: number;
  title: string;
  status: string;
  response_due_date: string | null;
  sent_at: string | null;
  created_at: string;
  recipient_count: number;
  response_count: number;
  aggregate_status: string;
  primary_vendor_name: string | null;
  primary_cage_code: string | null;
  created_by_user_id: number | null;
  created_by_name: string | null;
}

export interface RfqContributor {
  user_id: number;
  name: string;
  rfq_count: number;
}

export interface RfqLineItem {
  id: number;
  line_number: number;
  part_id: number | null;
  nsn: string | null;
  part_number: string | null;
  description: string | null;
  quantity: number;
  unit_of_measure: string | null;
  need_by_date: string | null;
  target_unit_price: number | null;
  notes: string | null;
}

export interface RfqRecipient {
  id: number;
  cage_code: string | null;
  rfq_vendor_id?: number | null;
  vendor_name: string | null;
  contact_email: string | null;
  contact_name: string | null;
  status: string;
  first_viewed_at: string | null;
  responded_at: string | null;
  declined_at: string | null;
  reminder_count: number;
  has_response: boolean;
}

export interface RfqDetail {
  id: number;
  title: string;
  notes: string | null;
  status: string;
  response_due_date: string | null;
  sent_at: string | null;
  closed_at: string | null;
  created_at: string;
  line_items: RfqLineItem[];
  recipients: RfqRecipient[];
}

export interface RfqResponseLineItem {
  rfq_line_item_id: number;
  unit_price: number | null;
  quantity_available: number | null;
  lead_time_days: number | null;
  manufacturer: string | null;
  alternate_part_number: string | null;
  is_no_bid: boolean;
  notes: string | null;
  /** Buyer pricing from the Enterprise comparison view. */
  markup_percent?: number | null;
  shipping_amount?: number | null;
  other_charges?: number | null;
  price_to_gov?: number | null;
  priced_at?: string | null;
}

export interface RfqResponseDetail {
  id: number;
  recipient_id: number;
  cage_code: string | null;
  rfq_vendor_id?: number | null;
  vendor_name: string | null;
  status: string;
  quote_valid_until: string | null;
  currency: string;
  total_price: number | null;
  lead_time_days: number | null;
  notes: string | null;
  submitted_at: string;
  line_items: RfqResponseLineItem[];
}

// --- Public (token-authorized) responder flow ---

export interface PublicRfqLineItem {
  id: number;
  line_number: number;
  nsn: string | null;
  part_number: string | null;
  description: string | null;
  quantity: number;
  unit_of_measure: string | null;
  need_by_date: string | null;
  notes: string | null;
}

export interface PublicRfqView {
  rfq_id: number;
  title: string;
  sender_company_name: string;
  response_due_date: string | null;
  recipient_status: string;
  vendor_name: string | null;
  cage_code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  already_responded: boolean;
  line_items: PublicRfqLineItem[];
}

export interface ReceivedRfqItem {
  recipient_id: number;
  rfq_id: number;
  title: string;
  sender_company_name: string;
  response_due_date: string | null;
  status: string;
  has_response: boolean;
  received_at: string;
}

export interface ResponseLineInput {
  rfq_line_item_id: number;
  unit_price?: number | null;
  quantity_available?: number | null;
  lead_time_days?: number | null;
  manufacturer?: string | null;
  alternate_part_number?: string | null;
  is_no_bid: boolean;
  notes?: string | null;
}

/** Human label for an aggregate/recipient status. */
export function rfqStatusLabel(status: string): string {
  switch (status) {
    case 'draft': return 'Draft';
    case 'sent': return 'Sent';
    case 'viewed': return 'Viewed';
    case 'responded': return 'Responded';
    case 'declined': return 'Declined';
    case 'stale': return 'Stale';
    case 'closed': return 'Closed';
    case 'cancelled': return 'Cancelled';
    case 'pending': return 'Pending';
    case 'bounced': return 'Bounced';
    default: return status;
  }
}
