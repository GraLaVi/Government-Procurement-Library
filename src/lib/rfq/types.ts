// RFQ module client types. Mirror src/rfq/schemas.py on the backend.

/** A manufacturer row selected from the parts Manufacturers tab. */
export interface RfqManufacturerSelection {
  cage_code: string;
  vendor_name: string | null;
  part_number: string | null;
  nsn: string | null;
}

/** One line of a quick-send / batch payload (one part for one vendor). */
export interface RfqLineInput {
  cage_code: string;
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
}

export interface QuickSendRequest {
  response_due_date?: string | null;
  save_contacts: boolean;
  items: RfqLineInput[];
}

export interface RfqSendResultItem {
  rfq_id: number;
  recipient_id: number;
  cage_code: string;
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
  cage_code: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  title: string | null;
  is_default: boolean;
  source: string;
  created_at: string;
}

export interface VendorContactResolution {
  cage_code: string;
  saved: VendorContact[];
  suggestion: VendorContactSuggestion | null;
}

export interface BatchItemInput {
  cage_code: string;
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
  cage_code: string;
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
}

export interface RfqSettings {
  auto_close_enabled: boolean;
  auto_close_grace_days: number;
  default_response_due_days: number | null;
  response_alert_audience: "creator_only" | "all_users";
}

export interface RfqUserSettings {
  notify_on_response: boolean;
  bell_on_response: boolean;
  bell_granularity: "per_response" | "per_rfq" | "rolling";
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
  cage_code: string;
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
}

export interface RfqResponseDetail {
  id: number;
  recipient_id: number;
  cage_code: string;
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
  cage_code: string;
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
