/**
 * Static sample data for the public analytics demo on /products/analytics.
 * Nothing here is fetched and nothing here is a customer's data.
 *
 * WHAT IS REAL: the government side. NSNs, item descriptions, the winning
 * unit prices in the price benchmark, and the competitor CAGEs, names,
 * award values and dates are real, public DIBBS award history for those
 * parts. The prospecting NSNs are real parts.
 *
 * WHAT IS AUTHORED: the customer, and the market summary. The supplier, its
 * awards, profiles, match counts and buy-signal quantities describe the same
 * fictional small-business supplier of fluid-system and electrical
 * components as the bid-matching demo. Market-wide counts and trends are
 * illustrative: the real figures live behind the add-on and change by the
 * hour, and a marketing page should not pretend to be a live feed.
 *
 * WHAT KEEPS THE DEMO OFFLINE. Every analytics widget is props-driven, so
 * nothing here needs curating away from a fetch. Two things link out:
 * NSNs into /library/parts (anchors, swallowed by DemoSurface) and
 * solicitation numbers, which are <button>s that open a fetching modal —
 * DemoSurface gates those by selector on the demo page.
 *
 * DATES ARE OFFSETS, resolved against a base date supplied by the server at
 * render time. Award history dates are absolute — they are history, and a
 * 2026 award does not go stale the way "closing in 3 days" does.
 */

import type {
  AmendmentAlertRow,
  BidMatchAnalytics,
  BookingMonth,
  BuySignalRow,
  CompetitorRow,
  CustomerAnalytics,
  CustomerAnalyticsSummary,
  DayCount,
  HotPartRow,
  MarketOverview,
  MarketPrioritization,
  MatchStrengthDay,
  MonthValue,
  PartPriceBenchmark,
  PartValue,
  ProfileHealthRow,
  ProspectRow,
  RecentMatch,
  ResponseWindowBucket,
  SetAsideMarketRow,
  SetAsideWinRateRow,
  TimeToCloseBucket,
  UpcomingSolicitation,
} from "@/lib/hooks/useAnalytics";

export interface DemoAnalyticsData {
  summary: CustomerAnalyticsSummary;
  business: CustomerAnalytics;
  bidMatch: BidMatchAnalytics;
  market: MarketOverview;
  marketPrioritization: MarketPrioritization;
}

const COMPANY = "Meridian Fluid & Electrical Supply";
const CAGE = "1MF47";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------------------------------------------------------------------------
// Date helpers. UTC throughout so the server's timezone cannot shift a day.
// ---------------------------------------------------------------------------

function addDays(base: Date, offset: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

/** YYYY-MM-DD, `offset` days from the base date. */
function day(base: Date, offset: number): string {
  return addDays(base, offset).toISOString().slice(0, 10);
}

/** Full ISO timestamp, `offset` days from the base date, at a working hour. */
function stamp(base: Date, offset: number, hour = 14): string {
  const d = addDays(base, offset);
  d.setUTCHours(hour, 12, 0, 0);
  return d.toISOString();
}

/** "Mon DD", the backend's TO_CHAR(..., 'Mon DD') for daily charts. */
function dayLabel(base: Date, offset: number): string {
  const d = addDays(base, offset);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** "Mon YYYY", `monthsAgo` calendar months before the base date. */
function monthLabel(base: Date, monthsAgo: number): string {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - monthsAgo, 1));
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Last day of the month `monthsAgo` months back, as YYYY-MM-DD. */
function monthEnd(base: Date, monthsAgo: number): string {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - monthsAgo + 1, 0));
  return d.toISOString().slice(0, 10);
}

function isWeekend(base: Date, offset: number): boolean {
  const dow = addDays(base, offset).getUTCDay();
  return dow === 0 || dow === 6;
}

// ---------------------------------------------------------------------------
// The customer's parts. Real NSNs; the "yours" framing is the fiction.
// ---------------------------------------------------------------------------

