/**
 * Static sample data for the public Supplier Stock demo on /products/supplier-stock.
 * Nothing here is fetched and nothing here is a customer's data.
 *
 * WHAT IS REAL: the parts. NSNs and descriptions are the same real DIBBS
 * catalog items the other demos use, so a stock line here is a line for a
 * part that exists.
 *
 * WHAT IS AUTHORED: every quantity, price, warehouse, SKU, upload and
 * network listing. Inventory is the most private data a supplier has, so
 * all of it belongs to the same fictional fluid-systems supplier as the
 * other demos — and the network listings belong to fictional suppliers too,
 * projected the way the app projects them (an anonymous label, a quantity
 * band, no price unless shared).
 *
 * WHAT KEEPS THE DEMO OFFLINE. InventoryPanel, NetworkStockTable, DataTable
 * and the item columns are props-driven. NetworkStockTable's per-row
 * "Email supplier" link fires a tracking beacon and opens the mail client,
 * so every network listing here routes inquiries through GPH RFQ instead.
 *
 * DATES ARE OFFSETS from a base date the server supplies at render time, so
 * a "stale" line is genuinely older than thirty days on the day you look.
 */

import type {
  InventoryItem,
  InventoryUpload,
  MyStockSummary,
  NetworkStockItem,
  PartInventory,
  UploadPreview,
} from "@/lib/inventory/types";

export interface DemoInventoryData {
  /** The Items tab: the supplier's own live lines. */
  items: InventoryItem[];
  /** The Upload history tab. */
  uploads: InventoryUpload[];
  /** The review screen a fresh upload lands on before anything imports. */
  preview: UploadPreview;
  /** The Supplier Stock tab on one part record, as this supplier sees it. */
  partInventory: PartInventory;
  /** The same part's stock rolled up the way the Send RFQs queue shows it. */
  myStockSummary: MyStockSummary;
}

// ---------------------------------------------------------------------------
// Date helpers. UTC throughout so the server's timezone cannot shift a day.
// ---------------------------------------------------------------------------

