// Types for the Inventory Upload (Supplier Stock) feature.
// Mirror of ALAN-FastAPI-Web/src/inventory/schemas.py — keep in sync.

export type UploadMode = "replace" | "upsert";

export type UploadStatus =
  | "uploaded"
  | "validating"
  | "awaiting_confirmation"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type MatchStatus =
  | "matched_niin"
  | "matched_cage_part"
  | "matched_part_number"
  | "ambiguous"
  | "conflict"
  | "unmatched";

export type QuantityShareMode = "exact" | "band" | "in_stock_only" | "hidden";
export type InquiryRouting = "rfq" | "email";

export interface InventorySettings {
  customer_id: number;
  network_sharing_enabled: boolean;
  share_quantity_mode: QuantityShareMode;
  share_price: boolean;
  share_lead_time: boolean;
  share_moq: boolean;
  share_condition: boolean;
  share_traceability: boolean;
  share_location: boolean;
  show_company_identity: boolean;
  public_display_name: string | null;
  /** Opt-in to a browsable catalog on this company's vendor-search profile.
   *  Separate from show_company_identity on purpose — see migration 050.
   *  The API rejects turning it on without an identity and display name. */
  list_in_vendor_search: boolean;
  inquiry_routing: InquiryRouting;
  inquiry_email: string | null;
  default_currency: string;
  auto_hide_stale_enabled: boolean;
  stale_after_days: number;
  hide_after_days: number;
  shrink_threshold_pct: number;
  column_mapping: Record<string, string> | null;
  sharing_terms_accepted_at: string | null;
  updated_at: string;
}

/** PUT /api/inventory/settings body — all fields optional (partial update).
 *  Flipping network_sharing_enabled on requires accept_sharing_terms: true. */
export type InventorySettingsUpdate = Partial<
  Omit<InventorySettings, "customer_id" | "sharing_terms_accepted_at" | "updated_at">
> & { accept_sharing_terms?: boolean };