const PARTS = {
  filter: { niin: "01-331-2949", fsc: "4330", description: "FILTER ASSEMBLY,FLUID" },
  solenoid: { niin: "01-614-4712", fsc: "4810", description: "VALVE,SOLENOID" },
  hose: { niin: "01-425-1217", fsc: "4720", description: "HOSE ASSEMBLY,NONMETALLIC" },
  checkValve: { niin: "01-317-9684", fsc: "4820", description: "VALVE,CHECK,OXYGEN SYSTEM" },
  breaker: { niin: "01-318-9547", fsc: "5925", description: "CIRCUIT BREAKER" },
  airDuct: { niin: "01-324-0233", fsc: "4720", description: "HOSE ASSEMBLY,AIR DUCT" },
  maskLight: { niin: "01-620-1410", fsc: "6220", description: "MASK LIGHT ASSEMBLY" },
  globe: { niin: "01-538-3563", fsc: "4820", description: "VALVE,GLOBE" },
  tripper: { niin: "01-481-5874", fsc: "5925", description: "TRIPPER,CIRCUIT BREAKER" },
  relief: { niin: "01-547-9506", fsc: "4820", description: "VALVE,SAFETY RELIEF" },
  hatch: { niin: "01-420-3393", fsc: "2040", description: "HATCH,MARINE" },
} as const;

// ---------------------------------------------------------------------------
// Summary strip + Act Now
// ---------------------------------------------------------------------------

const UPCOMING: Array<{ solicitation_number: string; close: number; part: keyof typeof PARTS }> = [
  { solicitation_number: "SPE7M5-26-T-470Q", close: 2, part: "breaker" },
  { solicitation_number: "SPE7M4-26-T-390E", close: 5, part: "hatch" },
  { solicitation_number: "SPE7M4-26-T-390F", close: 8, part: "hose" },
  { solicitation_number: "SPE7MC-26-T-267F", close: 9, part: "solenoid" },
  { solicitation_number: "SPE7MC-26-T-246X", close: 10, part: "checkValve" },
];

const RESPONSE_WINDOW: ResponseWindowBucket[] = [
  { bucket: "urgent", label: "< 3 days", count: 6 },
  { bucket: "soon", label: "3–7 days", count: 14 },
  { bucket: "comfortable", label: "8+ days", count: 17 },
];

const BUY_SIGNALS: BuySignalRow[] = [
  { ...PARTS.checkValve, signal_type: "on_backorder", total_stock: 112, reorder_point: 300, backorder_qty: 640, rop_gap: 188, est_buy_value: 102995 },
  { ...PARTS.solenoid, signal_type: "on_backorder", total_stock: 0, reorder_point: 24, backorder_qty: 31, rop_gap: 24, est_buy_value: 140282 },
  { ...PARTS.relief, signal_type: "below_reorder_point", total_stock: 41, reorder_point: 120, backorder_qty: null, rop_gap: 79, est_buy_value: 25964 },
  { ...PARTS.airDuct, signal_type: "below_reorder_point", total_stock: 18, reorder_point: 40, backorder_qty: null, rop_gap: 22, est_buy_value: 17028 },
];

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

const HOT_PARTS: HotPartRow[] = [
  { part_id: null, ...PARTS.checkValve, last_30d_count: 7, baseline_monthly_avg: 1.7, surge: 5.3 },
  { part_id: null, ...PARTS.solenoid, last_30d_count: 5, baseline_monthly_avg: 1.3, surge: 3.7 },
  { part_id: null, ...PARTS.maskLight, last_30d_count: 4, baseline_monthly_avg: 1.0, surge: 3.0 },
  { part_id: null, ...PARTS.airDuct, last_30d_count: 3, baseline_monthly_avg: 1.7, surge: 1.3 },
  { part_id: null, ...PARTS.filter, last_30d_count: 2, baseline_monthly_avg: 1.0, surge: 1.0 },
  { part_id: null, ...PARTS.globe, last_30d_count: 1, baseline_monthly_avg: 1.3, surge: -0.3 },
];

// Real NSNs in the supplier's families that it has never been awarded — the
// prospecting list. Values are forecast quantity x the item's recent price.
const PROSPECTS: ProspectRow[] = [
  { niin: "01-310-7831", fsc: "4730", description: "FLANGE,PIPE", signal_type: "on_backorder", forecast_next_12mo: 180, est_value: 1099080 },
  { niin: "01-324-0927", fsc: "5330", description: "GASKET", signal_type: "low_coverage", forecast_next_12mo: 1500, est_value: 754200 },
  { niin: "01-593-0761", fsc: "5925", description: "CIRCUIT BREAKER", signal_type: "below_reorder_point", forecast_next_12mo: 48, est_value: 317136 },
  { niin: "01-057-8958", fsc: "4820", description: "NEEDLE,VALVE", signal_type: "below_reorder_point", forecast_next_12mo: 96, est_value: 41184 },
];

