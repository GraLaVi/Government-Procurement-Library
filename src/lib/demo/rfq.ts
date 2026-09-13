/**
 * Static sample data for the public RFQ demo on /products/rfq. Nothing here
 * is fetched and nothing here is a customer's data.
 *
 * WHAT IS REAL: the government side. Solicitation numbers, NSNs, item
 * descriptions and quantities are real, public DIBBS postings — the same
 * ones the bid-matching demo shows being matched.
 *
 * WHAT IS AUTHORED: everything a customer would see about itself. The
 * buyers, the vendors, their CAGE codes and email addresses, the quotes and
 * the pricing all belong to the same fictional fluid-systems supplier as the
 * other demos. Vendor relationships and quotes are exactly the data an
 * account keeps private, so none of it can be borrowed from a real one.
 *
 * WHAT KEEPS THE DEMO OFFLINE. RfqPipelineTable and RfqRecord are
 * presentation-only, so nothing here has to be curated away from a fetch.
 * The pipeline's two links — the RFQ reference into /rfq/:id and the
 * solicitation into /rfq/worklist — are caught by DemoSurface: the demo
 * opens the record itself for references it has a record for, and prompts
 * for everything else.
 *
 * DATES ARE OFFSETS from a base date the server supplies at render time, so
 * "Bid due" is always a few days out and "Stale" is always genuinely past.
 */

import type {
  RfqContributor,
  RfqDetail,
  RfqListItem,
  RfqResponseDetail,
  RfqWorkStatus,
} from "@/lib/rfq/types";

export interface DemoRfqRecord {
  rfq: RfqDetail;
  responses: RfqResponseDetail[];
}

export interface DemoRfqData {
  /** Pipeline rows, newest first — the order the app lists them in. */
  rows: RfqListItem[];
  contributors: RfqContributor[];
  /** Full records for the RFQs the demo can open, keyed by RFQ id. */
  records: Record<number, DemoRfqRecord>;
}

// ---------------------------------------------------------------------------
// Cast
// ---------------------------------------------------------------------------

const BUYERS = {
  dana: { user_id: 1, name: "Dana Whitfield" },
  marcus: { user_id: 2, name: "Marcus Bell" },
  priya: { user_id: 3, name: "Priya Natarajan" },
} as const;
type BuyerKey = keyof typeof BUYERS;

const VENDORS = {
  halvorsen: { cage: "0HV27", name: "Halvorsen Valve & Fitting", email: "quotes@halvorsen-vf.example", contact: "Rikke Halvorsen" },
  corbin: { cage: "4CA19", name: "Corbin Aerospace Supply", email: "rfq@corbinaero.example", contact: "Terrence Odom" },
  northgate: { cage: "7NG52", name: "Northgate Industrial Distributors", email: "bids@northgate-ind.example", contact: "Lena Marsh" },
  blueRidge: { cage: "2BR84", name: "Blue Ridge Hydraulics", email: "sales@blueridgehyd.example", contact: "Caleb Foss" },
  pemberton: { cage: "5PE63", name: "Pemberton Electrical Components", email: "quotes@pemberton-ec.example", contact: "Ines Duarte" },
  sable: { cage: "9SM31", name: "Sable Marine Hardware", email: "rfq@sablemarine.example", contact: "Owen Tran" },
  keel: { cage: "3KC08", name: "Keel & Compass Supply", email: "quotes@keelcompass.example", contact: "Marguerite Beal" },
} as const;
type VendorKey = keyof typeof VENDORS;

// ---------------------------------------------------------------------------
// The solicitations being bid. Real DIBBS postings.
// ---------------------------------------------------------------------------

