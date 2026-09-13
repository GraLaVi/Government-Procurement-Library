/**
 * Static sample data for the public bid-matching demo on
 * /products/bid-matching. Nothing here is fetched and nothing here is a
 * customer's data.
 *
 * WHAT IS REAL: the government side. Solicitation numbers, NSNs, item
 * descriptions, quantities, estimated values, set-aside codes, DLA
 * solicitation-type indicators and bid terms are real, public postings
 * pulled from DIBBS and SAM.gov.
 *
 * WHAT IS AUTHORED: the customer side. Profile names, match reasons, matched
 * conditions, win history and flags describe a fictional small-business
 * supplier of fluid-system and electrical components. That layer is private
 * to a real account, and a live account's profiles make for a poor
 * demonstration anyway -- a single wildcard FSC profile matches everything
 * for the same uninformative reason.
 *
 * THREE CONSTRAINTS KEEP THE DEMO OFFLINE. The real BidMatchResultsTable is
 * reused unmodified, and three of its affordances reach for the network:
 *
 *   - `has_pdf` + `solicitation_id` renders the solicitation-PDF button,
 *     which loads /api/library/solicitations/:id/pdf.
 *   - the amendment flags render a pill that opens a timeline fetch.
 *   - `line_item_count > 1` renders BidMatchLineItems, which fetches.
 *
 * So every row here sets has_pdf false, solicitation_id null, no amendment
 * flags, and line_item_count 1. Adding a row that violates any of those puts
 * a 401 in front of a prospect. The one outbound link that remains -- the
 * NSN, which links into /library/parts -- is intercepted by DemoSurface and
 * turned into a signup prompt.
 *
 * DATES ARE OFFSETS, resolved against a base date supplied by the server at
 * render time (see resolveDemoBidMatching). Hardcoded dates would have the
 * demo advertising a stale run within weeks.
 */

import type { BidTermDefinitions, SolicitationBidTerms } from "@/lib/library/bidTerms";

/** One reason a solicitation matched: a profile and the conditions that fired. */
export interface DemoMatchedCondition {
  condition_type: string;
  match_value: string;
  match_operator?: string | null;
  is_negated?: boolean | null;
  match_label?: string | null;
}

export interface DemoMatchDetail {
  profile_id: number;
  profile_name: string;
  match_strength: "HARD" | "SOFT" | null;
  match_reason: string | null;
  matched_conditions: DemoMatchedCondition[];
}

/**
 * A row as authored, with dates still expressed as day offsets. Structurally
 * a BidMatchResult once the offsets are resolved -- the table's own interface
 * is not exported, so the compatibility is by shape, and resolveDemoBidMatching
 * is the only thing that should build the resolved form.
 */
export interface DemoRowSeed {
  result_id: number;
  run_id: string;
  source: "dibbs" | "sam";
  solicitation_id: null;
  sam_opportunity_id: null;
  profile_id: number;
  profile_name: string;
  matched_conditions: DemoMatchedCondition[];
  matches: DemoMatchDetail[];
  matched_parts: never[];
  match_reason: string | null;
  match_strength: "HARD" | "SOFT" | null;
  has_amendment_indicator: false;
  has_post_match_amendment: false;
  has_pdf: false;
  /** The run's timestamp. Rendered nowhere, but the table's row type requires
   *  it, so it is resolved from run_date_offset alongside the other dates. */
  created_at?: string;
  solicitation_number: string;
  agency_code: null;
  notice_type: string | null;
  /** Days from the base date to the run that found this row. 0 = today. */
  run_date_offset: number;
  /** Days from the base date to the day the government posted it. */
  issue_date_offset: number;
  posted_date_offset: number | null;
  close_date_offset: number;
  sam_url: string | null;
  status: string;
  dibbs_listed_open: false;
  buyer_name: null;
  set_aside: string | null;
  set_aside_code: string | null;
  set_aside_label: string | null;
  solicitation_type: string | null;
  solicitation_type_label: string | null;
  bid_terms: SolicitationBidTerms | null;
  demand_signal: string | null;
  nsn: string | null;
  niin: string | null;
  fsc: string | null;
  mfg_cage: string | null;
  mfg_part_number: string | null;
  part_description: string | null;
  quantity: number | null;
  unit_of_issue: string | null;
  line_item_count: 1;
  estimated_value: number | null;
  first_article: boolean;
  interested: boolean;
  win_count: number;
  last_won_on: string | null;
  recent_awards: Array<{
    contract_number: string;
    contract_date: string;
    quantity?: number | null;
    unit_price?: number | null;
  }>;
}

/** Exported for the RFQ demo, which quotes the same solicitations and
 *  borrows their bid terms rather than authoring a second copy. */