// ---------------------------------------------------------------------------
// Competitive Intel. Benchmarks and competitors are REAL award history for
// the parts above (dev snapshot, 2026-09); the demand tags are authored.
// ---------------------------------------------------------------------------

const BENCHMARKS: PartPriceBenchmark[] = [
  { part_id: null, ...PARTS.solenoid, award_count: 5, min_unit_price: 4283.83, p25_unit_price: 4400.0, median_unit_price: 4525.22, p75_unit_price: 4527.0, max_unit_price: 4527.93, demand_type: "recurring" },
  { part_id: null, ...PARTS.airDuct, award_count: 5, min_unit_price: 653.83, p25_unit_price: 700.0, median_unit_price: 774.0, p75_unit_price: 950.0, max_unit_price: 1141.46, demand_type: "recurring" },
  { part_id: null, ...PARTS.filter, award_count: 3, min_unit_price: 50999.0, p25_unit_price: 51394.0, median_unit_price: 51789.0, p75_unit_price: 51789.5, max_unit_price: 51789.97, demand_type: "recurring" },
  { part_id: null, ...PARTS.maskLight, award_count: 3, min_unit_price: 1489.98, p25_unit_price: 1489.98, median_unit_price: 1489.98, p75_unit_price: 1489.98, max_unit_price: 1489.98, demand_type: "one_off" },
  { part_id: null, ...PARTS.globe, award_count: 2, min_unit_price: 4308.74, p25_unit_price: 4341.0, median_unit_price: 4373.38, p75_unit_price: 4405.0, max_unit_price: 4438.01, demand_type: "unknown" },
  { part_id: null, ...PARTS.checkValve, award_count: 1, min_unit_price: 160.93, p25_unit_price: 160.93, median_unit_price: 160.93, p75_unit_price: 160.93, max_unit_price: 160.93, demand_type: "recurring" },
  { part_id: null, ...PARTS.tripper, award_count: 1, min_unit_price: 13275.0, p25_unit_price: 13275.0, median_unit_price: 13275.0, p75_unit_price: 13275.0, max_unit_price: 13275.0, demand_type: "one_off" },
  { part_id: null, ...PARTS.hose, award_count: 1, min_unit_price: 10286.97, p25_unit_price: 10286.97, median_unit_price: 10286.97, p75_unit_price: 10286.97, max_unit_price: 10286.97, demand_type: "recurring" },
  { part_id: null, ...PARTS.breaker, award_count: 1, min_unit_price: 7815.0, p25_unit_price: 7815.0, median_unit_price: 7815.0, p75_unit_price: 7815.0, max_unit_price: 7815.0, demand_type: "unknown" },
  { part_id: null, ...PARTS.relief, award_count: 1, min_unit_price: 328.66, p25_unit_price: 328.66, median_unit_price: 328.66, p75_unit_price: 328.66, max_unit_price: 328.66, demand_type: "recurring" },
];

const COMPETITORS: CompetitorRow[] = [
  { cage_code: "7L772", company_name: "GENTEX CORP", parts_won_count: 1, total_value: 3221336.76, last_award_date: "2026-02-13" },
  { cage_code: "3B905", company_name: "EAGLE EQUIPMENT CORPORATION", parts_won_count: 1, total_value: 1819080.91, last_award_date: "2026-06-16" },
  { cage_code: "60240", company_name: "GENTEX CORP", parts_won_count: 1, total_value: 1634325.85, last_award_date: "2026-03-02" },
  { cage_code: "3B8L1", company_name: "JANELS INDUSTRIES INC", parts_won_count: 2, total_value: 384810.0, last_award_date: "2026-02-19" },
  { cage_code: "7Z016", company_name: "KAMPI COMPONENTS CO INC", parts_won_count: 4, total_value: 249490.5, last_award_date: "2025-11-17" },
  { cage_code: "1XLG2", company_name: "TNL SALES LLC", parts_won_count: 2, total_value: 225602.62, last_award_date: "2026-08-06" },
  { cage_code: "2B195", company_name: "MARINE AIR SUPPLY CO., INC.", parts_won_count: 1, total_value: 208800.36, last_award_date: "2025-05-29" },
  { cage_code: "66200", company_name: "PIONEER INDUSTRIES, LLC", parts_won_count: 1, total_value: 150941.39, last_award_date: "2025-11-13" },
  { cage_code: "0KD40", company_name: "GEMCAP COMPONENTS INC.", parts_won_count: 1, total_value: 102253.62, last_award_date: "2025-04-24" },
  { cage_code: "1MQB3", company_name: "S I T CORPORATION", parts_won_count: 1, total_value: 62725.48, last_award_date: "2026-06-09" },
];