const SOLICITATIONS = {
  checkValve: { id: 501, number: "SPE7MC-26-T-246X", nsn: "4820013179684", description: "VALVE,CHECK,OXYGEN SYSTEM", quantity: 1250, bidDue: 10 },
  solenoid: { id: 502, number: "SPE7MC-26-T-267F", nsn: "4810016144712", description: "VALVE,SOLENOID", quantity: 13, bidDue: 9 },
  hose: { id: 503, number: "SPE7M4-26-T-390F", nsn: "4720014251217", description: "HOSE ASSEMBLY,NONMETALLIC", quantity: 7, bidDue: 8 },
  breaker: { id: 504, number: "SPE7M5-26-T-487Z", nsn: "5925015930761", description: "CIRCUIT BREAKER", quantity: 11, bidDue: 10 },
  filter: { id: 505, number: "SPE7M1-26-Q-1469", nsn: "4330013312949", description: "FILTER ASSEMBLY,FLUID", quantity: 10, bidDue: 10 },
  hatch: { id: 506, number: "SPE7M4-26-T-390E", nsn: "2040014203393", description: "HATCH,MARINE", quantity: 1, bidDue: 5 },
  standoff: { id: 507, number: "SPE7L1-26-T-06T6", nsn: "5340005174014", description: "STANDOFF,THREADED,SPACING", quantity: 11, bidDue: -3 },
} as const;
type SolKey = keyof typeof SOLICITATIONS;

/** NSN as the pipeline titles it: FSC-NIIN with the NIIN dashed. */
function titleFor(nsn: string): string {
  return `${nsn.slice(0, 4)}-${nsn.slice(4, 6)}-${nsn.slice(6, 9)}-${nsn.slice(9)}`;
}

// ---------------------------------------------------------------------------
// Pipeline rows, as authored. One RFQ per vendor, which is how the app sends
// them: a solicitation quoted to three vendors is three rows sharing one
// progress value.
// ---------------------------------------------------------------------------

interface RowSeed {
  id: number;
  sol: SolKey | null;
  /** Title for RFQs with no solicitation behind them. */
  title?: string;
  vendor: VendorKey;
  by: BuyerKey;
  sent: number;
  quoteDue: number;
  /** Recipient status, which for a one-vendor RFQ is also the aggregate. */
  status: "sent" | "viewed" | "responded" | "declined" | "stale" | "closed";
  rfqStatus?: "sent" | "closed";
  work: RfqWorkStatus | null;
  shared: number;
  updatedBy?: BuyerKey;
  updated?: number;
  ready?: boolean;
}

const ROWS: RowSeed[] = [
  { id: 126, sol: "checkValve", vendor: "northgate", by: "dana", sent: -2, quoteDue: 6, status: "viewed", work: "priced", shared: 3, updatedBy: "dana", updated: 0 },
  { id: 125, sol: "checkValve", vendor: "corbin", by: "dana", sent: -2, quoteDue: 6, status: "responded", work: "priced", shared: 3, updatedBy: "dana", updated: 0 },
  { id: 124, sol: "checkValve", vendor: "halvorsen", by: "dana", sent: -2, quoteDue: 6, status: "responded", work: "priced", shared: 3, updatedBy: "dana", updated: 0, ready: true },
  { id: 123, sol: "solenoid", vendor: "blueRidge", by: "marcus", sent: -3, quoteDue: 5, status: "declined", work: "priced", shared: 2, updatedBy: "marcus", updated: -1 },
  { id: 122, sol: "solenoid", vendor: "halvorsen", by: "marcus", sent: -3, quoteDue: 5, status: "responded", work: "priced", shared: 2, updatedBy: "marcus", updated: -1, ready: true },
  { id: 121, sol: "hose", vendor: "northgate", by: "priya", sent: -1, quoteDue: 4, status: "sent", work: "rfq_sent", shared: 2, updatedBy: "priya", updated: -1 },
  { id: 120, sol: "hose", vendor: "blueRidge", by: "priya", sent: -1, quoteDue: 4, status: "viewed", work: "rfq_sent", shared: 2, updatedBy: "priya", updated: -1 },
  { id: 119, sol: null, title: "3 items", vendor: "sable", by: "dana", sent: -4, quoteDue: 3, status: "responded", work: null, shared: 0, updatedBy: "dana", updated: -4 },
  { id: 118, sol: "breaker", vendor: "corbin", by: "marcus", sent: -6, quoteDue: 2, status: "declined", work: "bid", shared: 2, updatedBy: "marcus", updated: 0 },
  { id: 117, sol: "breaker", vendor: "pemberton", by: "marcus", sent: -6, quoteDue: 2, status: "responded", work: "bid", shared: 2, updatedBy: "marcus", updated: 0, ready: true },
  { id: 116, sol: "filter", vendor: "blueRidge", by: "priya", sent: -9, quoteDue: -1, status: "stale", work: "no_bid", shared: 1, updatedBy: "priya", updated: -1 },
  { id: 115, sol: "hatch", vendor: "keel", by: "dana", sent: -5, quoteDue: 1, status: "viewed", work: "quotes_in", shared: 2, updatedBy: "dana", updated: -2 },
  { id: 114, sol: "hatch", vendor: "sable", by: "dana", sent: -5, quoteDue: 1, status: "responded", work: "quotes_in", shared: 2, updatedBy: "dana", updated: -2 },
  { id: 113, sol: "standoff", vendor: "northgate", by: "marcus", sent: -14, quoteDue: -6, status: "closed", rfqStatus: "closed", work: "passed", shared: 1, updatedBy: "marcus", updated: -4 },
];

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