function addDays(base: Date, offset: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}
function day(base: Date, offset: number): string {
  return addDays(base, offset).toISOString().slice(0, 10);
}
function stamp(base: Date, offset: number, hour = 9): string {
  const d = addDays(base, offset);
  d.setUTCHours(hour, 40, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Items. Quantities are strings because the API serialises decimals that way.
// ---------------------------------------------------------------------------

interface ItemSeed {
  id: number;
  sku: string;
  nsn: string; // FSC-NIIN
  description: string;
  pn?: string;
  cage?: string;
  qty: number;
  committed?: number;
  uom?: string;
  cond?: string;
  price?: number;
  lead?: number;
  moq?: number;
  warehouse: string;
  asOf: number;
  match?: InventoryItem["match_status"];
  hidden?: boolean;
  source?: string;
  trace?: string;
}

const ITEM_SEEDS: ItemSeed[] = [
  { id: 5101, sku: "MFS-4820-0117", nsn: "4820-01-317-9684", description: "VALVE,CHECK,OXYGEN SYSTEM", pn: "G001-1010-03", cage: "60240", qty: 640, committed: 120, cond: "A", price: 98.4, lead: 5, moq: 10, warehouse: "Reno NV · Bin 14C", asOf: -3, source: "authorized_distributor", trace: "coc" },
  { id: 5102, sku: "MFS-4820-0118", nsn: "4820-01-317-9684", description: "VALVE,CHECK,OXYGEN SYSTEM", pn: "G001-1010-03", cage: "60240", qty: 210, cond: "A", price: 98.4, lead: 5, moq: 10, warehouse: "Columbus OH · Bin 07A", asOf: -3, source: "authorized_distributor", trace: "coc" },
  { id: 5103, sku: "MFS-4810-0042", nsn: "4810-01-614-4712", description: "VALVE,SOLENOID", qty: 31, cond: "A", price: 3890, lead: 10, warehouse: "Reno NV · Bin 22B", asOf: -3, source: "oem", trace: "coc_plus_test_reports" },
  { id: 5104, sku: "MFS-4820-0231", nsn: "4820-01-547-9506", description: "VALVE,SAFETY RELIEF", qty: 88, cond: "A", price: 262.5, lead: 7, warehouse: "Reno NV · Bin 22D", asOf: -3, source: "authorized_distributor", trace: "coc" },
  { id: 5105, sku: "MFS-4720-0016", nsn: "4720-01-324-0233", description: "HOSE ASSEMBLY,AIR DUCT", qty: 14, cond: "A", price: 610, lead: 14, warehouse: "Columbus OH · Bin 03F", asOf: -3, source: "oem", trace: "coc" },
  { id: 5106, sku: "MFS-4820-0088", nsn: "4820-01-538-3563", description: "VALVE,GLOBE", qty: 6, cond: "A", price: 3720, lead: 21, warehouse: "Reno NV · Bin 19A", asOf: -41, source: "broker", trace: "none" },
  { id: 5107, sku: "MFS-5925-0304", nsn: "5925-01-318-9547", description: "CIRCUIT BREAKER", qty: 3, cond: "A", price: 6580, lead: 30, warehouse: "Columbus OH · Bin 11B", asOf: -3, source: "authorized_distributor", trace: "coc" },
  { id: 5108, sku: "MFS-5330-0509", nsn: "5330-01-324-0927", description: "GASKET", qty: 1200, cond: "A", price: 41.2, lead: 3, moq: 50, warehouse: "Reno NV · Bin 30C", asOf: -3, source: "oem", trace: "mill_certs" },
  { id: 5109, sku: "MFS-4730-0071", nsn: "4730-01-310-7831", description: "FLANGE,PIPE", qty: 0, lead: 21, warehouse: "Reno NV · Bin 08A", asOf: -3, source: "authorized_distributor", trace: "coc" },
  { id: 5110, sku: "MFS-MISC-0410", nsn: "", description: "", pn: "HV-2277-A", cage: "0HV27", qty: 40, cond: "A", price: 55, warehouse: "Reno NV · Bin 31A", asOf: -3, match: "unmatched" },
];

const NSN_RE = /^(\d{4})-(\d{2}-\d{3}-\d{4})$/;

function itemFrom(base: Date, s: ItemSeed): InventoryItem {
  const m = NSN_RE.exec(s.nsn);
  return {
    id: s.id,
    customer_sku: s.sku,
    niin: m ? m[2] : null,
    fsc: m ? m[1] : null,
    part_number: s.pn ?? null,
    cage_code: s.cage ?? null,
    quantity_on_hand: String(s.qty),
    quantity_committed: s.committed != null ? String(s.committed) : null,
    quantity_available: s.committed != null ? String(s.qty - s.committed) : String(s.qty),
    unit_of_measure: s.uom ?? "EA",
    condition_code: s.cond ?? null,
    condition_notes: null,
    material_source: s.source ?? null,
    unit_price: s.price != null ? s.price.toFixed(2) : null,
    currency: "USD",
    price_valid_until: s.price != null ? day(base, 60) : null,
    minimum_order_quantity: s.moq != null ? String(s.moq) : null,
    package_quantity: null,
    lead_time_days: s.lead ?? null,
    country_of_origin: "US",
    traceability: s.trace ?? null,
    lot_number: null,
    serial_number: null,
    date_of_manufacture: null,
    cure_date: null,
    expiration_date: null,
    shelf_life_code: null,
    dfars_compliant: true,
    export_controlled: false,
    hazmat: false,
    warehouse_location: s.warehouse,
    ship_from_region: "US-West",
    ship_from_country: "US",
    notes: null,
    part_id: m ? 800000 + s.id : null,
    match_status: s.match ?? (s.pn && s.cage ? "matched_cage_part" : "matched_niin"),
    as_of_date: day(base, s.asOf),
    is_active: true,
    network_hidden_at: s.hidden ? stamp(base, -2) : null,
    updated_at: stamp(base, s.asOf),
  };
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

function uploads(base: Date): InventoryUpload[] {
  const mk = (
    id: number, offset: number, name: string, mode: InventoryUpload["mode"], status: InventoryUpload["status"],
    rows: { total: number; valid: number; rejected: number; matched?: number; unmatched?: number; ambiguous?: number; removed?: number; shrink?: string; warn?: boolean },
  ): InventoryUpload => ({
    id,
    source: "web",
    original_filename: name,
    file_size_bytes: rows.total * 148,
    mode,
    status,
    total_rows: rows.total,
    valid_rows: rows.valid,
    rejected_rows: rows.rejected,
    matched_rows: rows.matched ?? null,
    unmatched_rows: rows.unmatched ?? null,
    ambiguous_rows: rows.ambiguous ?? null,
    deactivated_rows: rows.removed ?? null,
    shrink_pct: rows.shrink ?? null,
    shrink_warning: rows.warn ?? false,
    error_message: null,
    confirmed_at: status === "completed" ? stamp(base, offset, 10) : null,
    completed_at: status === "completed" ? stamp(base, offset, 10) : null,
    created_at: stamp(base, offset, 9),
  });
  return [
    mk(7, -3, "meridian-stock-2026-09.csv", "replace", "completed", { total: 412, valid: 409, rejected: 3, matched: 398, unmatched: 11, removed: 6, shrink: "1.4" }),
    mk(6, -31, "meridian-stock-2026-08.csv", "replace", "completed", { total: 418, valid: 418, rejected: 0, matched: 404, unmatched: 14, removed: 2, shrink: "0.5" }),
    mk(5, -44, "reno-cycle-count.csv", "upsert", "completed", { total: 96, valid: 94, rejected: 2, matched: 93, unmatched: 1, ambiguous: 0 }),
    mk(4, -62, "meridian-stock-2026-07.csv", "replace", "cancelled", { total: 211, valid: 211, rejected: 0, shrink: "49.5", warn: true }),
    mk(3, -63, "meridian-stock-2026-07.csv", "replace", "completed", { total: 419, valid: 417, rejected: 2, matched: 401, unmatched: 16, removed: 4, shrink: "0.9" }),
  ];
}

// ---------------------------------------------------------------------------
// The review screen for the latest file, as it looked before Confirm.
// ---------------------------------------------------------------------------

function preview(base: Date, latest: InventoryUpload): UploadPreview {
  const row = (
    n: number, sku: string, ident: string, qty: number | null, uom: string, ok: boolean,
    desc: string | null, code?: string, msg?: string,
  ) => ({
    row_number: n,
    raw: {},
    normalized: { customer_sku: sku, niin: ident.includes("-") ? ident : undefined, part_number: ident.includes("-") ? undefined : ident, quantity_on_hand: qty, unit_of_measure: uom },
    is_valid: ok,
    error_code: ok ? null : code ?? "invalid",
    error_message: msg ?? null,
    enrichment: desc ? { match_status: "matched_niin" as const, nsn: ident, description: desc, unit_of_issue: "EA" } : null,
  });
  return {
    upload: { ...latest, status: "awaiting_confirmation", matched_rows: null, unmatched_rows: null, deactivated_rows: null, confirmed_at: null, completed_at: null },
    column_mapping: {
      "Item": "customer_sku",
      "NSN": "nsn",
      "Mfr P/N": "part_number",
      "Mfr CAGE": "cage_code",
      "Qty On Hand": "quantity_on_hand",
      "U/M": "unit_of_measure",
      "Cond": "condition_code",
      "Std Cost": "unit_price",
      "Lead Days": "lead_time_days",
      "Bin": "warehouse_location",
      "Count Date": "as_of_date",
    },
    unmapped_headers: ["Buyer Initials", "GL Account"],
    sample_rows: [
      row(1, "MFS-4820-0117", "4820-01-317-9684", 640, "EA", true, "VALVE,CHECK,OXYGEN SYSTEM"),
      row(2, "MFS-4820-0118", "4820-01-317-9684", 210, "EA", true, "VALVE,CHECK,OXYGEN SYSTEM"),
      row(3, "MFS-4810-0042", "4810-01-614-4712", 31, "EA", true, "VALVE,SOLENOID"),
      row(4, "MFS-4820-0231", "4820-01-547-9506", 88, "EA", true, "VALVE,SAFETY RELIEF", undefined, "No condition code — defaulted to A. Lines without a condition code are not shown to other customers."),
      row(5, "MFS-MISC-0410", "HV-2277-A", 40, "EA", true, null),
      row(6, "MFS-5330-0510", "5.33E+12", 250, "EA", false, null, "bad_identifier", "NSN arrived in scientific notation (Excel). Format the column as Text and re-export."),
      row(7, "MFS-4720-0016", "4720-01-324-0233", 14, "EA", true, "HOSE ASSEMBLY,AIR DUCT"),
      row(8, "MFS-4730-0071", "4730-01-310-7831", 0, "EA", true, "FLANGE,PIPE"),
    ],
    warning_count: 4,
    would_deactivate: 6,
    shrink_pct: "1.4",
    shrink_warning: false,
  };
}

// ---------------------------------------------------------------------------
// Network listings on the check valve, as other suppliers projected them.
// ---------------------------------------------------------------------------

function networkStock(base: Date): NetworkStockItem[] {
  const common = {
    part_id: 800000 + 5101,
    niin: "01-317-9684",
    fsc: "4820",
    part_number: null,
    inquiry_routing: "rfq" as const,
    inquiry_email: null,
  };
  return [
    { ...common, listing_id: 61, supplier_label: "Authorized distributor · ships from US-East", supplier_customer_id: null, quantity: null, quantity_band: "100–499", in_stock: true, unit_of_measure: "EA", condition_code: "A", material_source: "authorized_distributor", unit_price: null, currency: null, minimum_order_quantity: "25", lead_time_days: 7, traceability: "coc", country_of_origin: "US", ship_from_region: "US-East", ship_from_country: "US", as_of_date: day(base, -6), is_stale: false },
    { ...common, listing_id: 62, supplier_label: "Sable Marine Hardware", supplier_customer_id: null, quantity: "1200", quantity_band: null, in_stock: true, unit_of_measure: "EA", condition_code: "A", material_source: "oem", unit_price: "121.00", currency: "USD", minimum_order_quantity: null, lead_time_days: 3, traceability: "coc_plus_test_reports", country_of_origin: "US", ship_from_region: "US-South", ship_from_country: "US", as_of_date: day(base, -1), is_stale: false },
    { ...common, listing_id: 63, supplier_label: "Broker · ships from US-West", supplier_customer_id: null, quantity: null, quantity_band: null, in_stock: true, unit_of_measure: "EA", condition_code: "A", material_source: "broker", unit_price: null, currency: null, minimum_order_quantity: null, lead_time_days: 14, traceability: "none", country_of_origin: null, ship_from_region: "US-West", ship_from_country: "US", as_of_date: day(base, -38), is_stale: true },
  ];
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export function resolveDemoInventory(baseISO: string): DemoInventoryData {
  const base = new Date(baseISO);
  const items = ITEM_SEEDS.map((s) => itemFrom(base, s));
  const ups = uploads(base);
  const checkValve = items.filter((i) => i.niin === "01-317-9684");

  return {
    items,
    uploads: ups,
    preview: preview(base, ups[0]),
    partInventory: {
      nsn: "4820013179684",
      my_stock: checkValve,
      network_stock: networkStock(base),
      network_viewable: true,
    },
    myStockSummary: {
      totalQuantity: checkValve.reduce((n, i) => n + Number(i.quantity_on_hand), 0),
      unitPrice: 98.4,
      unitOfMeasure: "EA",
      conditionCode: "A",
      warehouse: "Reno NV · Bin 14C",
      otherLocations: 1,
      asOfDate: day(base, -3),
      isStale: false,
    },
  };
}
