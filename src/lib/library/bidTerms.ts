/**
 * Bid-qualification terms for a DIBBS solicitation.
 *
 * Thirteen columns that answer "can I even bid on this, and what will bidding
 * cost me": nine coded fields plus the four numeric AIDC contract terms.
 * Rendered by BidTermsPanel in the expanded row on both /bidmatching and
 * /rfq/worklist, so the field order, the display names and the
 * what-counts-as-a-flag rules live here and can't drift between the two.
 *
 * Codes arrive unresolved. The page response carries one `bid_term_definitions`
 * map (code_type -> code -> {label, description}) sourced from the
 * code_definitions table, so no DLA label is ever hardcoded in the UI — this
 * file names the FIELDS, the server names the VALUES.
 */

/** One code's server-resolved display label and tooltip text. */
export interface BidTermDefinition {
  label: string;
  description?: string | null;
}

/** code_type -> code -> definition, sent once per page of results. */
export type BidTermDefinitions = Record<string, Record<string, BidTermDefinition>>;

export interface SolicitationBidTerms {
  // Coded terms. NULL means "not stated on this solicitation", which is NOT
  // the same as "no" — never render a negative for a null.
  item_description_ind?: string | null;
  higher_level_quality?: string | null;
  buy_american?: string | null;
  fta_indicator?: string | null;
  fob_point?: string | null;
  inspection_point?: string | null;
  hubzone_preference?: string | null;
  clause_fillins?: string | null;
  // Acquisition Method Suffix Code — whether the government holds a technical
  // data package it can release. Its vocabulary lives in
  // library_code_definitions rather than code_definitions, but the server
  // hands it over under the same shape as the other eight, so nothing here
  // has to know that.
  amsc?: string | null;
  // DPAS priority rating, "<priority>-<program>" (e.g. "DO-C9", "DX-A1").
  // Two codes in one string, resolved against DPAS_PRIORITY and DPAS_PROGRAM.
  // NULL = unrated order — about two thirds of solicitations.
  rating?: string | null;
  // AIDC contract terms. Populated only where solicitation_type = 'I'
  // (~2.6% of rows); NULL everywhere else by design, not a coverage gap.
  guaranteed_minimum?: number | null;
  do_minimum?: number | null;
  contract_maximum?: number | null;
  annual_freq_buys?: number | null;
}

export type BidTermField = keyof Pick<
  SolicitationBidTerms,
  | "item_description_ind"
  | "higher_level_quality"
  | "buy_american"
  | "fta_indicator"
  | "fob_point"
  | "inspection_point"
  | "hubzone_preference"
  | "clause_fillins"
  | "amsc"
>;

interface BidTermSpec {
  field: BidTermField;
  /** code_definitions.code_type this field's value resolves against. */
  codeType: string;
  /** Column name for the panel. Says what the term IS, not what it says. */
  name: string;
  /** One line of context under the value, for buyers who don't live in BQ
   *  field numbers. Static per FIELD — the per-CODE meaning is the
   *  server-supplied description, shown on hover. */
  hint: string;
  /**
   * Codes that change the bid decision — a gate you must clear or a cost you
   * must price in. These render emphasized; everything else renders quiet.
   * Deliberately not "anything that isn't N": FOB destination and inspection
   * at destination are the ordinary case and shouldn't compete for attention.
   */
  notable: readonly string[];
}

/**
 * Render order: what disqualifies you first, then what it costs you, then the
 * competitive factors, then the paperwork. A buyer scanning the panel top-left
 * to bottom-right hits the deal-breakers before the details.
 */
export const BID_TERM_SPECS: readonly BidTermSpec[] = [
  {
    field: "item_description_ind",
    codeType: "ITEM_DESCRIPTION_IND",
    name: "Item description",
    hint: "What you must prove to supply it",
    notable: ["P", "Q", "B"],
  },
  {
    field: "amsc",
    codeType: "AMSC",
    name: "Technical data",
    hint: "Whether the government can release a data package",
    // The codes that mean you cannot simply obtain the drawing and make the
    // part: D/H/Q (no data, insufficient, inadequate) and B/C/P (source
    // control drawing, engineering source approval, proprietary). G and Z are
    // the open cases and stay quiet. Grouped the way the column's own DB
    // comment groups them, rather than by our own reading of the vocabulary.
    notable: ["B", "C", "D", "H", "P", "Q"],
  },
  {
    field: "higher_level_quality",
    codeType: "HIGHER_LEVEL_QUALITY",
    name: "Higher-level quality",
    hint: "Quality system the contract requires",
    notable: ["6", "7"],
  },
  {
    field: "buy_american",
    codeType: "BUY_AMERICAN",
    name: "Buy American",
    hint: "Domestic-content test on the end product",
    notable: ["Y"],
  },
  {
    field: "fta_indicator",
    codeType: "FTA_INDICATOR",
    name: "Free trade agreements",
    hint: "Country-of-origin eligibility",
    notable: ["Y", "A", "B"],
  },
  {
    field: "fob_point",
    codeType: "FOB_POINT",
    name: "FOB point",
    hint: "Who pays and owns freight to the ship-to",
    notable: ["O"],
  },
  {
    field: "inspection_point",
    codeType: "INSPECTION_POINT",
    name: "Inspection point",
    hint: "Where the government inspects",
    notable: ["O"],
  },
  {
    field: "hubzone_preference",
    codeType: "HUBZONE_PREFERENCE",
    name: "HUBZone preference",
    hint: "Price-evaluation preference on award",
    notable: ["Y"],
  },
  {
    field: "clause_fillins",
    codeType: "CLAUSE_FILLINS",
    name: "Clause fill-ins",
    hint: "Extra entries before the quote can go out",
    notable: ["Y"],
  },
] as const;

