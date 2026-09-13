/**
 * Static sample data for the Send RFQs (RFQ Enterprise work queue) demo on
 * /products/rfq. Nothing here is fetched and nothing here is a customer's
 * data.
 *
 * WHAT IS REAL: the government side, borrowed from the bid-matching fixture
 * — solicitation numbers, NSNs, descriptions, quantities, estimated values,
 * set-asides, DLA type indicators and bid terms are real, public DIBBS
 * postings.
 *
 * WHAT IS AUTHORED: the team. Buyers, assignments, claims, progress, RFQ and
 * quote counts, staged batch items, win history and stock belong to the same
 * fictional fluid-systems supplier as the other demos.
 *
 * WHAT KEEPS THE DEMO OFFLINE. The real work-queue page fetches a
 * solicitation's parts when a row is expanded; here every row's parts are
 * resolved up front. The row badges' solicitation-type pill triggers a
 * code-definitions fetch, so solicitation_type is passed as null and the DLA
 * type is described in prose instead. Amended pills render inert (no
 * timeline modal). The Get quotes button links into the app, where
 * DemoSurface answers it.
 *
 * DATES ARE OFFSETS from a base date the server supplies at render time.
 */

import type { PartSearchResult } from "@/lib/library/types";
import type { BidTermDefinitions } from "@/lib/library/bidTerms";
import type { MyStockSummary } from "@/lib/inventory/types";
import type { RfqWorkItem } from "@/lib/rfq/types";
import { DEMO_BID_TERM_DEFINITIONS, DEMO_ROW_SEEDS } from "@/lib/demo/bidMatching";

export interface DemoWorklistData {
  items: RfqWorkItem[];
  /** Quotable parts per solicitation id, already loaded. */
  partsBySol: Record<number, PartSearchResult[]>;
  /** The supplier's own stock per part id, rolled up per part. */
  myStockByPart: Record<number, MyStockSummary>;
  bidTermDefinitions: BidTermDefinitions;
  /** The signed-in buyer the demo pretends to be. */
  currentUser: { id: number; name: string };
}

const BUYERS = {
  dana: { id: 1, name: "Dana Whitfield" },
  marcus: { id: 2, name: "Marcus Bell" },
  priya: { id: 3, name: "Priya Natarajan" },
} as const;
type BuyerKey = keyof typeof BUYERS;

interface ItemSeed {
  id: number;
  /** Solicitation number in the bid-matching fixture, whose real fields are reused. */
  number: string;
  work: RfqWorkItem["work_status"];
  assigned?: BuyerKey;
  derived?: BuyerKey[];
  rfqs?: number;
  quotes?: number;
  staged?: { count: number; by: BuyerKey };
  notes?: string | null;
  won?: number;
  wonOn?: number;
  wonPrice?: number;
  /** Stocked parts out of quotable, when the supplier has inventory on it. */
  stock?: { total: number; price: number; warehouse: string; other: number; asOf: number; stale?: boolean };
  matchedAgo: number;
  amended?: boolean;
}

const ITEM_SEEDS: ItemSeed[] = [
  { id: 501, number: "SPE7MC-26-T-246X", work: "priced", assigned: "dana", rfqs: 3, quotes: 2, won: 1, wonOn: -190, wonPrice: 141.2, stock: { total: 850, price: 98.4, warehouse: "Reno NV · Bin 14C", other: 1, asOf: -3 }, matchedAgo: 2 },
  { id: 502, number: "SPE7MC-26-T-267F", work: "priced", assigned: "marcus", rfqs: 2, quotes: 1, won: 1, wonOn: -95, wonPrice: 4390, stock: { total: 31, price: 3890, warehouse: "Reno NV · Bin 22B", other: 0, asOf: -3 }, matchedAgo: 3 },
  { id: 503, number: "SPE7M4-26-T-390F", work: "rfq_sent", assigned: "priya", rfqs: 2, quotes: 0, won: 3, wonOn: -60, wonPrice: 9870, matchedAgo: 1 },
  { id: 508, number: "SPE7MC-26-T-264N", work: "unworked", derived: ["dana", "marcus"], staged: { count: 2, by: "dana" }, stock: { total: 6, price: 3720, warehouse: "Reno NV · Bin 19A", other: 0, asOf: -41, stale: true }, matchedAgo: 0 },
  { id: 509, number: "SPE7MC-26-T-265W", work: "unworked", derived: ["dana"], won: 2, wonOn: -400, wonPrice: 301.5, matchedAgo: 0, amended: true },
  { id: 504, number: "SPE7M5-26-T-487Z", work: "bid", assigned: "marcus", rfqs: 2, quotes: 1, matchedAgo: 6 },
  { id: 510, number: "SPE7M4-26-T-389Z", work: "unworked", matchedAgo: 0, amended: true },
  { id: 511, number: "SPE7M1-26-Q-1469", work: "no_bid", assigned: "priya", rfqs: 1, quotes: 0, matchedAgo: 9, notes: "Filter assembly is a 51k unit — vendor quote came back over GAC, passing." },
  { id: 512, number: "SPE7M5-26-T-470Q", work: "unworked", matchedAgo: 1 },
  { id: 513, number: "SPE7M4-26-T-390E", work: "quotes_in", assigned: "dana", rfqs: 2, quotes: 1, won: 3, wonOn: -120, wonPrice: 19530.5, matchedAgo: 5 },
];