function stamp(base: Date, offset: number, hour = 15): string {
  const d = addDays(base, offset);
  d.setUTCHours(hour, 20, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export function resolveDemoRfq(baseISO: string): DemoRfqData {
  const base = new Date(baseISO);

  const rows: RfqListItem[] = ROWS.map((r) => {
    const sol = r.sol ? SOLICITATIONS[r.sol] : null;
    const vendor = VENDORS[r.vendor];
    const by = BUYERS[r.by];
    const updatedBy = BUYERS[r.updatedBy ?? r.by];
    const responded = r.status === "responded" || r.status === "closed";
    return {
      id: r.id,
      reference_number: r.id,
      title: r.title ?? titleFor(sol!.nsn),
      status: r.rfqStatus ?? "sent",
      response_due_date: day(base, r.quoteDue),
      sent_at: stamp(base, r.sent, 9),
      created_at: stamp(base, r.sent, 9),
      recipient_count: 1,
      response_count: responded ? 1 : 0,
      aggregate_status: r.status,
      primary_vendor_name: vendor.name,
      primary_cage_code: vendor.cage,
      created_by_user_id: by.user_id,
      created_by_name: by.name,
      source_solicitation_id: sol?.id ?? null,
      solicitation_number: sol?.number ?? null,
      bid_due_date: sol ? day(base, sol.bidDue) : null,
      work_status: r.work,
      shared_progress_rfq_count: r.shared,
      updated_by_name: updatedBy.name,
      updated_at: stamp(base, r.updated ?? r.sent, 16),
      ready_to_bid: r.ready ?? false,
    };
  });

  const contributors: RfqContributor[] = (Object.keys(BUYERS) as BuyerKey[]).map((k) => ({
    user_id: BUYERS[k].user_id,
    name: BUYERS[k].name,
    rfq_count: ROWS.filter((r) => r.by === k).length,
  }));

  // ---- RFQ-124: the priced check-valve quote, ready to bid ----
  const cv = SOLICITATIONS.checkValve;
  const rfq124: RfqDetail = {
    id: 124,
    reference_number: 124,
    title: titleFor(cv.nsn),
    notes: null,
    status: "sent",
    response_due_date: day(base, 6),
    sent_at: stamp(base, -2, 9),
    closed_at: null,
    created_at: stamp(base, -2, 9),
    source_solicitation_id: cv.id,
    solicitation_number: cv.number,
    work_status: "priced",
    line_items: [
      {
        id: 9001,
        line_number: 1,
        part_id: null,
        nsn: cv.nsn,
        part_number: null,
        description: cv.description,
        quantity: cv.quantity,
        unit_of_measure: "EA",
        need_by_date: day(base, 45),
        target_unit_price: 155,
        notes: "Certificate of conformance required. Quote per DLA packaging.",
      },
    ],
    recipients: [
      {
        id: 7001,
        cage_code: VENDORS.halvorsen.cage,
        vendor_name: VENDORS.halvorsen.name,
        contact_email: VENDORS.halvorsen.email,
        contact_name: VENDORS.halvorsen.contact,
        status: "responded",
        first_viewed_at: stamp(base, -2, 11),
        responded_at: stamp(base, -1, 15),
        declined_at: null,
        reminder_count: 0,
        has_response: true,
      },
    ],
  };
  const responses124: RfqResponseDetail[] = [
    {
      id: 8001,
      recipient_id: 7001,
      cage_code: VENDORS.halvorsen.cage,
      vendor_name: VENDORS.halvorsen.name,
      status: "submitted",
      quote_valid_until: day(base, 30),
      currency: "USD",
      total_price: 176250,
      lead_time_days: 45,
      notes: "Price holds 30 days. Partial shipments available in lots of 500.",
      submitted_at: stamp(base, -1, 15),
      line_items: [
        {
          rfq_line_item_id: 9001,
          unit_price: 141.0,
          quantity_available: 1250,
          lead_time_days: 45,
          manufacturer: null,
          alternate_part_number: null,
          is_no_bid: false,
          notes: null,
          markup_percent: 12,
          shipping_amount: 850,
          other_charges: null,
          price_to_gov: 158.6,
          priced_at: stamp(base, 0, 10),
          priced_by_user_id: BUYERS.dana.user_id,
          priced_by_name: BUYERS.dana.name,
        },
      ],
    },
  ];

  // ---- RFQ-117: the circuit breaker, bid already sent ----
  const br = SOLICITATIONS.breaker;
  const rfq117: RfqDetail = {
    id: 117,
    reference_number: 117,
    title: titleFor(br.nsn),
    notes: null,
    status: "sent",
    response_due_date: day(base, 2),
    sent_at: stamp(base, -6, 9),
    closed_at: null,
    created_at: stamp(base, -6, 9),
    source_solicitation_id: br.id,
    solicitation_number: br.number,
    work_status: "bid",
    line_items: [
      {
        id: 9002,
        line_number: 1,
        part_id: null,
        nsn: br.nsn,
        part_number: null,
        description: br.description,
        quantity: br.quantity,
        unit_of_measure: "EA",
        need_by_date: day(base, 60),
        target_unit_price: null,
        notes: null,
      },
    ],
    recipients: [
      {
        id: 7002,
        cage_code: VENDORS.pemberton.cage,
        vendor_name: VENDORS.pemberton.name,
        contact_email: VENDORS.pemberton.email,
        contact_name: VENDORS.pemberton.contact,
        status: "responded",
        first_viewed_at: stamp(base, -6, 13),
        responded_at: stamp(base, -4, 17),
        declined_at: null,
        reminder_count: 1,
        has_response: true,
      },
    ],
  };
  const responses117: RfqResponseDetail[] = [
    {
      id: 8002,
      recipient_id: 7002,
      cage_code: VENDORS.pemberton.cage,
      vendor_name: VENDORS.pemberton.name,
      status: "submitted",
      quote_valid_until: day(base, 21),
      currency: "USD",
      total_price: 67540,
      lead_time_days: 28,
      notes: null,
      submitted_at: stamp(base, -4, 17),
      line_items: [
        {
          rfq_line_item_id: 9002,
          unit_price: 6140.0,
          quantity_available: 11,
          lead_time_days: 28,
          manufacturer: null,
          alternate_part_number: null,
          is_no_bid: false,
          notes: "New production, current revision.",
          markup_percent: 10,
          shipping_amount: 120,
          other_charges: null,
          price_to_gov: 6764.91,
          priced_at: stamp(base, -3, 9),
          priced_by_user_id: BUYERS.marcus.user_id,
          priced_by_name: BUYERS.marcus.name,
        },
      ],
    },
  ];

  return {
    rows,
    contributors,
    records: {
      124: { rfq: rfq124, responses: responses124 },
      117: { rfq: rfq117, responses: responses117 },
    },
  };
}