const SET_ASIDE_WIN_RATE: SetAsideWinRateRow[] = [
  { set_aside: "Total Small Business Set-Aside", set_aside_code: "SBA", matched_count: 148, won_count: 31, win_rate_pct: 20.9 },
  { set_aside: "No Set-Aside", set_aside_code: null, matched_count: 96, won_count: 11, win_rate_pct: 11.5 },
  { set_aside: "Women-Owned Small Business", set_aside_code: "WOSB", matched_count: 22, won_count: 8, win_rate_pct: 36.4 },
  { set_aside: "Service-Disabled Veteran-Owned", set_aside_code: "SDVOSBC", matched_count: 18, won_count: 1, win_rate_pct: 5.6 },
  { set_aside: "HUBZone", set_aside_code: "HZC", matched_count: 9, won_count: 0, win_rate_pct: 0 },
];

/** Award value per month, oldest first (24 months), in dollars, with counts. */
const AWARDS_24MO: Array<[number, number]> = [
  [142300, 3], [96800, 2], [210400, 4], [178900, 3], [88200, 2], [254100, 5],
  [131600, 3], [167300, 3], [302800, 6], [94100, 2], [188700, 4], [221500, 4],
  [146200, 3], [275900, 5], [118400, 2], [199600, 4], [340200, 6], [162800, 3],
  [87500, 2], [244300, 5], [206900, 4], [158200, 3], [291400, 5], [173600, 3],
];

const TOP_PARTS: PartValue[] = [
  { ...PARTS.filter, total_value: 1242900, award_count: 9 },
  { ...PARTS.solenoid, total_value: 688400, award_count: 12 },
  { ...PARTS.hose, total_value: 512300, award_count: 14 },
  { ...PARTS.checkValve, total_value: 402650, award_count: 11 },
  { ...PARTS.breaker, total_value: 297800, award_count: 6 },
];

// ---------------------------------------------------------------------------
// Bid Matching — the same seven profiles the bid-matching demo runs.
// ---------------------------------------------------------------------------

/** Daily match counts for the last 30 weekdays, oldest first. */
const MATCH_COUNTS = [11, 14, 9, 17, 13, 12, 15, 8, 19, 16, 14, 11, 10, 21, 15, 13, 18, 12, 16, 14, 17, 19];

const CONDITION_TYPES = [
  { condition_type: "FSC", count: 412 },
  { condition_type: "NIIN", count: 231 },
  { condition_type: "PART_DESCRIPTION", count: 188 },
  { condition_type: "SET_ASIDE_CODE", count: 97 },
  { condition_type: "CAGE_CODE", count: 41 },
];

const RECENT: Array<{ solicitation_number: string; close: number; profile_name: string; condition_types: string[] }> = [
  { solicitation_number: "SPE7M4-26-T-390F", close: 8, profile_name: "Parts we stock (NIIN watchlist)", condition_types: ["NIIN", "SET_ASIDE_CODE"] },
  { solicitation_number: "SPE7MC-26-T-267F", close: 9, profile_name: "Valves & flow control", condition_types: ["FSC"] },
  { solicitation_number: "SPE7MC-26-T-246X", close: 10, profile_name: "Valves & flow control", condition_types: ["FSC", "SET_ASIDE_CODE"] },
  { solicitation_number: "SPE7M5-26-T-487Z", close: 10, profile_name: "Circuit protection", condition_types: ["FSC"] },
  { solicitation_number: "N00104-26-Q-FF58", close: 24, profile_name: "Valves & flow control", condition_types: ["FSC"] },
];