/** One resolved term, ready to render. */
export interface ResolvedBidTerm {
  /** Field key, also the React list key. Widened past BidTermField for the
   *  DPAS rating, which is two codes in one column rather than one, and for
   *  First Article, which DIBBS carries as a placeholder line item rather
   *  than a coded BQ field. */
  field: BidTermField | "rating" | "first_article";
  name: string;
  hint: string;
  /** The raw DLA value. Absent on a term that has no code to show. */
  code?: string;
  /** Server label, or the bare code when the vocabulary has no row for it. */
  label: string;
  /** Server description, for the hover tooltip. */
  description?: string | null;
  /** True when this value is a gate or a cost, not the ordinary case. */
  notable: boolean;
}

/**
 * Resolve every STATED coded term against the page's vocabulary, in render
 * order. Unstated terms are dropped rather than rendered as "—": a null is
 * unknown, and a row of dashes reads like missing data on a solicitation that
 * simply never carried the field.
 */
export function resolveBidTerms(
  terms: SolicitationBidTerms | null | undefined,
  definitions: BidTermDefinitions | undefined,
): ResolvedBidTerm[] {
  if (!terms) return [];
  const resolved: ResolvedBidTerm[] = [];
  for (const spec of BID_TERM_SPECS) {
    const code = terms[spec.field];
    if (!code) continue;
    const def = definitions?.[spec.codeType]?.[code];
    resolved.push({
      field: spec.field,
      name: spec.name,
      hint: spec.hint,
      code,
      label: def?.label || code,
      description: def?.description,
      notable: spec.notable.includes(code),
    });
  }
  return resolved;
}

/**
 * The DPAS priority rating as one term cell, or null when the order is
 * unrated.
 *
 * "DO-C9" is two codes: the priority (DO / DX) and the program the order
 * supports (C9 = MRO for DoD facilities). Both resolve server-side, so the
 * cell can read "DO - Critical Priority / Aircraft" instead of a code buyers
 * would have to look up — while the raw string stays visible, because that is
 * what box 4 of the PDF says.
 *
 * Only DX is flagged notable. A rated order carries a scheduling obligation
 * either way, but DO-C9 alone is ~91% of rated solicitations, so treating
 * every rating as remarkable would make the flag meaningless. DX is the one
 * that outranks everything else in the shop.
 */
export function resolveRating(
  terms: SolicitationBidTerms | null | undefined,
  definitions: BidTermDefinitions | undefined,
): ResolvedBidTerm | null {
  const raw = terms?.rating?.trim();
  if (!raw) return null;
  const [priority, program] = raw.split("-", 2);
  const priorityDef = definitions?.["DPAS_PRIORITY"]?.[priority];
  const programDef = program ? definitions?.["DPAS_PROGRAM"]?.[program] : undefined;
  return {
    field: "rating",
    name: "DPAS rating",
    // The program is this VALUE's context, so it takes the hint line that a
    // coded term fills with static per-field text.
    hint: programDef?.label || (program ? `Program ${program}` : "Priority rating on the order"),
    code: raw,
    label: priorityDef?.label || priority || raw,
    description: [priorityDef?.description, programDef?.description]
      .filter(Boolean)
      .join(" ") || null,
    notable: priority === "DX",
  };
}

// The DLA Solicitation Type Indicator deliberately does NOT appear here. It is
// SolicitationTypeBadge's, beside the solicitation number, and that component
// owns two decisions this panel would have quietly overridden: 'P' (Auto
// Evaluation) is real but not decision-relevant and renders nothing at all,
// and a code with no definition row renders nothing rather than a bare "F",
// which tells a buyer less than silence does.

/** AIDC contract terms, present only on solicitation_type = 'I' rows. */
export interface ResolvedAidcTerm {
  name: string;
  hint: string;
  value: number;
  format: "quantity" | "currency";
}

export function resolveAidcTerms(
  terms: SolicitationBidTerms | null | undefined,
): ResolvedAidcTerm[] {
  if (!terms) return [];
  const out: ResolvedAidcTerm[] = [];
  // != null, not a truthiness test: a guaranteed minimum of 0 is a stated
  // term and a meaningful one — it means the contract guarantees you nothing.
  if (terms.guaranteed_minimum != null) {
    out.push({
      name: "Guaranteed minimum",
      hint: "Over the life of the contract",
      value: terms.guaranteed_minimum,
      format: "quantity",
    });
  }
  if (terms.do_minimum != null) {
    out.push({
      name: "Delivery-order minimum",
      hint: "Per order",
      value: terms.do_minimum,
      format: "quantity",
    });
  }
  if (terms.contract_maximum != null) {
    out.push({
      name: "Contract ceiling",
      hint: "Does not exceed the simplified acquisition threshold",
      value: terms.contract_maximum,
      format: "currency",
    });
  }
  if (terms.annual_freq_buys != null) {
    out.push({
      name: "Orders per year",
      hint: "Government estimate",
      value: terms.annual_freq_buys,
      format: "quantity",
    });
  }
  return out;
}

/** True when the solicitation states anything worth drawing a panel for. */
export function hasBidTerms(
  terms: SolicitationBidTerms | null | undefined,
  definitions: BidTermDefinitions | undefined,
): boolean {
  return (
    resolveBidTerms(terms, definitions).length > 0
    || resolveRating(terms, definitions) !== null
    || resolveAidcTerms(terms).length > 0
  );
}