function addDays(base: Date, offset: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}
function day(base: Date, offset: number): string {
  return addDays(base, offset).toISOString().slice(0, 10);
}
function stamp(base: Date, offset: number, hour = 6): string {
  const d = addDays(base, offset);
  d.setUTCHours(hour, 15, 0, 0);
  return d.toISOString();
}

export function resolveDemoWorklist(baseISO: string): DemoWorklistData {
  const base = new Date(baseISO);
  const items: RfqWorkItem[] = [];
  const partsBySol: Record<number, PartSearchResult[]> = {};
  const myStockByPart: Record<number, MyStockSummary> = {};

  for (const seed of ITEM_SEEDS) {
    const src = DEMO_ROW_SEEDS.find((r) => r.solicitation_number === seed.number);
    if (!src) continue;
    const partId = 800000 + seed.id;
    const unitPrice =
      src.estimated_value != null && src.quantity
        ? Math.round((src.estimated_value / src.quantity) * 100) / 100
        : null;

    partsBySol[seed.id] = [
      {
        id: partId,
        nsn: (src.nsn ?? "").replace(/-/g, ""),
        niin: src.nsn ? src.nsn.slice(5) : null,
        fsc: src.fsc ?? null,
        mfg_cage: null,
        mfg_part_number: null,
        description: src.part_description,
        unit_of_issue: "EA",
        unit_price: unitPrice,
        psclas: null,
        nscode: null,
        quantity: src.quantity,
      },
    ];

    if (seed.stock) {
      myStockByPart[partId] = {
        totalQuantity: seed.stock.total,
        unitPrice: seed.stock.price,
        unitOfMeasure: "EA",
        conditionCode: "A",
        warehouse: seed.stock.warehouse,
        otherLocations: seed.stock.other,
        asOfDate: day(base, seed.stock.asOf),
        isStale: seed.stock.stale ?? false,
      };
    }

    const assigned = seed.assigned ? BUYERS[seed.assigned] : null;
    const derived = (seed.derived ?? []).map((k) => BUYERS[k]);
    items.push({
      solicitation_id: seed.id,
      solicitation_number: src.solicitation_number,
      agency_code: null,
      issue_date: day(base, src.issue_date_offset),
      close_date: day(base, src.close_date_offset),
      status: "open",
      buyer_name: null,
      set_aside: src.set_aside,
      set_aside_code: src.set_aside_code,
      set_aside_label: src.set_aside_label,
      // Null on purpose: the type pill fetches code definitions when it
      // mounts. The label still travels for the demo's own copy.
      solicitation_type: null,
      solicitation_type_label: src.solicitation_type_label,
      bid_terms: src.bid_terms,
      has_pdf: false,
      pr_numbers: [`70${String(17800000 + seed.id * 137).slice(0, 8)}`],
      has_amendment_indicator: seed.amended ?? false,
      has_post_match_amendment: seed.amended ?? false,
      latest_post_match_amendment_at: seed.amended ? stamp(base, -1, 14) : null,
      match_count: 1,
      last_matched_at: stamp(base, -seed.matchedAgo),
      rfq_count: seed.rfqs ?? 0,
      quote_count: seed.quotes ?? 0,
      estimated_value: src.estimated_value,
      work_status: seed.work,
      assigned_user_id: assigned?.id ?? null,
      assigned_user_name: assigned?.name ?? null,
      derived_user_ids: derived.map((b) => b.id),
      derived_user_names: derived.map((b) => b.name),
      staged_count: seed.staged?.count ?? 0,
      staged_by_names: seed.staged ? [BUYERS[seed.staged.by].name] : [],
      notes: seed.notes ?? null,
      first_article: false,
      won_part_count: seed.won ?? 0,
      last_won_on: seed.wonOn != null ? day(base, seed.wonOn) : null,
      won_parts: seed.won
        ? [{ nsn: src.nsn, win_count: seed.won, last_won_on: day(base, seed.wonOn ?? -100), last_unit_price: seed.wonPrice ?? null }]
        : [],
      quotable_part_count: 1,
      stocked_part_count: seed.stock ? 1 : 0,
      stock_quoted_part_ids: [],
    });
  }

  return {
    items,
    partsBySol,
    myStockByPart,
    bidTermDefinitions: DEMO_BID_TERM_DEFINITIONS,
    currentUser: BUYERS.dana,
  };
}