export interface InventoryUpload {
  id: number;
  source: "web" | "api" | "admin";
  original_filename: string | null;
  file_size_bytes: number | null;
  mode: UploadMode;
  status: UploadStatus;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  matched_rows: number | null;
  unmatched_rows: number | null;
  ambiguous_rows: number | null;
  deactivated_rows: number | null;
  shrink_pct: string | null; // Decimal serialized as string
  shrink_warning: boolean;
  error_message: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface UploadListResponse {
  uploads: InventoryUpload[];
  total: number;
}

export interface PreviewRow {
  row_number: number;
  raw: Record<string, string>;
  normalized: Record<string, unknown>;
  is_valid: boolean;
  error_code: string | null;
  error_message: string | null;
  /** "We know your parts": what GPH already holds for the matched part. */
  enrichment: {
    match_status?: MatchStatus;
    part_id?: number;
    nsn?: string | null;
    description?: string | null;
    unit_of_issue?: string | null;
    shelf_life_code?: string | null;
  } | null;
}

export interface UploadPreview {
  upload: InventoryUpload;
  /** {original file header: canonical GPH field} */
  column_mapping: Record<string, string>;
  unmapped_headers: string[];
  sample_rows: PreviewRow[];
  warning_count: number;
  would_deactivate: number | null;
  shrink_pct: string | null;
  shrink_warning: boolean;
}

export interface ConfirmResponse {
  upload: InventoryUpload;
  queued: boolean;
}

export interface InventoryItem {
  id: number;
  customer_sku: string | null;
  niin: string | null;
  fsc: string | null;
  part_number: string | null;
  cage_code: string | null;
  quantity_on_hand: string;
  quantity_committed: string | null;
  quantity_available: string | null;
  unit_of_measure: string;
  condition_code: string | null;
  condition_notes: string | null;
  material_source: string | null;
  unit_price: string | null;
  currency: string;
  price_valid_until: string | null;
  minimum_order_quantity: string | null;
  package_quantity: string | null;
  lead_time_days: number | null;
  country_of_origin: string | null;
  traceability: string | null;
  lot_number: string | null;
  serial_number: string | null;
  date_of_manufacture: string | null;
  cure_date: string | null;
  expiration_date: string | null;
  shelf_life_code: string | null;
  dfars_compliant: boolean | null;
  export_controlled: boolean | null;
  hazmat: boolean | null;
  warehouse_location: string | null;
  ship_from_region: string | null;
  ship_from_country: string | null;
  notes: string | null;
  part_id: number | null;
  match_status: MatchStatus;
  as_of_date: string;
  is_active: boolean;
  network_hidden_at: string | null;
  updated_at: string;
}

export interface InventoryItemsPage {
  items: InventoryItem[];
  total: number;
  limit: number;
  offset: number;
}

/** PATCH /api/inventory/items/[id] body — the editable subset. */
export interface InventoryItemPatch {
  quantity_on_hand?: number;
  quantity_committed?: number;
  unit_of_measure?: string;
  condition_code?: string;
  condition_notes?: string;
  unit_price?: number;
  minimum_order_quantity?: number;
  lead_time_days?: number;
  warehouse_location?: string;
  notes?: string;
}

/** One shared listing as OTHER customers see it — already projected
 *  server-side through the owner's exposure settings; a suppressed column is
 *  absent (undefined/null), never merely hidden. */
export interface NetworkStockItem {
  listing_id: number;
  supplier_label: string;
  supplier_customer_id: number | null;
  /** Part identity travels with the listing: the vendor-search catalog has
   *  no part context to borrow one from. */
  part_id: number | null;
  niin: string | null;
  fsc: string | null;
  part_number: string | null;
  quantity: string | null;
  quantity_band: string | null;
  in_stock: boolean;
  unit_of_measure: string | null;
  condition_code: string | null;
  material_source: string | null;
  unit_price: string | null;
  currency: string | null;
  minimum_order_quantity: string | null;
  lead_time_days: number | null;
  traceability: string | null;
  country_of_origin: string | null;
  ship_from_region: string | null;
  ship_from_country: string | null;
  as_of_date: string;
  is_stale: boolean;
  inquiry_routing: InquiryRouting;
  inquiry_email: string | null;
}

/** GET /api/library/vendor/[cage]/inventory — one supplier's whole shared
 *  catalog. 404s unless the vendor is a GPH customer who opted into
 *  vendor-search listing, so "no stock" and "not a customer" look identical
 *  from outside. */
export interface VendorInventory {
  cage_code: string;
  supplier_label: string;
  listings: NetworkStockItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PartInventory {
  nsn: string;
  /** The viewer's own lines — always full fidelity. */
  my_stock: InventoryItem[];
  /** null (vs []) = viewer lacks network access → render the unlock prompt. */
  network_stock: NetworkStockItem[] | null;
  network_viewable: boolean;
}

export interface PartAvailability {
  part_id: number;
  network_listings: number;
  network_in_stock: boolean;
  my_listings: number;
}

export interface InventoryAvailabilityResponse {
  availability: PartAvailability[];
}

/** One of the caller's OWN live inventory lines for a part — from
 *  POST /api/inventory/my-stock. Multiple lines per part are possible (one
 *  per warehouse/condition); callers aggregate for display. */
export interface MyStockLine {
  part_id: number;
  item_id: number;
  quantity_on_hand: string;
  quantity_available: string | null;
  /** Recorded cost — own stock, full fidelity (cost basis for pricing). */
  unit_price: string | null;
  unit_of_measure: string;
  condition_code: string | null;
  warehouse_location: string | null;
  as_of_date: string;
  is_stale: boolean;
}

export interface MyStockResponse {
  items: MyStockLine[];
}

/** Per-part rollup of MyStockLine rows for a compact one-cell display:
 *  total quantity, the biggest line's condition/warehouse/as-of, and how
 *  many other locations there are. */
export interface MyStockSummary {
  totalQuantity: number;
  /** The primary (largest) line's recorded cost; null when none on file. */
  unitPrice: number | null;
  unitOfMeasure: string;
  conditionCode: string | null;
  warehouse: string | null;
  otherLocations: number;
  asOfDate: string;
  isStale: boolean;
}

export function summarizeMyStock(lines: MyStockLine[]): Record<number, MyStockSummary> {
  const byPart: Record<number, MyStockLine[]> = {};
  for (const line of lines) {
    (byPart[line.part_id] ??= []).push(line);
  }
  const out: Record<number, MyStockSummary> = {};
  for (const [partId, group] of Object.entries(byPart)) {
    // Lines arrive quantity-desc from the API; the first is the primary.
    const primary = group[0];
    const total = group.reduce(
      (sum, l) => sum + Number(l.quantity_available ?? l.quantity_on_hand), 0);
    out[Number(partId)] = {
      totalQuantity: total,
      unitPrice: primary.unit_price != null ? Number(primary.unit_price) : null,
      unitOfMeasure: primary.unit_of_measure,
      conditionCode: primary.condition_code,
      warehouse: primary.warehouse_location,
      otherLocations: group.length - 1,
      asOfDate: primary.as_of_date,
      isStale: group.some((l) => l.is_stale),
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export const MATERIAL_SOURCE_LABELS: Record<string, string> = {
  oem: "OEM",
  authorized_distributor: "Authorized distributor",
  broker: "Broker",
  government_surplus: "Government surplus",
  unknown: "Unknown",
};

export const TRACEABILITY_LABELS: Record<string, string> = {
  coc: "Certificate of Conformance",
  coc_plus_test_reports: "CofC + test reports",
  dd1348_dd250: "Government traceable (DD1348/DD250)",
  mill_certs: "Mill certs",
  none: "None",
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  matched_niin: "Matched (NSN)",
  matched_cage_part: "Matched (CAGE + P/N)",
  matched_part_number: "Matched (P/N)",
  ambiguous: "Ambiguous",
  conflict: "Conflict",
  unmatched: "Not matched",
};

export const UPLOAD_STATUS_LABELS: Record<UploadStatus, string> = {
  uploaded: "Uploaded",
  validating: "Validating",
  awaiting_confirmation: "Awaiting confirmation",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Compact quantity display honouring the projection fidelity. */
export function formatNetworkQuantity(item: NetworkStockItem): string {
  if (item.quantity != null) return Number(item.quantity).toLocaleString();
  if (item.quantity_band) return item.quantity_band;
  return item.in_stock ? "In stock" : "0";
}