export const DEMO_ROW_SEEDS: DemoRowSeed[] = [
  {
    result_id: 1001,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 5,
    profile_name: "Parts we stock (NIIN watchlist)",
    matched_conditions: [
      {
        condition_type: "NIIN",
        match_value: "01-425-1217"
      }
    ],
    matches: [
      {
        profile_id: 5,
        profile_name: "Parts we stock (NIIN watchlist)",
        match_strength: "HARD",
        match_reason: "NIIN 01-425-1217",
        matched_conditions: [
          {
            condition_type: "NIIN",
            match_value: "01-425-1217"
          }
        ]
      },
      {
        profile_id: 2,
        profile_name: "Hose, fittings & seals",
        match_strength: "SOFT",
        match_reason: "FSC 4720",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "4720"
          },
          {
            condition_type: "FSC",
            match_value: "4730"
          },
          {
            condition_type: "FSC",
            match_value: "5330"
          }
        ]
      },
      {
        profile_id: 7,
        profile_name: "Small-business set-asides",
        match_strength: "SOFT",
        match_reason: "set-aside SBA",
        matched_conditions: [
          {
            condition_type: "SET_ASIDE_CODE",
            match_value: "SBA",
            match_label: "Small Business Set-Aside"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "NIIN 01-425-1217; FSC 4720; set-aside SBA",
    match_strength: "HARD",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7M4-26-T-390F",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "Y",
    set_aside_code: "SBA",
    set_aside_label: "Small Business Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "D",
      rating: "DO-C9"
    },
    demand_signal: null,
    nsn: "4720-01-425-1217",
    niin: "01-425-1217",
    fsc: "4720",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "HOSE ASSEMBLY,NONMETALLIC",
    quantity: 7,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 94695.23,
    first_article: false,
    interested: true,
    win_count: 3,
    last_won_on: "2025-09-15",
    recent_awards: [
      {
        contract_number: "SPE7M4-25-V-5631",
        contract_date: "2025-09-15",
        quantity: 3,
        unit_price: 10286.97
      },
      {
        contract_number: "SPE7M4-25-V-2195",
        contract_date: "2025-03-03",
        quantity: 3,
        unit_price: 10229.96
      },
      {
        contract_number: "SPE7M4-25-V-1185",
        contract_date: "2024-12-23",
        quantity: 4,
        unit_price: 9567.49
      }
    ]
  },
  {
    result_id: 1002,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 6,
    profile_name: "Approved source - our CAGE",
    matched_conditions: [
      {
        condition_type: "CAGE_CODE",
        match_value: "7ZY42"
      }
    ],
    matches: [
      {
        profile_id: 6,
        profile_name: "Approved source - our CAGE",
        match_strength: "HARD",
        match_reason: "CAGE 7ZY42",
        matched_conditions: [
          {
            condition_type: "CAGE_CODE",
            match_value: "7ZY42"
          }
        ]
      },
      {
        profile_id: 1,
        profile_name: "Valves & flow control",
        match_strength: "SOFT",
        match_reason: "FSC 4810",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "4810"
          },
          {
            condition_type: "FSC",
            match_value: "4820"
          },
          {
            condition_type: "FSC",
            match_value: "4330"
          }
        ]
      },
      {
        profile_id: 7,
        profile_name: "Small-business set-asides",
        match_strength: "SOFT",
        match_reason: "set-aside SBA",
        matched_conditions: [
          {
            condition_type: "SET_ASIDE_CODE",
            match_value: "SBA",
            match_label: "Small Business Set-Aside"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "CAGE 7ZY42; FSC 4810; set-aside SBA",
    match_strength: "HARD",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7MC-26-T-267F",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "Y",
    set_aside_code: "SBA",
    set_aside_label: "Small Business Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "D",
      rating: "DO-C9"
    },
    demand_signal: "on_backorder",
    nsn: "4810-01-614-4712",
    niin: "01-614-4712",
    fsc: "4810",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "VALVE,SOLENOID",
    quantity: 13,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 74354.02,
    first_article: false,
    interested: true,
    win_count: 3,
    last_won_on: "2025-11-17",
    recent_awards: [
      {
        contract_number: "SPE7MC-26-V-0653",
        contract_date: "2025-11-17",
        quantity: 12,
        unit_price: 4283.83
      },
      {
        contract_number: "SPE7MC-25-V-2740",
        contract_date: "2025-02-26",
        quantity: 1,
        unit_price: 4277.98
      },
      {
        contract_number: "SPE7MC-25-V-2637",
        contract_date: "2025-02-18",
        quantity: 4,
        unit_price: 4244.24
      }
    ]
  },
  {
    result_id: 1003,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 1,
    profile_name: "Valves & flow control",
    matched_conditions: [
      {
        condition_type: "PART_DESCRIPTION",
        match_value: "FILTER",
        match_operator: "contains"
      }
    ],
    matches: [
      {
        profile_id: 1,
        profile_name: "Valves & flow control",
        match_strength: "SOFT",
        match_reason: "keyword 'FILTER' in description",
        matched_conditions: [
          {
            condition_type: "PART_DESCRIPTION",
            match_value: "FILTER",
            match_operator: "contains"
          }
        ]
      },
      {
        profile_id: 1,
        profile_name: "Valves & flow control",
        match_strength: "SOFT",
        match_reason: "FSC 4330",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "4810"
          },
          {
            condition_type: "FSC",
            match_value: "4820"
          },
          {
            condition_type: "FSC",
            match_value: "4330"
          }
        ]
      },
      {
        profile_id: 7,
        profile_name: "Small-business set-asides",
        match_strength: "SOFT",
        match_reason: "set-aside SBA",
        matched_conditions: [
          {
            condition_type: "SET_ASIDE_CODE",
            match_value: "SBA",
            match_label: "Small Business Set-Aside"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "keyword 'FILTER' in description; FSC 4330; set-aside SBA",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7M1-26-Q-1469",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "Y",
    set_aside_code: "SBA",
    set_aside_label: "Small Business Set-Aside",
    solicitation_type: null,
    solicitation_type_label: null,
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "R",
      rating: "DO-C9"
    },
    demand_signal: "on_backorder",
    nsn: "4330-01-331-2949",
    niin: "01-331-2949",
    fsc: "4330",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "FILTER ASSEMBLY,FLUID",
    quantity: 10,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 646747.2,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1004,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 1,
    profile_name: "Valves & flow control",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "4810"
      },
      {
        condition_type: "FSC",
        match_value: "4820"
      },
      {
        condition_type: "FSC",
        match_value: "4330"
      },
      {
        condition_type: "PART_DESCRIPTION",
        match_value: "KIT",
        is_negated: true
      }
    ],
    matches: [
      {
        profile_id: 1,
        profile_name: "Valves & flow control",
        match_strength: "SOFT",
        match_reason: "FSC 4820; not a kit",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "4810"
          },
          {
            condition_type: "FSC",
            match_value: "4820"
          },
          {
            condition_type: "FSC",
            match_value: "4330"
          },
          {
            condition_type: "PART_DESCRIPTION",
            match_value: "KIT",
            is_negated: true
          }
        ]
      },
      {
        profile_id: 7,
        profile_name: "Small-business set-asides",
        match_strength: "SOFT",
        match_reason: "set-aside SBA",
        matched_conditions: [
          {
            condition_type: "SET_ASIDE_CODE",
            match_value: "SBA",
            match_label: "Small Business Set-Aside"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 4820; not a kit; set-aside SBA",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7MC-26-T-246X",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "Y",
    set_aside_code: "SBA",
    set_aside_label: "Small Business Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "8",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "O",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "C",
      rating: "DO-C9"
    },
    demand_signal: "on_backorder",
    nsn: "4820-01-317-9684",
    niin: "01-317-9684",
    fsc: "4820",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "VALVE,CHECK,OXYGEN SYSTEM",
    quantity: 1250,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 206062.5,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1005,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 1,
    profile_name: "Valves & flow control",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "4810"
      },
      {
        condition_type: "FSC",
        match_value: "4820"
      },
      {
        condition_type: "FSC",
        match_value: "4330"
      },
      {
        condition_type: "PART_DESCRIPTION",
        match_value: "KIT",
        is_negated: true
      }
    ],
    matches: [
      {
        profile_id: 1,
        profile_name: "Valves & flow control",
        match_strength: "SOFT",
        match_reason: "FSC 4820; not a kit",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "4810"
          },
          {
            condition_type: "FSC",
            match_value: "4820"
          },
          {
            condition_type: "FSC",
            match_value: "4330"
          },
          {
            condition_type: "PART_DESCRIPTION",
            match_value: "KIT",
            is_negated: true
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 4820; not a kit",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7MC-26-T-264N",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "N",
    set_aside_code: "UNA",
    set_aside_label: "Unrestricted",
    solicitation_type: "F",
    solicitation_type_label: "Fast Award",
    bid_terms: {
      item_description_ind: "D",
      higher_level_quality: "6",
      buy_american: "N",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "O",
      hubzone_preference: "Y",
      clause_fillins: "N",
      amsc: "G",
      rating: "DO-C9"
    },
    demand_signal: "below_reorder_point",
    nsn: "4820-01-538-3563",
    niin: "01-538-3563",
    fsc: "4820",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "VALVE,GLOBE",
    quantity: 2,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 11950.16,
    first_article: true,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1006,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 5,
    profile_name: "Parts we stock (NIIN watchlist)",
    matched_conditions: [
      {
        condition_type: "NIIN",
        match_value: "01-324-0233"
      }
    ],
    matches: [
      {
        profile_id: 5,
        profile_name: "Parts we stock (NIIN watchlist)",
        match_strength: "HARD",
        match_reason: "NIIN 01-324-0233",
        matched_conditions: [
          {
            condition_type: "NIIN",
            match_value: "01-324-0233"
          }
        ]
      },
      {
        profile_id: 2,
        profile_name: "Hose, fittings & seals",
        match_strength: "SOFT",
        match_reason: "FSC 4720",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "4720"
          },
          {
            condition_type: "FSC",
            match_value: "4730"
          },
          {
            condition_type: "FSC",
            match_value: "5330"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "NIIN 01-324-0233; FSC 4720",
    match_strength: "HARD",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7M4-26-T-389Z",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "N",
    set_aside_code: "UNA",
    set_aside_label: "Unrestricted",
    solicitation_type: "F",
    solicitation_type_label: "Fast Award",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "N",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "C",
      rating: "DO-C9"
    },
    demand_signal: null,
    nsn: "4720-01-324-0233",
    niin: "01-324-0233",
    fsc: "4720",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "HOSE ASSEMBLY,AIR DUCT",
    quantity: 15,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 13192.8,
    first_article: false,
    interested: false,
    win_count: 3,
    last_won_on: "2023-11-24",
    recent_awards: [
      {
        contract_number: "SPE7M4-24-V-0585",
        contract_date: "2023-11-24",
        quantity: 70,
        unit_price: 406.37
      },
      {
        contract_number: "SPE7M4-24-V-0326",
        contract_date: "2023-10-30",
        quantity: 29,
        unit_price: 406.37
      },
      {
        contract_number: "SPE7M4-22-V-4864",
        contract_date: "2022-08-31",
        quantity: 129,
        unit_price: 405.23
      }
    ]
  },
  {
    result_id: 1007,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 5,
    profile_name: "Parts we stock (NIIN watchlist)",
    matched_conditions: [
      {
        condition_type: "NIIN",
        match_value: "01-324-0927"
      }
    ],
    matches: [
      {
        profile_id: 5,
        profile_name: "Parts we stock (NIIN watchlist)",
        match_strength: "HARD",
        match_reason: "NIIN 01-324-0927",
        matched_conditions: [
          {
            condition_type: "NIIN",
            match_value: "01-324-0927"
          }
        ]
      },
      {
        profile_id: 2,
        profile_name: "Hose, fittings & seals",
        match_strength: "SOFT",
        match_reason: "FSC 5330",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "4720"
          },
          {
            condition_type: "FSC",
            match_value: "4730"
          },
          {
            condition_type: "FSC",
            match_value: "5330"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "NIIN 01-324-0927; FSC 5330",
    match_strength: "HARD",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7M4-26-T-390C",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "N",
    set_aside_code: "UNA",
    set_aside_label: "Unrestricted",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "D",
      rating: "DO-C9"
    },
    demand_signal: "recurring",
    nsn: "5330-01-324-0927",
    niin: "01-324-0927",
    fsc: "5330",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "GASKET",
    quantity: 46,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 23128.34,
    first_article: false,
    interested: false,
    win_count: 1,
    last_won_on: "1996-05-29",
    recent_awards: [
      {
        contract_number: "SP0500-96-A-A901",
        contract_date: "1996-05-29",
        quantity: 43,
        unit_price: 48.61
      }
    ]
  },
  {
    result_id: 1008,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 1,
    profile_name: "Valves & flow control",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "4810"
      },
      {
        condition_type: "FSC",
        match_value: "4820"
      },
      {
        condition_type: "FSC",
        match_value: "4330"
      }
    ],
    matches: [
      {
        profile_id: 1,
        profile_name: "Valves & flow control",
        match_strength: "SOFT",
        match_reason: "FSC 4820",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "4810"
          },
          {
            condition_type: "FSC",
            match_value: "4820"
          },
          {
            condition_type: "FSC",
            match_value: "4330"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 4820",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7MC-26-T-265W",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "L",
    set_aside_code: "WOSB",
    set_aside_label: "Women-Owned Small Business Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "C",
      rating: "DO-C9"
    },
    demand_signal: null,
    nsn: "4820-01-547-9506",
    niin: "01-547-9506",
    fsc: "4820",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "VALVE,SAFETY RELIEF",
    quantity: 50,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 24453.5,
    first_article: false,
    interested: false,
    win_count: 2,
    last_won_on: "2024-10-23",
    recent_awards: [
      {
        contract_number: "SPE7MC-25-P-0204",
        contract_date: "2024-10-23",
        quantity: 55,
        unit_price: 350.59
      },
      {
        contract_number: "SPM7MC-13-V-5748",
        contract_date: "2013-03-14",
        quantity: 61,
        unit_price: 49.2
      }
    ]
  },
  {
    result_id: 1009,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 3,
    profile_name: "Circuit protection",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "5920"
      },
      {
        condition_type: "FSC",
        match_value: "5925"
      },
      {
        condition_type: "FSC",
        match_value: "5935"
      }
    ],
    matches: [
      {
        profile_id: 3,
        profile_name: "Circuit protection",
        match_strength: "SOFT",
        match_reason: "FSC 5925",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "5920"
          },
          {
            condition_type: "FSC",
            match_value: "5925"
          },
          {
            condition_type: "FSC",
            match_value: "5935"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 5925",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7M5-26-T-487Z",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "R",
    set_aside_code: "SDVOSBC",
    set_aside_label: "SDVOSB Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "D",
      rating: "DO-C9"
    },
    demand_signal: "recurring",
    nsn: "5925-01-593-0761",
    niin: "01-593-0761",
    fsc: "5925",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "CIRCUIT BREAKER",
    quantity: 11,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 72681.07,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1010,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 3,
    profile_name: "Circuit protection",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "5920"
      },
      {
        condition_type: "FSC",
        match_value: "5925"
      },
      {
        condition_type: "FSC",
        match_value: "5935"
      }
    ],
    matches: [
      {
        profile_id: 3,
        profile_name: "Circuit protection",
        match_strength: "SOFT",
        match_reason: "FSC 5925",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "5920"
          },
          {
            condition_type: "FSC",
            match_value: "5925"
          },
          {
            condition_type: "FSC",
            match_value: "5935"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 5925",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7M2-26-T-6821",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "R",
    set_aside_code: "SDVOSBC",
    set_aside_label: "SDVOSB Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "D",
      rating: "DO-A3"
    },
    demand_signal: null,
    nsn: "5925-01-481-5874",
    niin: "01-481-5874",
    fsc: "5925",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "TRIPPER,CIRCUIT BREAKER",
    quantity: 4,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 60604.4,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1011,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 3,
    profile_name: "Circuit protection",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "5920"
      },
      {
        condition_type: "FSC",
        match_value: "5925"
      },
      {
        condition_type: "FSC",
        match_value: "5935"
      }
    ],
    matches: [
      {
        profile_id: 3,
        profile_name: "Circuit protection",
        match_strength: "SOFT",
        match_reason: "FSC 5925",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "5920"
          },
          {
            condition_type: "FSC",
            match_value: "5925"
          },
          {
            condition_type: "FSC",
            match_value: "5935"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 5925",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7M5-26-T-470Q",
    agency_code: null,
    notice_type: null,
    issue_date_offset: -4,
    posted_date_offset: null,
    close_date_offset: 6,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "E",
    set_aside_code: "EDWOSB",
    set_aside_label: "Economically Disadvantaged WOSB Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "C",
      rating: "DO-C9"
    },
    demand_signal: "recurring",
    nsn: "5925-01-318-9547",
    niin: "01-318-9547",
    fsc: "5925",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "CIRCUIT BREAKER",
    quantity: 9,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 91645.83,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1012,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 4,
    profile_name: "Fasteners & hardware",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "5305"
      },
      {
        condition_type: "FSC",
        match_value: "5310"
      },
      {
        condition_type: "FSC",
        match_value: "5340"
      },
      {
        condition_type: "FSC",
        match_value: "5365"
      }
    ],
    matches: [
      {
        profile_id: 4,
        profile_name: "Fasteners & hardware",
        match_strength: "SOFT",
        match_reason: "FSC 5340",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "5305"
          },
          {
            condition_type: "FSC",
            match_value: "5310"
          },
          {
            condition_type: "FSC",
            match_value: "5340"
          },
          {
            condition_type: "FSC",
            match_value: "5365"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 5340",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7L1-26-T-09C6",
    agency_code: null,
    notice_type: null,
    issue_date_offset: 0,
    posted_date_offset: null,
    close_date_offset: 10,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "L",
    set_aside_code: "WOSB",
    set_aside_label: "Women-Owned Small Business Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "D",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "O",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "G",
      rating: "DO-C9"
    },
    demand_signal: "below_reorder_point",
    nsn: "5340-00-202-1511",
    niin: "00-202-1511",
    fsc: "5340",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "HINGE,BUTT",
    quantity: 35,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 21721.35,
    first_article: true,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1013,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 4,
    profile_name: "Fasteners & hardware",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "5305"
      },
      {
        condition_type: "FSC",
        match_value: "5310"
      },
      {
        condition_type: "FSC",
        match_value: "5340"
      },
      {
        condition_type: "FSC",
        match_value: "5365"
      }
    ],
    matches: [
      {
        profile_id: 4,
        profile_name: "Fasteners & hardware",
        match_strength: "SOFT",
        match_reason: "FSC 5340",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "5305"
          },
          {
            condition_type: "FSC",
            match_value: "5310"
          },
          {
            condition_type: "FSC",
            match_value: "5340"
          },
          {
            condition_type: "FSC",
            match_value: "5365"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 5340",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7M4-26-T-395A",
    agency_code: null,
    notice_type: null,
    issue_date_offset: -11,
    posted_date_offset: null,
    close_date_offset: 3,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "L",
    set_aside_code: "WOSB",
    set_aside_label: "Women-Owned Small Business Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "D",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "G",
      rating: "DO-C9"
    },
    demand_signal: "recurring",
    nsn: "5340-01-119-3981",
    niin: "01-119-3981",
    fsc: "5340",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "PADLOCK",
    quantity: 7603,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 135105.31,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1014,
    run_id: "demo-run-0",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 5,
    profile_name: "Parts we stock (NIIN watchlist)",
    matched_conditions: [
      {
        condition_type: "NIIN",
        match_value: "01-420-3393"
      }
    ],
    matches: [
      {
        profile_id: 5,
        profile_name: "Parts we stock (NIIN watchlist)",
        match_strength: "HARD",
        match_reason: "NIIN 01-420-3393",
        matched_conditions: [
          {
            condition_type: "NIIN",
            match_value: "01-420-3393"
          }
        ]
      },
      {
        profile_id: 7,
        profile_name: "Small-business set-asides",
        match_strength: "SOFT",
        match_reason: "set-aside SBA",
        matched_conditions: [
          {
            condition_type: "SET_ASIDE_CODE",
            match_value: "SBA",
            match_label: "Small Business Set-Aside"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "NIIN 01-420-3393; set-aside SBA",
    match_strength: "HARD",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7M4-26-T-390E",
    agency_code: null,
    notice_type: null,
    issue_date_offset: -4,
    posted_date_offset: null,
    close_date_offset: 6,
    run_date_offset: 0,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "Y",
    set_aside_code: "SBA",
    set_aside_label: "Small Business Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "D",
      rating: "DO-C9"
    },
    demand_signal: null,
    nsn: "2040-01-420-3393",
    niin: "01-420-3393",
    fsc: "2040",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "HATCH,MARINE",
    quantity: 1,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 22607.93,
    first_article: false,
    interested: false,
    win_count: 3,
    last_won_on: "2025-10-02",
    recent_awards: [
      {
        contract_number: "SPE7M0-26-V-0046",
        contract_date: "2025-10-02",
        quantity: 1,
        unit_price: 19530.5
      },
      {
        contract_number: "SPE7MC-23-V-4131",
        contract_date: "2023-04-07",
        quantity: 1,
        unit_price: 16206.4
      },
      {
        contract_number: "SPE7MC-23-V-3134",
        contract_date: "2023-02-21",
        quantity: 1,
        unit_price: 16206.4
      }
    ]
  },
  {
    result_id: 1015,
    run_id: "demo-run-1",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 3,
    profile_name: "Circuit protection",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "5920"
      },
      {
        condition_type: "FSC",
        match_value: "5925"
      },
      {
        condition_type: "FSC",
        match_value: "5935"
      }
    ],
    matches: [
      {
        profile_id: 3,
        profile_name: "Circuit protection",
        match_strength: "SOFT",
        match_reason: "FSC 5920",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "5920"
          },
          {
            condition_type: "FSC",
            match_value: "5925"
          },
          {
            condition_type: "FSC",
            match_value: "5935"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 5920",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7M1-26-U-5945",
    agency_code: null,
    notice_type: null,
    issue_date_offset: -1,
    posted_date_offset: null,
    close_date_offset: 9,
    run_date_offset: -1,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "H",
    set_aside_code: "HZC",
    set_aside_label: "HUBZone Set-Aside",
    solicitation_type: "I",
    solicitation_type_label: "Automated IDC",
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "D",
      guaranteed_minimum: 17.0,
      do_minimum: 58.0,
      contract_maximum: 350000.0,
      annual_freq_buys: 1
    },
    demand_signal: null,
    nsn: "5920-01-583-1256",
    niin: "01-583-1256",
    fsc: "5920",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "FUSE,CARTRIDGE",
    quantity: 116,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 3592.52,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1016,
    run_id: "demo-run-1",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 5,
    profile_name: "Parts we stock (NIIN watchlist)",
    matched_conditions: [
      {
        condition_type: "PART_DESCRIPTION",
        match_value: "MASK LIGHT ASSEMBLY",
        match_operator: "contains"
      }
    ],
    matches: [
      {
        profile_id: 5,
        profile_name: "Parts we stock (NIIN watchlist)",
        match_strength: "SOFT",
        match_reason: "keyword 'MASK LIGHT ASSEMBLY' in description",
        matched_conditions: [
          {
            condition_type: "PART_DESCRIPTION",
            match_value: "MASK LIGHT ASSEMBLY",
            match_operator: "contains"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "keyword 'MASK LIGHT ASSEMBLY' in description",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE8E9-26-Q-0749",
    agency_code: null,
    notice_type: null,
    issue_date_offset: -1,
    posted_date_offset: null,
    close_date_offset: 9,
    run_date_offset: -1,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "N",
    set_aside_code: "UNA",
    set_aside_label: "Unrestricted",
    solicitation_type: null,
    solicitation_type_label: null,
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "N",
      buy_american: "N",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "D",
      rating: "DO-C9"
    },
    demand_signal: "on_backorder",
    nsn: "6220-01-620-1410",
    niin: "01-620-1410",
    fsc: "6220",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "MASK LIGHT ASSEMBLY",
    quantity: 146,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 312600.6,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1017,
    run_id: "demo-run-1",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 5,
    profile_name: "Parts we stock (NIIN watchlist)",
    matched_conditions: [
      {
        condition_type: "PART_DESCRIPTION",
        match_value: "CONTAINER",
        match_operator: "contains"
      }
    ],
    matches: [
      {
        profile_id: 5,
        profile_name: "Parts we stock (NIIN watchlist)",
        match_strength: "SOFT",
        match_reason: "keyword 'CONTAINER' in description",
        matched_conditions: [
          {
            condition_type: "PART_DESCRIPTION",
            match_value: "CONTAINER",
            match_operator: "contains"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "keyword 'CONTAINER' in description",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE4A7-26-Q-1097",
    agency_code: null,
    notice_type: null,
    issue_date_offset: -1,
    posted_date_offset: null,
    close_date_offset: 9,
    run_date_offset: -1,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "N",
    set_aside_code: "UNA",
    set_aside_label: "Unrestricted",
    solicitation_type: null,
    solicitation_type_label: null,
    bid_terms: {
      item_description_ind: "P",
      higher_level_quality: "6",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "D",
      inspection_point: "O",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "P",
      rating: "DO-C9"
    },
    demand_signal: "on_backorder",
    nsn: "1680-01-540-9068",
    niin: "01-540-9068",
    fsc: "1680",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "CONTAINER,PARACHUTE,SEAT",
    quantity: 60,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 845770.8,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1018,
    run_id: "demo-run-2",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 5,
    profile_name: "Parts we stock (NIIN watchlist)",
    matched_conditions: [
      {
        condition_type: "PART_DESCRIPTION",
        match_value: "BEADLOCK",
        match_operator: "contains"
      }
    ],
    matches: [
      {
        profile_id: 5,
        profile_name: "Parts we stock (NIIN watchlist)",
        match_strength: "SOFT",
        match_reason: "keyword 'BEADLOCK' in description",
        matched_conditions: [
          {
            condition_type: "PART_DESCRIPTION",
            match_value: "BEADLOCK",
            match_operator: "contains"
          }
        ]
      },
      {
        profile_id: 7,
        profile_name: "Small-business set-asides",
        match_strength: "SOFT",
        match_reason: "set-aside SBA",
        matched_conditions: [
          {
            condition_type: "SET_ASIDE_CODE",
            match_value: "SBA",
            match_label: "Small Business Set-Aside"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "keyword 'BEADLOCK' in description; set-aside SBA",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7LX-26-T-1052",
    agency_code: null,
    notice_type: null,
    issue_date_offset: -2,
    posted_date_offset: null,
    close_date_offset: 8,
    run_date_offset: -2,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "Y",
    set_aside_code: "SBA",
    set_aside_label: "Small Business Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "B",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "B",
      rating: "DO-C9"
    },
    demand_signal: "on_backorder",
    nsn: "2530-01-668-7616",
    niin: "01-668-7616",
    fsc: "2530",
    mfg_cage: "",
    mfg_part_number: "",
    part_description: "BEADLOCK,PNEUMATIC TIRE",
    quantity: 100,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 254833.0,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1019,
    run_id: "demo-run-2",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 5,
    profile_name: "Parts we stock (NIIN watchlist)",
    matched_conditions: [
      {
        condition_type: "PART_DESCRIPTION",
        match_value: "SHEET",
        match_operator: "contains"
      }
    ],
    matches: [
      {
        profile_id: 5,
        profile_name: "Parts we stock (NIIN watchlist)",
        match_strength: "SOFT",
        match_reason: "keyword 'SHEET' in description",
        matched_conditions: [
          {
            condition_type: "PART_DESCRIPTION",
            match_value: "SHEET",
            match_operator: "contains"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "keyword 'SHEET' in description",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE8E9-26-T-3709",
    agency_code: null,
    notice_type: null,
    issue_date_offset: -2,
    posted_date_offset: null,
    close_date_offset: 8,
    run_date_offset: -2,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "H",
    set_aside_code: "HZC",
    set_aside_label: "HUBZone Set-Aside",
    solicitation_type: "P",
    solicitation_type_label: "Auto Evaluation",
    bid_terms: {
      item_description_ind: "D",
      higher_level_quality: "N",
      buy_american: "Y",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "D",
      hubzone_preference: "N",
      clause_fillins: "N",
      amsc: "G",
      rating: "DO-C9"
    },
    demand_signal: "recurring",
    nsn: "9535-00-230-7546",
    niin: "00-230-7546",
    fsc: "9535",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "SHEET,METAL",
    quantity: 225,
    unit_of_issue: "SH",
    line_item_count: 1,
    estimated_value: 43015.5,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1020,
    run_id: "demo-run-2",
    source: "dibbs",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 4,
    profile_name: "Fasteners & hardware",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "5305"
      },
      {
        condition_type: "FSC",
        match_value: "5310"
      },
      {
        condition_type: "FSC",
        match_value: "5340"
      },
      {
        condition_type: "FSC",
        match_value: "5365"
      }
    ],
    matches: [
      {
        profile_id: 4,
        profile_name: "Fasteners & hardware",
        match_strength: "SOFT",
        match_reason: "FSC 5340",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "5305"
          },
          {
            condition_type: "FSC",
            match_value: "5310"
          },
          {
            condition_type: "FSC",
            match_value: "5340"
          },
          {
            condition_type: "FSC",
            match_value: "5365"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 5340",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "SPE7L1-26-T-06T6",
    agency_code: null,
    notice_type: null,
    issue_date_offset: -2,
    posted_date_offset: null,
    close_date_offset: 8,
    run_date_offset: -2,
    sam_url: null,
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: "N",
    set_aside_code: "UNA",
    set_aside_label: "Unrestricted",
    solicitation_type: "F",
    solicitation_type_label: "Fast Award",
    bid_terms: {
      item_description_ind: "D",
      higher_level_quality: "7",
      buy_american: "N",
      fta_indicator: "N",
      fob_point: "O",
      inspection_point: "O",
      hubzone_preference: "Y",
      clause_fillins: "N",
      amsc: "G"
    },
    demand_signal: null,
    nsn: "5340-00-517-4014",
    niin: "00-517-4014",
    fsc: "5340",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "STANDOFF,THREADED,SPACING",
    quantity: 11,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: 7311.37,
    first_article: true,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1021,
    run_id: "demo-run-0",
    source: "sam",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 5,
    profile_name: "Parts we stock (NIIN watchlist)",
    matched_conditions: [
      {
        condition_type: "PART_DESCRIPTION",
        match_value: "CONNECTING LINK",
        match_operator: "contains"
      }
    ],
    matches: [
      {
        profile_id: 5,
        profile_name: "Parts we stock (NIIN watchlist)",
        match_strength: "SOFT",
        match_reason: "keyword 'CONNECTING LINK' in description",
        matched_conditions: [
          {
            condition_type: "PART_DESCRIPTION",
            match_value: "CONNECTING LINK",
            match_operator: "contains"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "keyword 'CONNECTING LINK' in description",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "N00104-26-Q-FF14",
    agency_code: null,
    notice_type: "Solicitation",
    issue_date_offset: 0,
    posted_date_offset: 0,
    close_date_offset: 24,
    run_date_offset: 0,
    sam_url: "https://sam.gov/workspace/contract/opp/2230f96b47914b99a3dbf7fcf9c2949c/view",
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: null,
    set_aside_code: null,
    set_aside_label: null,
    solicitation_type: null,
    solicitation_type_label: null,
    bid_terms: null,
    demand_signal: null,
    nsn: "3040-01-640-8035",
    niin: "01-640-8035",
    fsc: "3040",
    mfg_cage: "",
    mfg_part_number: "",
    part_description: "CONNECTING LINK,RIGID",
    quantity: 23,
    unit_of_issue: "Each",
    line_item_count: 1,
    estimated_value: 664355.0,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1022,
    run_id: "demo-run-0",
    source: "sam",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 2,
    profile_name: "Hose, fittings & seals",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "4720"
      },
      {
        condition_type: "FSC",
        match_value: "4730"
      },
      {
        condition_type: "FSC",
        match_value: "5330"
      }
    ],
    matches: [
      {
        profile_id: 2,
        profile_name: "Hose, fittings & seals",
        match_strength: "SOFT",
        match_reason: "FSC 4730",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "4720"
          },
          {
            condition_type: "FSC",
            match_value: "4730"
          },
          {
            condition_type: "FSC",
            match_value: "5330"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 4730",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "N00104-26-Q-FF65",
    agency_code: null,
    notice_type: "Solicitation",
    issue_date_offset: 0,
    posted_date_offset: 0,
    close_date_offset: 24,
    run_date_offset: 0,
    sam_url: "https://sam.gov/workspace/contract/opp/2dbfc71dfd66486599fbe6eec1f6cc37/view",
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: null,
    set_aside_code: null,
    set_aside_label: null,
    solicitation_type: null,
    solicitation_type_label: null,
    bid_terms: null,
    demand_signal: null,
    nsn: "4730-01-310-7831",
    niin: "01-310-7831",
    fsc: "4730",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "FLANGE,PIPE",
    quantity: 6,
    unit_of_issue: "Each",
    line_item_count: 1,
    estimated_value: 36636.0,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1023,
    run_id: "demo-run-0",
    source: "sam",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 4,
    profile_name: "Fasteners & hardware",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "5305"
      },
      {
        condition_type: "FSC",
        match_value: "5310"
      },
      {
        condition_type: "FSC",
        match_value: "5340"
      },
      {
        condition_type: "FSC",
        match_value: "5365"
      }
    ],
    matches: [
      {
        profile_id: 4,
        profile_name: "Fasteners & hardware",
        match_strength: "SOFT",
        match_reason: "FSC 5340",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "5305"
          },
          {
            condition_type: "FSC",
            match_value: "5310"
          },
          {
            condition_type: "FSC",
            match_value: "5340"
          },
          {
            condition_type: "FSC",
            match_value: "5365"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 5340",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "N00104-26-Q-FF72",
    agency_code: null,
    notice_type: "Solicitation",
    issue_date_offset: 0,
    posted_date_offset: 0,
    close_date_offset: 24,
    run_date_offset: 0,
    sam_url: "https://sam.gov/workspace/contract/opp/84074d6940ca4a3f97e4fdea943079c6/view",
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: null,
    set_aside_code: null,
    set_aside_label: null,
    solicitation_type: null,
    solicitation_type_label: null,
    bid_terms: null,
    demand_signal: null,
    nsn: "5340-01-640-9858",
    niin: "01-640-9858",
    fsc: "5340",
    mfg_cage: "",
    mfg_part_number: "",
    part_description: "PLUG,PROTECTIVE,DUST AND MOISTUR",
    quantity: 76,
    unit_of_issue: "Each",
    line_item_count: 1,
    estimated_value: 13908.0,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1024,
    run_id: "demo-run-0",
    source: "sam",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 1,
    profile_name: "Valves & flow control",
    matched_conditions: [
      {
        condition_type: "FSC",
        match_value: "4810"
      },
      {
        condition_type: "FSC",
        match_value: "4820"
      },
      {
        condition_type: "FSC",
        match_value: "4330"
      }
    ],
    matches: [
      {
        profile_id: 1,
        profile_name: "Valves & flow control",
        match_strength: "SOFT",
        match_reason: "FSC 4820",
        matched_conditions: [
          {
            condition_type: "FSC",
            match_value: "4810"
          },
          {
            condition_type: "FSC",
            match_value: "4820"
          },
          {
            condition_type: "FSC",
            match_value: "4330"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "FSC 4820",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "N00104-26-Q-FF58",
    agency_code: null,
    notice_type: "Solicitation",
    issue_date_offset: 0,
    posted_date_offset: 0,
    close_date_offset: 24,
    run_date_offset: 0,
    sam_url: "https://sam.gov/workspace/contract/opp/468b182584c246cf9664aa6e73345c1a/view",
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: null,
    set_aside_code: null,
    set_aside_label: null,
    solicitation_type: null,
    solicitation_type_label: null,
    bid_terms: null,
    demand_signal: null,
    nsn: "4820-01-057-8958",
    niin: "01-057-8958",
    fsc: "4820",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "NEEDLE,VALVE",
    quantity: 13,
    unit_of_issue: "Each",
    line_item_count: 1,
    estimated_value: 5577.0,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  },
  {
    result_id: 1025,
    run_id: "demo-run-0",
    source: "sam",
    solicitation_id: null,
    sam_opportunity_id: null,
    profile_id: 5,
    profile_name: "Parts we stock (NIIN watchlist)",
    matched_conditions: [
      {
        condition_type: "PART_DESCRIPTION",
        match_value: "TRACK SHOE",
        match_operator: "contains"
      }
    ],
    matches: [
      {
        profile_id: 5,
        profile_name: "Parts we stock (NIIN watchlist)",
        match_strength: "SOFT",
        match_reason: "keyword 'TRACK SHOE' in description",
        matched_conditions: [
          {
            condition_type: "PART_DESCRIPTION",
            match_value: "TRACK SHOE",
            match_operator: "contains"
          }
        ]
      }
    ],
    matched_parts: [],
    match_reason: "keyword 'TRACK SHOE' in description",
    match_strength: "SOFT",
    has_amendment_indicator: false,
    has_post_match_amendment: false,
    has_pdf: false,
    solicitation_number: "W912CH-25-R-0085",
    agency_code: null,
    notice_type: "Solicitation",
    issue_date_offset: 0,
    posted_date_offset: 0,
    close_date_offset: 24,
    run_date_offset: 0,
    sam_url: "https://sam.gov/workspace/contract/opp/e98b9adc55d247eb8f10a30f3e2c2fff/view",
    status: "open",
    dibbs_listed_open: false,
    buyer_name: null,
    set_aside: null,
    set_aside_code: null,
    set_aside_label: null,
    solicitation_type: null,
    solicitation_type_label: null,
    bid_terms: null,
    demand_signal: null,
    nsn: "2530-01-587-6141",
    niin: "01-587-6141",
    fsc: "2530",
    mfg_cage: null,
    mfg_part_number: null,
    part_description: "TRACK SHOE,VEHICULAR",
    quantity: null,
    unit_of_issue: "EA",
    line_item_count: 1,
    estimated_value: null,
    first_article: false,
    interested: false,
    win_count: 0,
    last_won_on: null,
    recent_awards: []
  }
];

/**
 * Vocabulary for the codes carried in each row's bid_terms, taken verbatim
 * from the API's page-level bid_term_definitions so the expanded row reads
 * exactly as it does in the app.
 */
export const DEMO_BID_TERM_DEFINITIONS: BidTermDefinitions = {
  ITEM_DESCRIPTION_IND: {
    N: {
      label: "Non-NSN item",
      description: "The item is described without a National Stock Number."
    },
    S: {
      label: "Service item",
      description: "The requirement is for a service rather than a supply item."
    },
    D: {
      label: "Specification or drawing",
      description: "The item is described by a specification, standard, or drawing. Anyone who can build to the drawing package may offer."
    },
    B: {
      label: "Source-controlled item",
      description: "The item is source-controlled: only parts from the drawing's listed sources are acceptable."
    },
    Q: {
      label: "QPL item",
      description: "The item is on a Qualified Products List. Only products already qualified and listed may be offered."
    },
    P: {
      label: "Approved source required",
      description: "Only an approved source may supply this item. Offers of anything else require an approved source-approval request first."
    }
  },
  AMSC: {
    G: {
      label: "Complete data available",
      description: "The government holds complete data rights, the package is complete, and no restrictions apply (implies full and open competition)."
    },
    Z: {
      label: "Commercial / off the shelf",
      description: "Commercial, non-developmental, or COTS (commercial off-the-shelf) item relying on catalog descriptions."
    },
    L: {
      label: "Below screening threshold",
      description: "Annual buy falls below the standard screening threshold."
    },
    O: {
      label: "Never screened",
      description: "The part has never completed screening since entering the inventory."
    },
    U: {
      label: "Uneconomical to compete",
      description: "Cost to break out into a competitive market is higher than the projected lifetime savings."
    },
    Y: {
      label: "Unstable design",
      description: "Design is unstable or subject to major upcoming engineering changes."
    },
    K: {
      label: "Class 1 castings or forgings",
      description: "Requires class 1 castings or similar specialized forgings per strict quality controls."
    },
    M: {
      label: "Master tooling required",
      description: "Master or coordinated tooling is required from a specific shop."
    },
    N: {
      label: "Special test facility required",
      description: "Special test or inspection facilities are required to ensure ultra-precision quality."
    },
    V: {
      label: "High-reliability part",
      description: "High-reliability part tied to a formal reliability program where failure risk is unacceptable."
    },
    T: {
      label: "QPL controlled",
      description: "Controlled by a formal Qualified Products List (QPL) process."
    },
    S: {
      label: "Militarily sensitive",
      description: "Militarily sensitive unclassified technology; restricted to government-approved sources."
    },
    A: {
      label: "Data rights questionable",
      description: "Government data rights to use the technical data are questionable or unclear."
    },
    H: {
      label: "Data insufficient",
      description: "The government physically lacks sufficient or legible data; used as an interim code while data is reviewed."
    },
    D: {
      label: "No adequate specification",
      description: "Adequate specifications or descriptions are not physically available or economical for competitive solicitation."
    },
    Q: {
      label: "Inadequate data, breakout expected",
      description: "Inadequate data or rights, stuck in full screening for 12+ months, but breakout to competition remains expected."
    },
    B: {
      label: "Source control drawing",
      description: "Must be acquired from sources specified on a source control or selected item drawing; data is not economical to draft for others."
    },
    C: {
      label: "Engineering source approval required",
      description: "Requires engineering source approval from the design activity to maintain quality."
    },
    P: {
      label: "Data proprietary",
      description: "Government lacks data rights needed to add sources, and reverse engineering is not economical."
    },
    R: {
      label: "No rights, uneconomical to acquire",
      description: "No rights to add sources, and buying data or reverse engineering is uneconomical."
    }
  },
  HIGHER_LEVEL_QUALITY: {
    N: {
      label: "None",
      description: "No higher-level quality requirement beyond the standard inspection clause."
    },
    6: {
      label: "SAE AS9003",
      description: "Requires SAE AS9003, or a tailored ISO 9001 quality system, as the higher-level quality standard."
    },
    7: {
      label: "ISO 9001:2015",
      description: "Requires a quality system conforming to ISO 9001:2015."
    }
  },
  BUY_AMERICAN: {
    N: {
      label: "Not applicable",
      description: "The Buy American Act does not apply to this solicitation."
    },
    I: {
      label: "Informational only",
      description: "Buy American is informational only here because the shipment goes overseas."
    },
    Y: {
      label: "Applicable",
      description: "The Buy American Act applies. The end product must meet the domestic-content test or qualify for an exception."
    }
  },
  FTA_INDICATOR: {
    N: {
      label: "Not applicable",
      description: "No Free Trade Agreement clause applies to this solicitation."
    },
    I: {
      label: "Informational only",
      description: "The Free Trade Agreement clause is informational only here because the shipment goes overseas."
    },
    Y: {
      label: "FTA applies",
      description: "A Free Trade Agreement clause applies. The end product must originate in the United States or a designated country."
    },
    A: {
      label: "Buy American",
      description: "The Buy American clause applies in place of a Free Trade Agreement clause."
    },
    B: {
      label: "FTA ALT IV",
      description: "Free Trade Agreement clause, Alternate IV. Country-of-origin eligibility is restricted further than the base FTA clause."
    }
  },
  FOB_POINT: {
    D: {
      label: "Destination",
      description: "Free On Board destination. The government takes ownership at the ship-to address; the contractor pays and arranges freight to get it there."
    },
    O: {
      label: "Origin",
      description: "Free On Board origin. The government takes ownership at the contractor's facility and arranges onward freight from there."
    }
  },
  INSPECTION_POINT: {
    D: {
      label: "Destination",
      description: "The government inspects on receipt at the destination."
    },
    O: {
      label: "Origin",
      description: "The government inspects at the source before shipment. Plan for a government inspector at your facility and the schedule that adds."
    }
  },
  HUBZONE_PREFERENCE: {
    N: {
      label: "Does not apply",
      description: "No HUBZone price-evaluation preference on this solicitation."
    },
    Y: {
      label: "Applies",
      description: "The HUBZone price-evaluation preference applies. Offers from non-HUBZone large businesses are evaluated with a price penalty added."
    }
  },
  CLAUSE_FILLINS: {
    N: {
      label: "Not required",
      description: "The quote needs no additional clause fill-ins."
    },
    Y: {
      label: "Required",
      description: "The quote requires additional clause fill-ins before it can be submitted."
    }
  },
  DPAS_PRIORITY: {
    DX: {
      label: "DX - Highest Priority",
      description: "Highest national priority. Designated by the Secretary of Defense; takes precedence over all other rated and unrated orders."
    },
    DO: {
      label: "DO - Critical Priority",
      description: "Critical to national defense and emergency preparedness. Takes precedence over all unrated orders, but ranks below DX."
    }
  },
  DPAS_PROGRAM: {
    A1: {
      label: "Aircraft",
      description: "Defense aircraft programs (Department of Defense)."
    },
    A2: {
      label: "Missiles and Space",
      description: "Defense missile and space programs (Department of Defense)."
    },
    A3: {
      label: "Ships",
      description: "Defense ship programs (Department of Defense)."
    },
    A4: {
      label: "Tank-Automotive",
      description: "Defense tank and automotive programs (Department of Defense)."
    },
    A5: {
      label: "Weapons",
      description: "Defense weapons programs (Department of Defense)."
    },
    A6: {
      label: "Ammunition",
      description: "Defense ammunition programs (Department of Defense)."
    },
    A7: {
      label: "Electronic and Communications Equipment",
      description: "Defense electronic and communications equipment (Department of Defense)."
    },
    B1: {
      label: "Military Building Supplies",
      description: "Department of Defense."
    },
    B8: {
      label: "Production Equipment (Contractor Account)",
      description: "Production equipment for a defense contractor account (Department of Defense)."
    },
    B9: {
      label: "Production Equipment (Government-Owned)",
      description: "Government-owned production equipment (Department of Defense)."
    },
    C2: {
      label: "Department of Defense Construction",
      description: "Department of Defense."
    },
    C3: {
      label: "MRO for DoD Facilities",
      description: "Maintenance, repair, and operating supplies for Department of Defense facilities."
    },
    C9: {
      label: "Miscellaneous",
      description: "Miscellaneous defense programs (Department of Defense)."
    },
    D1: {
      label: "Canadian Military Programs",
      description: "Military assistance to Canada (Department of Commerce)."
    },
    D2: {
      label: "Canadian Production and Construction",
      description: "Military assistance to Canada (Department of Commerce)."
    },
    D3: {
      label: "Canadian Atomic Energy Program",
      description: "Military assistance to Canada (Department of Commerce)."
    },
    E1: {
      label: "Construction",
      description: "Atomic energy construction (Department of Energy)."
    },
    E2: {
      label: "Operations and MRO",
      description: "Atomic energy operations, including maintenance, repair, and operating supplies (Department of Energy)."
    },
    E3: {
      label: "Privately Owned Facilities",
      description: "Atomic energy privately owned facilities (Department of Energy)."
    },
    F1: {
      label: "Exploration, Production, Refining, Transportation",
      description: "Domestic energy supply (Department of Energy)."
    },
    F2: {
      label: "Conservation",
      description: "Domestic energy conservation (Department of Energy)."
    },
    F3: {
      label: "Construction, Repair, and Maintenance",
      description: "Domestic energy facilities (Department of Energy)."
    },
    G1: {
      label: "Foreign Munitions Purchases",
      description: "Certain munitions items purchased by foreign governments (Department of Commerce)."
    },
    G2: {
      label: "Foreign Direct Defense Needs",
      description: "Certain direct defense needs of foreign governments other than Canada (Department of Commerce)."
    },
    G3: {
      label: "Foreign Production and Construction",
      description: "Foreign nations other than Canada (Department of Commerce)."
    },
    G4: {
      label: "Foreign Critical Infrastructure",
      description: "Foreign critical infrastructure programs (Department of Commerce)."
    },
    H1: {
      label: "Certain Combined Orders",
      description: "Used when an order supports several programs with different identification symbols (Department of Commerce)."
    },
    H5: {
      label: "Private Domestic Production",
      description: "Department of Commerce."
    },
    H6: {
      label: "Private Domestic Construction",
      description: "Department of Commerce."
    },
    H7: {
      label: "MRO",
      description: "Maintenance, repair, and operating supplies (Department of Commerce)."
    },
    H8: {
      label: "Designated Programs",
      description: "Department of Commerce."
    },
    J1: {
      label: "Co-Production Program",
      description: "Departments of Commerce and Defense."
    },
    K1: {
      label: "Federal Supply Items",
      description: "GSA-managed federal supply items (General Services Administration)."
    },
    N1: {
      label: "Federal Emergency Preparedness",
      description: "Federal emergency preparedness, mitigation, response, and recovery (Department of Homeland Security)."
    },
    N2: {
      label: "SLTT Emergency Preparedness",
      description: "State, local, Tribal, and territorial government emergency preparedness (Department of Homeland Security)."
    },
    N3: {
      label: "Intelligence and Warning Systems",
      description: "Department of Homeland Security."
    },
    N4: {
      label: "Border and Transportation Security",
      description: "Department of Homeland Security."
    },
    N5: {
      label: "Domestic Counter-Terrorism",
      description: "Domestic counter-terrorism, including law enforcement (Department of Homeland Security)."
    },
    N6: {
      label: "CBRN Countermeasures",
      description: "Chemical, biological, radiological, and nuclear countermeasures (Department of Homeland Security)."
    },
    N7: {
      label: "Critical Infrastructure Protection",
      description: "Critical infrastructure protection and restoration (Department of Homeland Security)."
    },
    N8: {
      label: "Continuity of Government",
      description: "Department of Homeland Security."
    }
  }
};


/** A date `offset` days from `base`, as the bare YYYY-MM-DD the table expects. */
function shiftDate(base: Date, offset: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

/** A row with its offsets resolved -- the shape BidMatchResultsTable renders. */
export type DemoRow = Omit<
  DemoRowSeed,
  "run_date_offset" | "issue_date_offset" | "posted_date_offset" | "close_date_offset"
> & {
  run_date: string;
  issue_date: string;
  posted_date: string | null;
  close_date: string;
  created_at: string;
  last_status_check_at: string;
};

export interface DemoIssueDateEntry {
  issue_date: string;
  match_count: number;
}

export interface DemoRunDateGroup {
  run_date: string;
  total_count: number;
  issue_dates: DemoIssueDateEntry[];
  sam_bucket?: { match_count: number } | null;
}

export interface DemoBidMatchingData {
  rows: DemoRow[];
  /** Run-date tree for BidMatchDateMenu. Counts are derived from `rows`, so
   *  the menu can never promise a bucket the demo cannot fill. */
  dateTree: DemoRunDateGroup[];
  /** The run the demo opens on: the most recent one. */
  initialRunDate: string;
}

/**
 * Resolve the seeds against a base date.
 *
 * Call this on the server and pass the result down, rather than letting the
 * client compute it: `new Date()` on both sides of a hydration boundary is
 * how a demo ends up rendering different dates on the server and the client.
 */
export function resolveDemoBidMatching(baseISO: string): DemoBidMatchingData {
  const base = new Date(baseISO.split("T")[0] + "T00:00:00");

  const rows: DemoRow[] = DEMO_ROW_SEEDS.map((seed) => {
    const {
      run_date_offset, issue_date_offset, posted_date_offset, close_date_offset,
      ...rest
    } = seed;
    return {
      ...rest,
      run_date: shiftDate(base, run_date_offset),
      issue_date: shiftDate(base, issue_date_offset),
      posted_date: posted_date_offset === null ? null : shiftDate(base, posted_date_offset),
      close_date: shiftDate(base, close_date_offset),
      created_at: shiftDate(base, run_date_offset) + "T12:00:00Z",
      // Stamped as of the run, so the status column reads as freshly checked
      // rather than raising PendingOutcomeFlag's stale-check warning.
      last_status_check_at: shiftDate(base, run_date_offset) + "T12:00:00Z",
    };
  });

  // Build the tree from the rows themselves: a run date groups its DIBBS
  // posted dates, and carries a SAM bucket only when SAM rows exist for it.
  const byRun = new Map<string, DemoRow[]>();
  for (const row of rows) {
    const list = byRun.get(row.run_date) ?? [];
    list.push(row);
    byRun.set(row.run_date, list);
  }

  const dateTree: DemoRunDateGroup[] = [...byRun.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([runDate, runRows]) => {
      const dibbs = runRows.filter((r) => r.source === "dibbs");
      const sam = runRows.filter((r) => r.source === "sam");
      const counts = new Map<string, number>();
      for (const r of dibbs) counts.set(r.issue_date, (counts.get(r.issue_date) ?? 0) + 1);
      return {
        run_date: runDate,
        // total_count carries the SAM bucket too -- the menu subtracts it for
        // the DIBBS half, so it must be the whole run.
        total_count: runRows.length,
        issue_dates: [...counts.entries()]
          .sort(([a], [b]) => (a < b ? 1 : -1))
          .map(([issue_date, match_count]) => ({ issue_date, match_count })),
        sam_bucket: sam.length ? { match_count: sam.length } : null,
      };
    });

  return { rows, dateTree, initialRunDate: dateTree[0].run_date };
}