const AMENDMENTS: Array<{ solicitation_number: string; profile_name: string; close: number; matched: number; amended: number; reason: string }> = [
  { solicitation_number: "SPE7M4-26-T-389Z", profile_name: "Hose, fittings & seals", close: 10, matched: -3, amended: -1, reason: "close_date_change" },
  { solicitation_number: "SPE7MC-26-T-265W", profile_name: "Small-business set-asides", close: 10, matched: -4, amended: -2, reason: "set_aside_change" },
  { solicitation_number: "SPE7M1-26-Q-1469", profile_name: "Valves & flow control", close: 10, matched: -6, amended: 0, reason: "new_item" },
];

const PROFILES: Array<{ profile_id: number; profile_name: string; last: number | null; matches_30d: number; status: string }> = [
  { profile_id: 1, profile_name: "Parts we stock (NIIN watchlist)", last: 0, matches_30d: 61, status: "productive" },
  { profile_id: 2, profile_name: "Valves & flow control", last: 0, matches_30d: 148, status: "productive" },
  { profile_id: 3, profile_name: "Circuit protection", last: 0, matches_30d: 54, status: "productive" },
  { profile_id: 4, profile_name: "Hose, fittings & seals", last: -1, matches_30d: 37, status: "productive" },
  { profile_id: 5, profile_name: "Small-business set-asides", last: 0, matches_30d: 212, status: "over_broad" },
  { profile_id: 6, profile_name: "Approved source - our CAGE", last: -2, matches_30d: 9, status: "productive" },
  { profile_id: 7, profile_name: "Fasteners & hardware", last: -19, matches_30d: 3, status: "dormant" },
];

const TIME_TO_CLOSE: TimeToCloseBucket[] = [
  { bucket: "urgent", label: "< 3 days", count: 2 },
  { bucket: "soon", label: "3–7 days", count: 6 },
  { bucket: "comfortable", label: "8–30 days", count: 9 },
  { bucket: "long", label: "30+ days", count: 2 },
];

// ---------------------------------------------------------------------------
// Market Pulse — illustrative, at the scale of the real thing.
// ---------------------------------------------------------------------------

/** SAM.gov opportunities per month, oldest first, ending last full month. */
const SAM_TREND = [24537, 21732, 24308, 26623, 18907, 19206, 20804, 21463, 21617, 22680, 23115, 21940];

const SET_ASIDE_MARKET: SetAsideMarketRow[] = [
  { code: null, description: "No Set-Aside", open_count: 41073, trend_12mo: [15341, 13922, 14856, 18437, 9920, 13936, 12132, 12766, 12164, 12875, 13410, 12990], yoy_pct: -8.2 },
  { code: "SBA", description: "Total Small Business Set-Aside (FAR 19.5)", open_count: 12727, trend_12mo: [5653, 4870, 5504, 4888, 5509, 4584, 6691, 7003, 7185, 7121, 6890, 7040], yoy_pct: 12.4 },
  { code: "SDVOSBC", description: "Service-Disabled Veteran-Owned Small Business", open_count: 2207, trend_12mo: [997, 829, 964, 877, 936, 733, 1313, 1145, 1184, 1093, 1150, 1208], yoy_pct: 21.6 },
  { code: "8A", description: "8(a) Competed", open_count: 443, trend_12mo: [117, 92, 130, 104, 94, 67, 172, 176, 166, 158, 149, 161], yoy_pct: 18.3 },
  { code: "HZC", description: "HUBZone Set Aside", open_count: 179, trend_12mo: [87, 40, 55, 206, 186, 113, 47, 55, 80, 72, 66, 74], yoy_pct: -3.9 },
  { code: "WOSB", description: "Women-Owned Small Business", open_count: 177, trend_12mo: [172, 120, 140, 99, 122, 143, 100, 111, 103, 112, 118, 109], yoy_pct: 6.1 },
];

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export function resolveDemoAnalytics(baseISO: string): DemoAnalyticsData {
  const base = new Date(baseISO);
  const generated_at = base.toISOString();

  const upcoming: UpcomingSolicitation[] = UPCOMING.map((u) => ({
    solicitation_number: u.solicitation_number,
    close_date: day(base, u.close),
    ...PARTS[u.part],
  }));

  const awards_over_time: MonthValue[] = AWARDS_24MO.map(([total_value, count], i) => ({
    month: monthLabel(base, AWARDS_24MO.length - 1 - i),
    total_value,
    count,
  }));

  // The bookings chart splits the same award stream by DLA buying center.
  const bookings_trend: BookingMonth[] = AWARDS_24MO.slice(-13).map(([total], i, arr) => {
    const monthsAgo = arr.length - 1 - i;
    const dscp = Math.round(total * 0.46);
    const dscr = Math.round(total * 0.31);
    const dscc = Math.round(total * 0.18);
    const other = total - dscp - dscr - dscc;
    return {
      month_ending: monthEnd(base, monthsAgo),
      month_label: monthLabel(base, monthsAgo),
      dscp_booked: dscp,
      dscr_booked: dscr,
      dscc_booked: dscc,
      other_booked: other,
      month_total: total,
    };
  });

  // Weekdays only, walking back from the base date, so the bars line up with
  // the calendar the visitor is looking at — matching runs do not run on
  // Saturdays.
  const match_trend: DayCount[] = [];
  const match_strength_split: MatchStrengthDay[] = [];
  let remaining = [...MATCH_COUNTS].reverse();
  for (let offset = 0; offset > -30 && remaining.length; offset--) {
    if (isWeekend(base, offset)) continue;
    const count = remaining[0];
    remaining = remaining.slice(1);
    const hard = Math.round(count * 0.3);
    match_trend.unshift({ day: dayLabel(base, offset), count });
    match_strength_split.unshift({ day: dayLabel(base, offset), hard, soft: count - hard });
  }

  const recent_matches: RecentMatch[] = RECENT.map((r) => ({
    solicitation_number: r.solicitation_number,
    close_date: day(base, r.close),
    profile_name: r.profile_name,
    condition_types: r.condition_types,
    matched_at: stamp(base, 0, 6),
  }));

  const amendment_alerts: AmendmentAlertRow[] = AMENDMENTS.map((a) => ({
    solicitation_number: a.solicitation_number,
    close_date: day(base, a.close),
    profile_name: a.profile_name,
    matched_at: stamp(base, a.matched, 6),
    latest_amendment_at: stamp(base, a.amended, 10),
    change_reason: a.reason,
  }));

  const profile_health: ProfileHealthRow[] = PROFILES.map((p) => ({
    profile_id: p.profile_id,
    profile_name: p.profile_name,
    last_match_date: p.last === null ? null : day(base, p.last),
    matches_30d: p.matches_30d,
    status: p.status,
  }));

  const summary: CustomerAnalyticsSummary = {
    cage_code: CAGE,
    company_name: COMPANY,
    procurement_history_total: 4862310,
    open_solicitations_count: 37,
    competitor_count: 24,
    upcoming_solicitations: upcoming,
    generated_at,
  };

  const business: CustomerAnalytics = {
    cage_code: CAGE,
    company_name: COMPANY,
    procurement_history_total: summary.procurement_history_total,
    open_solicitations_count: summary.open_solicitations_count,
    competitor_count: summary.competitor_count,
    bookings_trend,
    awards_over_time,
    top_awarded_parts: TOP_PARTS,
    upcoming_solicitations: upcoming,
    winning_price_benchmarks: BENCHMARKS,
    competitor_leaderboard: COMPETITORS,
    set_aside_win_rate: SET_ASIDE_WIN_RATE,
    hot_parts: HOT_PARTS,
    response_window: RESPONSE_WINDOW,
    buy_signals: BUY_SIGNALS,
    generated_at,
  };

  const bidMatch: BidMatchAnalytics = {
    active_profiles_count: PROFILES.length,
    total_matches: 1284,
    latest_run_matches: TIME_TO_CLOSE.reduce((n, b) => n + b.count, 0),
    match_trend,
    condition_type_distribution: CONDITION_TYPES,
    recent_matches,
    upcoming_matches: recent_matches,
    match_strength_split,
    amendment_alerts,
    profile_health,
    time_to_close: TIME_TO_CLOSE,
    generated_at,
  };

  const market: MarketOverview = {
    dibbs_open_solicitations_count: 14676,
    dibbs_recent_awards_total: 3412000000,
    sam_dod_open_solicitations_count: 330,
    sam_recent_awards_total: 8855133009,
    sam_opportunities_trend: SAM_TREND.map((count, i) => ({
      month: monthLabel(base, SAM_TREND.length - i),
      count,
    })),
    set_aside_market: SET_ASIDE_MARKET,
    generated_at,
  };

  const marketPrioritization: MarketPrioritization = {
    cage_code: CAGE,
    market_prioritization: PROSPECTS,
    generated_at,
  };

  return { summary, business, bidMatch, market, marketPrioritization };
}
