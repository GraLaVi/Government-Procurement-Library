/**
 * Static sample data for the public Parts & Vendor Library demo on
 * /products/library. Nothing here is fetched and nothing here is a
 * customer's data.
 *
 * WHAT IS REAL: almost everything, because the library IS public government
 * data. The part record (4820-01-317-9684, VALVE,CHECK,OXYGEN SYSTEM), its
 * manufacturers, its award history and its technical characteristics, and
 * the vendor record (KAMPI COMPONENTS CO INC, CAGE 7Z016) with its recent
 * awards, were pulled from the dev database through the same backend
 * service functions the API uses, on 2026-09-11. The search-result rows are
 * the parts the bid-matching demo matches.
 *
 * WHAT IS AUTHORED: the supplier-stock availability badges (the "In stock" /
 * "My stock" pills on search results), which belong to the same fictional
 * supplier as the other demos, and the code-definition text, which is the
 * real DLA definition for the four codes this part carries.
 *
 * THE VENDOR'S SAM POINTS OF CONTACT ARE REAL. They are public SAM
 * registration data and the app's Contacts tab shows them to every plan;
 * the demo renders the same tab. If that is ever unwanted on a marketing
 * page, set VENDOR_CONTACTS to [] and the tab explains itself.
 *
 * WHAT KEEPS THE DEMO OFFLINE. The results lists and the detail panels are
 * props-driven. Two things in them reach for the network on click — award
 * PDF buttons and (on the vendor side) the awards' PDF glyphs — and those
 * are gated by selector in the demo. has_pdf is false on every row here so
 * most of them never render at all.
 */

import type {
  EndUseDescription,
  PartDetail,
  PartManufacturer,
  PartPackaging,
  PartProcurementRecord,
  PartSearchResult,
  PartSolicitation,
  PartTechnicalCharacteristic,
  ProcurementItemDescription,
  VendorAward,
  VendorBookingMonth,
  VendorBookingTotals,
  VendorContact,
  VendorDetail,
  VendorSearchResult,
  VendorSolicitation,
} from "@/lib/library/types";
import type { PartAvailability, PartInventory } from "@/lib/inventory/types";
import { resolveDemoInventory } from "@/lib/demo/inventory";
import { DEMO_ROW_SEEDS } from "@/lib/demo/bidMatching";

export interface DemoLibraryData {
  /** Parts search results for a description search. */
  parts: PartSearchResult[];
  availability: Record<number, PartAvailability>;
  part: {
    detail: PartDetail;
    manufacturers: PartManufacturer[];
    procurement: PartProcurementRecord[];
    procurementTotal: number;
    technical: PartTechnicalCharacteristic[];
    codeDefinitions: Record<string, string>;
    codeTypeNames: Record<string, string>;
    solicitations: PartSolicitation[];
    solicitationsTotal: number;
    endUse: EndUseDescription[];
    endUseTotal: number;
    packaging: PartPackaging;
    packagingCodeDefinitions: Record<string, string>;
    packagingMarkingDefinitions: Record<string, string>;
    packagingSupplemental: { text: string; title: string; source: string } | null;
    procurementItemDescription: ProcurementItemDescription;
    /** The Supplier Stock tab, shared with the supplier-stock demo. */
    inventory: PartInventory;
  };
  vendors: VendorSearchResult[];
  vendor: {
    detail: VendorDetail;
    awards: VendorAward[];
    awardsTotal: number;
    bookings: { months: VendorBookingMonth[]; totals: VendorBookingTotals };
    solicitations: VendorSolicitation[];
    solicitationsTotal: number;
  };
}

/** The part the demo opens. Same part the bid-matching, RFQ and analytics
 *  demos keep coming back to, so a visitor who reads all four pages sees one
 *  story. */
export const DEMO_LIBRARY_PART_NSN = "4820-01-317-9684";
export const DEMO_LIBRARY_VENDOR_CAGE = "7Z016";

const PART_DETAIL: PartDetail = {
  "id": 19549820,
  "nsn": "4820-01-317-9684",
  "niin": "01-317-9684",
  "fsc": "4820",
  "fsc_description": "Valves, Nonpowered",
  "mfg_cage": null,
  "mfg_part_number": null,
  "description": "VALVE,CHECK,OXYGEN SYSTEM",
  "unit_of_issue": "EA",
  "unit_price": 118.17,
  "gac": 164.85,
  "psclas": null,
  "amcode": "3C",
  "picode": "C",
  "pmi": null,
  "cc": null,
  "adp": null,
  "esdc": null,
  "hmic": null,
  "dmil": null,
  "sa": null,
  "sos": null,
  "aac": null,
  "qup": null,
  "slc": "0",
  "ciic": null,
  "rc": null,
  "nscode": null,
  "nsdate": null,
  "nadate": null,
  "idsind": "P",
  "status_code": null,
  "pmi_code": null,
  "hazmat_code": null,
  "demil_code": null,
  "ciic_code": null,
  "criticality_code": null,
  "adp_code": null,
  "product_class": null,
  "service_agency": null,
  "source_of_supply": null,
  "acquisition_advice_code": null,
  "quantity_unit_pack": null,
  "shelf_life_code": "0",
  "repairability_code": null,
  "acquisition_method_code": "3C",
  "pi_code": "C",
  "ids_indicator": "P",
  "niin_assignment_date": null,
  "niin_status_date": null,
  "created_at": null,
  "updated_at": null
};

const MANUFACTURERS: PartManufacturer[] = [
  {
    "cage_code": "60240",
    "vendor_name": "GENTEX CORP",
    "part_number": "G001-1010-03",
    "rncc": "5",
    "rnvc": "9",
    "is_approved_source": true,
    "sam_status": "A",
    "registration_expiration_date": "2027-04-03",
    "is_active": true,
    "is_excluded": false
  },
  {
    "cage_code": "60240",
    "vendor_name": "GENTEX CORP",
    "part_number": "G001-1010-05",
    "rncc": "5",
    "rnvc": "9",
    "is_approved_source": true,
    "sam_status": "A",
    "registration_expiration_date": "2027-04-03",
    "is_active": true,
    "is_excluded": false
  },
  {
    "cage_code": "60240",
    "vendor_name": "GENTEX CORP",
    "part_number": "G001-1010-06",
    "rncc": "3",
    "rnvc": "2",
    "is_approved_source": true,
    "sam_status": "A",
    "registration_expiration_date": "2027-04-03",
    "is_active": true,
    "is_excluded": false
  },
  {
    "cage_code": "60240",
    "vendor_name": "GENTEX CORP",
    "part_number": "G033-1006",
    "rncc": "5",
    "rnvc": "9",
    "is_approved_source": true,
    "sam_status": "A",
    "registration_expiration_date": "2027-04-03",
    "is_active": true,
    "is_excluded": false
  },
  {
    "cage_code": "60240",
    "vendor_name": "GENTEX CORP",
    "part_number": "G033-1006-01",
    "rncc": "5",
    "rnvc": "9",
    "is_approved_source": true,
    "sam_status": "A",
    "registration_expiration_date": "2027-04-03",
    "is_active": true,
    "is_excluded": false
  },
  {
    "cage_code": "9009H",
    "vendor_name": "JEDNOLITY INDEKS MATERIALOWY -",
    "part_number": "4820PL0815221",
    "rncc": "6",
    "rnvc": "9",
    "is_approved_source": true,
    "sam_status": null,
    "registration_expiration_date": null,
    "is_active": false,
    "is_excluded": false
  },
  {
    "cage_code": "9009H",
    "vendor_name": "JEDNOLITY INDEKS MATERIALOWY -",
    "part_number": "4820PL2018770",
    "rncc": "6",
    "rnvc": "9",
    "is_approved_source": true,
    "sam_status": null,
    "registration_expiration_date": null,
    "is_active": false,
    "is_excluded": false
  },
  {
    "cage_code": "A196N",
    "vendor_name": "FORSVARETS MATERIELVERK",
    "part_number": "F8271-000001",
    "rncc": "6",
    "rnvc": "9",
    "is_approved_source": true,
    "sam_status": null,
    "registration_expiration_date": null,
    "is_active": false,
    "is_excluded": false
  },
  {
    "cage_code": "A486G",
    "vendor_name": "NIMIKKEISTOKESKUS NCB FINLAND",
    "part_number": "10346955",
    "rncc": "6",
    "rnvc": "9",
    "is_approved_source": true,
    "sam_status": null,
    "registration_expiration_date": null,
    "is_active": false,
    "is_excluded": false
  }
];

const PROCUREMENT: PartProcurementRecord[] = [
  {
    "id": 20983733,
    "contract_number": "SPE7MC-26-P-1656",
    "contract_date": "2026-03-02",
    "cage_code": "60240",
    "vendor_name": "GENTEX CORP",
    "quantity": 3961,
    "unit_price": 160.93,
    "total_value": 637443.73,
    "delivery_code": null,
    "source_code": "CH",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "id": 13939575,
    "contract_number": "SPE7MX-20-D-0061",
    "contract_date": "2025-01-10",
    "cage_code": "60240",
    "vendor_name": "GENTEX CORP",
    "quantity": 878,
    "unit_price": 118.17,
    "total_value": 103753.26,
    "delivery_code": null,
    "source_code": "eProc",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "id": 13939576,
    "contract_number": "SPE7MX-20-D-0061",
    "contract_date": "2024-12-05",
    "cage_code": "60240",
    "vendor_name": "GENTEX CORP",
    "quantity": 860,
    "unit_price": 118.17,
    "total_value": 101626.2,
    "delivery_code": null,
    "source_code": "eProc",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "id": 13939574,
    "contract_number": "SPE7MX-20-D-0061",
    "contract_date": "2024-11-14",
    "cage_code": "60240",
    "vendor_name": "GENTEX CORP",
    "quantity": 747,
    "unit_price": 118.17,
    "total_value": 88272.99,
    "delivery_code": null,
    "source_code": "BSM",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "id": 12651091,
    "contract_number": "F33615-89-C-0670",
    "contract_date": "1990-02-20",
    "cage_code": "81205",
    "vendor_name": "THE BOEING COMPANY",
    "quantity": 852,
    "unit_price": 262.69,
    "total_value": 223811.88,
    "delivery_code": null,
    "source_code": "AirFor",
    "has_pdf": false,
    "order_detail_id": null
  }
];

const TECHNICAL: PartTechnicalCharacteristic[] = [
  {
    "name": "MATERIAL",
    "value": "FLOW CONTROL DEVICE  ALUMINUM ALLOY 2024",
    "unit": null
  },
  {
    "name": "MATERIAL",
    "value": "SEAT  ALUMINUM ALLOY 2024",
    "unit": null
  },
  {
    "name": "MATERIAL",
    "value": "BODY  PLASTIC ACETAL",
    "unit": null
  }
];

/** Keyed the way PartDetail builds them from /api/library/code-definitions:
 *  `TYPE:code`, with the two-character AMC split into its AQM and AMS halves. */
const CODE_DEFINITIONS: Record<string, string> = {
  "IDS:P": "Approved Source Item. This Part must be supplied from a DLA approved CAGE and manufacturer.",
  "AQM:3": "Acquire 2nd/subsequent time from the actual manufacturer",
  "AMS:C": "Requires engineering source approval",
  "PIC:C": "Critical Item-Always at Origin",
  "SLC:0": "Nondeteriorative",
};

const CODE_TYPE_NAMES: Record<string, string> = {
  IDS: "DLA Buy Type Indicator",
  AMC: "Acquisition Method Code",
  PIC: "Place of Inspection Code",
  SLC: "Shelf Life Code",
};

const VENDOR_DETAIL: VendorDetail = {
  "cage_code": "7Z016",
  "uei": "XX2WFHJEFB45",
  "duns": null,
  "dodaac": null,
  "legal_business_name": "KAMPI COMPONENTS CO INC",
  "dba_name": null,
  "entity_structure": "2L",
  "entity_description": "Under 500 employee Corp",
  "entity_url": "http://www.kampi.com",
  "sam_status": "Active",
  "exclusion_status": false,
  "registration_expiration_date": "2027-01-19",
  "state_of_incorporation": "PA",
  "country_of_incorporation": "USA",
  "small_business": true,
  "fiscal_year_end": "1231",
  "addresses": [
    {
      "address_type": "physical",
      "address_line_1": "88 CANAL RD",
      "address_line_2": null,
      "city": "FAIRLESS HILLS",
      "state": "PA",
      "postal_code": "19030",
      "postal_code_ext": "4302",
      "country_code": "USA",
      "congressional_district": "01"
    },
    {
      "address_type": "mailing",
      "address_line_1": "88 CANAL RD",
      "address_line_2": null,
      "city": "FAIRLESS HILLS",
      "state": "PA",
      "postal_code": "19030",
      "postal_code_ext": "4302",
      "country_code": "USA",
      "congressional_district": null
    }
  ],
  "contacts": [],
  "certifications": [
    {
      "kind": "certification",
      "label": "AS9100D",
      "code": null,
      "value": null,
      "issued_date": null,
      "expires_date": null
    },
    {
      "kind": "certification",
      "label": "ISO 9001",
      "code": null,
      "value": null,
      "issued_date": null,
      "expires_date": null
    },
    {
      "kind": "certification",
      "label": "CMMC Level 2 Certiﬁed",
      "code": null,
      "value": null,
      "issued_date": null,
      "expires_date": null
    },
    {
      "kind": "certification",
      "label": "ITAR Compliant",
      "code": null,
      "value": null,
      "issued_date": null,
      "expires_date": null
    }
  ],
  "data_source": null,
  "created_at": null,
  "updated_at": null,
  "last_sam_sync": null
};

const VENDOR_AWARDS: VendorAward[] = [
  {
    "contract_number": "SPE7L1-26-P-9D39",
    "award_date": "2026-09-11",
    "award_quantity": 1,
    "unit_price": 1882.92,
    "total_value": 1882.92,
    "niin": "01-582-6333",
    "fsc": "5340",
    "description": "CRANK,HAND",
    "agency_code": "DIBBS2",
    "pr_number": "7017802882",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE7M0-26-P-4632",
    "award_date": "2026-09-11",
    "award_quantity": 10,
    "unit_price": 209.56,
    "total_value": 2095.6,
    "niin": "01-515-8209",
    "fsc": "5999",
    "description": "SHIELDING GASKET,ELECTRONIC",
    "agency_code": "DIBBS2",
    "pr_number": "7017858818",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE7M1-26-P-A328",
    "award_date": "2026-09-11",
    "award_quantity": 1,
    "unit_price": 223.11,
    "total_value": 223.11,
    "niin": "01-671-8119",
    "fsc": "5920",
    "description": "FUSEHOLDER,BLOCK",
    "agency_code": "DIBBS2",
    "pr_number": "7017785870",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE7M5-26-D-60DZ",
    "award_date": "2026-09-11",
    "award_quantity": 209,
    "unit_price": 148.12,
    "total_value": 30957.08,
    "niin": "01-480-0484",
    "fsc": "5945",
    "description": "SOLENOID,ELECTRICAL",
    "agency_code": "DIBBS2",
    "pr_number": "7018306473",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE4A6-26-P-0F49",
    "award_date": "2026-09-10",
    "award_quantity": 4,
    "unit_price": 1037.74,
    "total_value": 4150.96,
    "niin": "01-258-1282",
    "fsc": "1680",
    "description": "BOX ASSY STORES JET",
    "agency_code": "DIBBS2",
    "pr_number": "7017486581",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE7M0-26-P-4610",
    "award_date": "2026-09-10",
    "award_quantity": 1,
    "unit_price": 278.7,
    "total_value": 278.7,
    "niin": "01-633-0262",
    "fsc": "5930",
    "description": "SWITCH,PUSH",
    "agency_code": "DIBBS2",
    "pr_number": "7017990093",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE4A5-26-P-8065",
    "award_date": "2026-09-10",
    "award_quantity": 7,
    "unit_price": 318.85,
    "total_value": 2231.95,
    "niin": "01-581-2003",
    "fsc": "9330",
    "description": "PLASTIC SHEET,ADHESIVE COATED",
    "agency_code": "DIBBS2",
    "pr_number": "7018038264",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE4A6-26-P-0L56",
    "award_date": "2026-09-10",
    "award_quantity": 5,
    "unit_price": 13635.8,
    "total_value": 68179.0,
    "niin": "00-114-2285",
    "fsc": "3130",
    "description": "HOUSING,BEARING UNIT",
    "agency_code": "DIBBS2",
    "pr_number": "7018066758",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE4A6-26-P-0L85",
    "award_date": "2026-09-10",
    "award_quantity": 10,
    "unit_price": 600.0,
    "total_value": 6000.0,
    "niin": "01-734-2811",
    "fsc": "3110",
    "description": "COLLAR,BEARING",
    "agency_code": "DIBBS2",
    "pr_number": "7017868794",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE4A6-26-P-0Q66",
    "award_date": "2026-09-10",
    "award_quantity": 29,
    "unit_price": 125.34,
    "total_value": 3634.86,
    "niin": "00-432-7371",
    "fsc": "5970",
    "description": "TAPE,INSULATION,ELECTRICAL",
    "agency_code": "DIBBS2",
    "pr_number": "7017853980",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE4A6-26-V-362M",
    "award_date": "2026-09-10",
    "award_quantity": 9,
    "unit_price": 183.33,
    "total_value": 1649.97,
    "niin": "01-670-2734",
    "fsc": "6150",
    "description": "CABLE ASSEMBLY,POWE",
    "agency_code": "DIBBS2",
    "pr_number": "7018067285",
    "has_pdf": false,
    "order_detail_id": null
  },
  {
    "contract_number": "SPE4A6-26-V-365J",
    "award_date": "2026-09-10",
    "award_quantity": 394,
    "unit_price": 26.44,
    "total_value": 10417.36,
    "niin": "01-585-0218",
    "fsc": "5970",
    "description": "TAPE,INSULATION,ELECTRICAL",
    "agency_code": "DIBBS2",
    "pr_number": "7018066899",
    "has_pdf": false,
    "order_detail_id": null
  }
];
const VENDOR_AWARDS_TOTAL = 20;


// ---------------------------------------------------------------------------
// The remaining tabs. Same source as above (dev, 2026-09-11), same rule:
// has_pdf is false on every row so no PDF viewer can be opened, and
// solicitation_type is null on vendor rows because the type pill fetches
// code definitions when it mounts (the label alone is not rendered).
// ---------------------------------------------------------------------------

const PART_SOLICITATIONS: PartSolicitation[] = [
  {
    "solicitation_id": 15035405,
    "solicitation_number": "SPE7M1-26-Q-1467",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-21",
    "status": "open",
    "dibbs_listed_open": false,
    "last_status_check_at": "2026-09-11T20:35:11.250791Z",
    "award": null,
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": "DO-C9",
    "quantity": 4219,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 695502.15,
    "buyer_name": null,
    "buyer_email": "tanya.cool@dla.mil",
    "buyer_phone": "445-737-3101",
    "buyer_contact": "tanya.cool@dla.mil / 445-737-3101",
    "purchase_req": "7017315663",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 15030066,
    "solicitation_number": "SPE7MC-26-T-246X",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-14",
    "status": "open",
    "dibbs_listed_open": false,
    "last_status_check_at": "2026-09-11T20:43:44.459133Z",
    "award": null,
    "set_aside": "Y",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": "P",
    "solicitation_type_label": "Auto Evaluation",
    "rating": "DO-C9",
    "quantity": 1250,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 206062.5,
    "buyer_name": "Paula Mcclary",
    "buyer_email": "fmda_3302@dla.mil",
    "buyer_phone": "614-692-0417",
    "buyer_contact": "fmda_3302@dla.mil / 614-692-0417",
    "purchase_req": "7017985343",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 14945236,
    "solicitation_number": "SPE7M1-26-T-162T",
    "agency_code": "DLA",
    "close_date": "2026-08-01",
    "status": "removed",
    "dibbs_listed_open": false,
    "last_status_check_at": null,
    "award": null,
    "set_aside": "Total Small Business Set-Aside (FAR 19.5)",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": null,
    "quantity": 1200,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 197820.0,
    "buyer_name": "TANYA COOL",
    "buyer_email": "dibbsbsm@dla.mil",
    "buyer_phone": "445-737-3101",
    "buyer_contact": "dibbsbsm@dla.mil / 445-737-3101",
    "purchase_req": "7015048975",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 14964050,
    "solicitation_number": "SPE7M1-26-Q-1219",
    "agency_code": "DLA",
    "close_date": "2026-07-23",
    "status": "awarded",
    "dibbs_listed_open": false,
    "last_status_check_at": null,
    "award": null,
    "set_aside": "Total Small Business Set-Aside (FAR 19.5)",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": "DO-C9",
    "quantity": 1200,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 197820.0,
    "buyer_name": null,
    "buyer_email": "dibbsbsm@dla.mil",
    "buyer_phone": "445-737-3101",
    "buyer_contact": "dibbsbsm@dla.mil / 445-737-3101",
    "purchase_req": "7015048975",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 14898500,
    "solicitation_number": "SPE7M1-26-Q-0819",
    "agency_code": "DLA",
    "close_date": "2026-06-28",
    "status": "removed",
    "dibbs_listed_open": false,
    "last_status_check_at": null,
    "award": null,
    "set_aside": "Total Small Business Set-Aside (FAR 19.5)",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": null,
    "quantity": 1700,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 280245.0,
    "buyer_name": null,
    "buyer_email": "dibbsbsm@dla.mil",
    "buyer_phone": "445-737-3101",
    "buyer_contact": "dibbsbsm@dla.mil / 445-737-3101",
    "purchase_req": "7015048975",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 14779476,
    "solicitation_number": "SPE7MC-26-T-6106",
    "agency_code": "DIBBS2",
    "close_date": "2026-03-12",
    "status": "closed",
    "dibbs_listed_open": false,
    "last_status_check_at": null,
    "award": null,
    "set_aside": "Y",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": null,
    "quantity": 2633,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 434050.05,
    "buyer_name": "Paula Mcclary",
    "buyer_email": "fmda_3302@dla.mil",
    "buyer_phone": "614-692-0417",
    "buyer_contact": "fmda_3302@dla.mil / 614-692-0417",
    "purchase_req": "7015048975",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 14758552,
    "solicitation_number": "SPE7MC-26-Q-0188",
    "agency_code": "DIBBS2",
    "close_date": "2026-02-26",
    "status": "closed",
    "dibbs_listed_open": false,
    "last_status_check_at": null,
    "award": null,
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": null,
    "quantity": 3961,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 652970.85,
    "buyer_name": null,
    "buyer_email": "marisa.thompson@dla.mil",
    "buyer_phone": "6146233459",
    "buyer_contact": "marisa.thompson@dla.mil / 6146233459",
    "purchase_req": "7013471060",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 14705336,
    "solicitation_number": "SPE7MC-26-Q-0099",
    "agency_code": "DIBBS2",
    "close_date": "2026-01-19",
    "status": "closed",
    "dibbs_listed_open": false,
    "last_status_check_at": null,
    "award": null,
    "set_aside": "Y",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": null,
    "quantity": 3961,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 652970.85,
    "buyer_name": "Marisa Thompson PMCM63D",
    "buyer_email": "marisa.thompson@dla.mil",
    "buyer_phone": "614-623-3459",
    "buyer_contact": "marisa.thompson@dla.mil / 614-623-3459",
    "purchase_req": "7013471060",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 14723490,
    "solicitation_number": "CM25289009",
    "agency_code": "FBO SA",
    "close_date": "2026-01-15",
    "status": "closed",
    "dibbs_listed_open": false,
    "last_status_check_at": null,
    "award": null,
    "set_aside": null,
    "set_aside_code": null,
    "set_aside_label": null,
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": null,
    "quantity": 0,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 0.0,
    "buyer_name": "brandy warner",
    "buyer_email": "brandy.warner@dla.mil",
    "buyer_phone": null,
    "buyer_contact": "brandy.warner@dla.mil",
    "purchase_req": null,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 14616244,
    "solicitation_number": "SPE7MC-26-T-1287",
    "agency_code": "DIBBS2",
    "close_date": "2025-11-06",
    "status": "closed",
    "dibbs_listed_open": false,
    "last_status_check_at": null,
    "award": null,
    "set_aside": "Y",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": null,
    "quantity": 2792,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 460261.2,
    "buyer_name": "Paula Mcclary",
    "buyer_email": "fmda_3302@dla.mil",
    "buyer_phone": "614-692-0417",
    "buyer_contact": "fmda_3302@dla.mil / 614-692-0417",
    "purchase_req": "7013471060",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 14610151,
    "solicitation_number": "SPE7MC-26-T-1020",
    "agency_code": "DIBBS2",
    "close_date": "2025-11-03",
    "status": "closed",
    "dibbs_listed_open": false,
    "last_status_check_at": null,
    "award": null,
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": null,
    "quantity": 1169,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 192709.65,
    "buyer_name": "Paula Mcclary",
    "buyer_email": "fmda_3302@dla.mil",
    "buyer_phone": "614-692-0417",
    "buyer_contact": "fmda_3302@dla.mil / 614-692-0417",
    "purchase_req": "7012716149",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  },
  {
    "solicitation_id": 12475770,
    "solicitation_number": "SPE7MC-22-Q-0331",
    "agency_code": "DIBBS2",
    "close_date": "2022-05-06",
    "status": "closed",
    "dibbs_listed_open": false,
    "last_status_check_at": null,
    "award": null,
    "set_aside": "Y",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": null,
    "solicitation_type_label": null,
    "rating": null,
    "quantity": 550,
    "quantity_unit": "EA",
    "unit_price": 164.85,
    "estimated_value": 90667.5,
    "buyer_name": "Paula Mcclary PMCMUC7",
    "buyer_email": "paula.mcclary@dla.mil",
    "buyer_phone": "312-850-0417",
    "buyer_contact": "paula.mcclary@dla.mil / 312-850-0417",
    "purchase_req": "0093156020",
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "document_count": 0,
    "version_count": 1,
    "versions": []
  }
];
const PART_SOLICITATIONS_TOTAL = 30;

const END_USE: EndUseDescription[] = [
  {
    "description": "AIRCRAFT, B-1B"
  },
  {
    "description": "AIRCRAFT, HERCULES C-130"
  },
  {
    "description": "AIRCRAFT, OSPREY V-22A, MARINE CORPS"
  },
  {
    "description": "SPECIAL, COMMON GROUND EQUIPMENT, AGE"
  },
  {
    "description": "MIDS JTRS AN/USQ190"
  },
  {
    "description": "AIRCRAFT, T-38"
  },
  {
    "description": "AIRCRAFT, HARRIER AV-8B"
  },
  {
    "description": "AIRCRAFT, EAGLE F-15"
  },
  {
    "description": "AIRCRAFT, F-16"
  },
  {
    "description": "SUPPORT EQUIPMENT, A-10 AIRCRAFT"
  },
  {
    "description": "AIRCRAFT, OSPREY CV-22B"
  },
  {
    "description": "AIRCRAFT, F/A-18, A - D, E/F, G (GROWLER)"
  },
  {
    "description": "F-22 RAPTOR AIR DOMINANCE FIGHTER"
  },
  {
    "description": "AIRCRAFT, HORNET F/A-18"
  },
  {
    "description": "AIRCRAFT, SOF (AC-130H, AC-130J, AC-130U, EC-130E, EC-130H,"
  },
  {
    "description": "AVIATION LIFE SUPPORT SYSTEMS"
  }
];
const END_USE_TOTAL = 16;

const PACKAGING: PartPackaging = {
  "qup": "001",
  "pres_mthd": "31",
  "clng_dry": "0",
  "presv_mat": "49",
  "wrap_mat": "JA",
  "cush_dunn_mat": "P6",
  "cush_dunn_thkness": "A",
  "unit_cont": "D3",
  "opi": "M",
  "intrcdte_cont": "E5",
  "intrcdte_cont_qty": "AAA",
  "special_marking_code": "2",
  "packaging_data": "VALVE, CHECK, OXYGEN THIS IS A NAVY IDENTIFIED CRITICAL SAFETY ITEM (CSI) . ALL REQUESTS FOR WAIVERS OR DEVIATIONS MUST BE FORWARDED TO THE DSC CONTRACTING OFFICER FOR REVIEW AND APPROVAL. . ALL ITEMS OF SUPPLY SHALL BE MARKED IAW MIL-STD-129. IN ADDITION, EACH UNIT PACK WILL BE MARKED WITH LOT AND SERIAL NUMBER (IF AVAILABLE), CONTRACTOR'S CAGE CODE, ACTUAL MANUFACTURER'S CAGE CODE AND PART NUMBER. \r\nNLESS APPROVED BY THE ESA.",
  "marking_text": "EACH UNIT PACKAGE WILL BE MARKED WITH THE NSN, CONTRACT NUMBER, LOT NUMBER, CONTRACTOR CAGE CODE, MANUFACTURER CAGE CODE, AND PART NUMBER."
};
/** Packaging's own code map, merged over the part-level one the way
 *  PartDetail merges them (the packaging response wins). */
const PACKAGING_CODE_DEFINITIONS: Record<string, string> = {
  "PMC:31": "Waterproof bag, sealed",
  "PMC:031": "Waterproof bag, sealed",
  "CPC:0": "No requirement",
  "CPC:00": "No requirement",
  "CPC:000": "No requirement",
  "CPMC:49": "No Specification cited. See Description for details::Vendor's protective grease or oil coating",
  "CPMC:049": "No Specification cited. See Description for details::Vendor's protective grease or oil coating",
  "WMC:JA": "A-A-3174, plastic sheet, polyolefin, 2 mil",
  "WMC:ja": "A-A-3174, plastic sheet, polyolefin, 2 mil",
  "TCDC:A": "1/4 inch thick",
  "TCDC:a": "1/4 inch thick",
  "UICC:E5": "ASTM-D5118, fiberboard box",
  "UICC:e5": "ASTM-D5118, fiberboard box",
  "OPIC:M": "Container requirements will be coded in place of the conventional data",
  "OPIC:m": "Container requirements will be coded in place of the conventional data",
  "QUPC:AAA": "MIL-STD-2073-1D B.5.1 Maximum of 100 unit packs to the intermediate container; Maximum net load of 40 pounds';Maximum size of 1.5 cubic feet with at least two dimensions not exceeding 16 inches",
  "QUPC:aaa": "MIL-STD-2073-1D B.5.1 Maximum of 100 unit packs to the intermediate container; Maximum net load of 40 pounds';Maximum size of 1.5 cubic feet with at least two dimensions not exceeding 16 inches",
  "UICC:D3": "PPP-B-566, A-A-2807, PPP-B-676, or ASTM-D5118, folding, metal edged, setup or fiberboard box",
  "UICC:d3": "PPP-B-566, A-A-2807, PPP-B-676, or ASTM-D5118, folding, metal edged, setup or fiberboard box"
};
const PACKAGING_MARKING_DEFINITIONS: Record<string, string> = {
  "00": "NO SPECIAL MARKING."
};
const PACKAGING_SUPPLEMENTAL = {
  text: "PACKAGING REQUIREMENTS FOR PROCUREMENT RA001: THIS DOCUMENT INCORPORATES TECHNICAL AND/OR QUALITY REQUIREMENTS (IDENTIFIED BY AN 'R' OR AN 'I' NUMBER) SET FORTH IN FULL TEXT IN THE DLA MASTER LIST OF TECHNICAL AND QUALITY REQUIREMENTS FOUND ON THE WEB AT: http://www.dla.mil/HQ/Acquisition/Offers/eProcurement.aspx FOR SIMPLIFIED ACQUISITIONS, THE REVISION OF THE MASTER IN EFFECT ON THE SOLICITATION ISSUE DATE OR THE AWARD DATE CONTROLS. FOR LARGE ACQUISITIONS, THE REVISION OF THE MASTER IN EFFECT ON THE RFP ISSUE DATE APPLIES UNLESS A SOLICITATION AMENDMENT INCORPORATES A FOLLOW-ON REVISION, IN WHICH CASE THE AMENDMENT DATE CONTROLS. RQ002: CONFIGURATION CHANGE MANAGEMENT - ENGINEERING CHANGE PROPOSAL REQUEST FOR VARIANCE (DEVIATION OR WAIVER) RQ039: Non-Tailored Higher-Level Quality Requir",
  title: "Packaging Requirements \u2014 Solicitation SPE7M1-26-Q-1467 (2026-09-08)",
  source: "solicitation",
};

const PROCUREMENT_ITEM_DESCRIPTION: ProcurementItemDescription = {
  "description": "VALVE, CHECK, OXYGEN RC001: DOCUMENTATION REQUIREMENTS FOR SOURCE APPROVAL REQUEST (SAR) RP001: DLA PACKAGING REQUIREMENTS FOR PROCUREMENT RA001: THIS DOCUMENT INCORPORATES TECHNICAL AND/OR QUALITY REQUIREMENTS (IDENTIFIED BY AN 'R' OR AN 'I' NUMBER) SET FORTH IN FULL TEXT IN THE DLA MASTER LIST OF TECHNICAL AND QUALITY REQUIREMENTS FOUND ON THE WEB AT: http://www.dla.mil/HQ/Acquisition/Offers/eProcurement.a spx FOR SIMPLIFIED ACQUISITIONS, THE REVISION OF THE MASTER IN EFFECT ON THE SOLICITATION ISSUE DATE OR THE AWARD DATE CONTROLS.  FOR LARGE ACQUISITIONS, THE REVISION OF THE MASTER IN EFFECT ON THE RFP ISSUE DATE APPLIES UNLESS A SOLICITATION AMENDMENT INCORPORATES A FOLLOW-ON REVISION, IN WHICH CASE THE AMENDMENT DATE CONTROLS. RQ002: CONFIGURATION CHANGE MANAGEMENT - ENGINEERING CHANGE PROPOSAL REQUEST FOR VARIANCE (DEVIATION OR WAIVER) RQ039: Non-Tailored Higher-Level Quality Requirements (SAE AS9100) for Manufacturers and Non-Manufacturers RQ009: INSPECTION AND ACCEPTANCE AT ORIGIN RQ011: REMOVAL OF GOVERNMENT IDENTIFICATION FROM NON-ACCEPTED SUPPLIES CLAUSE 52.246-15, CERTIFICATE OF CONFORMANCE, IS NOT AUTHORIZED FOR THIS NSN UNLESS APPROVED BY THE ESA. If this NSN provides Contract Data Requirement Lists (CDRLs) as part of the Technical Data Package, the line items from this solicitation are not to be separately priced.  Offerors must factor into the end item unit price all costs associated with the preparation and delivery of the data deliverables in the contract. THIS IS A NAVY IDENTIFIED CRITICAL SAFETY ITEM (CSI). ALL REQUESTS FOR WAIVERS OR DEVIATIONS MUST BE FORWARDED TO THE DSC CONTRACTING OFFICER FOR REVIEW AND APPROVAL. . ALL ITEMS OF SUPPLY SHALL BE MARKED IAW MIL-STD-129.  IN ADDITION, EACH UNIT PACK WILL BE MARKED WITH LOT AND SERIAL NUMBER (IF AVAILABLE), CONTRACTOR'S CAGE CODE, ACTUAL MANUFACTURER'S CAGE CODE AND PART NUMBER.<br><br><a href=\"/library/parts/viewsddt?id=6713\" title=\"DLAD CLAUSE 52.246-9004, PRODUCT VERIFICATION\nTESTING, IS HEREBY INCORPORATED, AND MAY BE\nINVOKED AT THE DISCRETION OF THE PROCUREMENT\nACTIVITY.\" class=\"sddt-link\">Product verification testing applies.</a><br><a href=\"/library/parts/viewsddt?id=6482\" title=\"NO DATA IS AVAILABLE.  THE ALTERNATE OFFEROR IS\nREQUIRED TO PROVIDE A COMPLETE DATA PACKAGE\nINCLUDING DATA FOR THE APPROVED AND ALTERNATE\nPART FOR EVALUATION.\" class=\"sddt-link\">Provide complete data package for evaluation of alternate part.</a><br><a href=\"/library/parts/viewsddt?id=6751\" title=\"THE INTERNATIONAL ORGANIZATION FOR\nSTANDARDIZATION (ISO) 9002 OR A &quot;TAILORED&quot;\nPROGRAM MEETING THE FOLLOWING ISO 9002\nPARAGRAPHS APPLIES:\n4.5, DOCUMENT CONTROL: LIMITED TO INSPECTION\nAND TESTING AS WELL AS APPLICABLE DRAWINGS,\nSPECIFICATIONS AND INSTRUCTIONS REQUIRED BY\nCONTRACT\n4.6, PU ...\" class=\"sddt-link\">ISO 9002 applies</a><br><a href=\"/library/parts/viewsddt?id=9218\" title=\"CLAUSE 52.246-15, CERTIFICATE OF CONFORMANCE,\nIS NOT AUTHORIZED FOR THIS NSN.\" class=\"sddt-link\">Additional information.</a>",
  "pid_type": "1",
  "has_description": true,
  "sddt_blocks": [
    {
      "id": 6713,
      "title": "Product verification testing applies.",
      "text_content": "DLAD CLAUSE 52.246-9004, PRODUCT VERIFICATION\nTESTING, IS HEREBY INCORPORATED, AND MAY BE\nINVOKED AT THE DISCRETION OF THE PROCUREMENT\nACTIVITY.",
      "sequence_number": 1
    },
    {
      "id": 6482,
      "title": "Provide complete data package for evaluation of alternate part.",
      "text_content": "NO DATA IS AVAILABLE.  THE ALTERNATE OFFEROR IS\nREQUIRED TO PROVIDE A COMPLETE DATA PACKAGE\nINCLUDING DATA FOR THE APPROVED AND ALTERNATE\nPART FOR EVALUATION.",
      "sequence_number": 2
    },
    {
      "id": 6751,
      "title": "ISO 9002 applies",
      "text_content": "THE INTERNATIONAL ORGANIZATION FOR\nSTANDARDIZATION (ISO) 9002 OR A \"TAILORED\"\nPROGRAM MEETING THE FOLLOWING ISO 9002\nPARAGRAPHS APPLIES:\n4.5, DOCUMENT CONTROL: LIMITED TO INSPECTION\nAND TESTING AS WELL AS APPLICABLE DRAWINGS,\nSPECIFICATIONS AND INSTRUCTIONS REQUIRED BY\nCONTRACT\n4.6, PURCHASING: 4.6.1 AND LIMITED TO 4.6.2 A)\nAND 4.6.4.2, ALL OTHER PARTS OF PARAGRAPH\nARE HEREBY DELETED\n4.7, CUSTOMER-SUPPLIED PRODUCT:\n4.8, PRODUCT IDENTIFICATION & TRACEABILITY:\n4.10, INSPECTION & TESTING:\n4.11, INSPECTION, MEASURING & TEST EQUIPMENT:\n4.12, INSPECTION AND TEST STATUS:\n4.13, CONTROL OF NONCONFORMING PRODUCT:\n4.14, CORRECTIVE AND PREVENTIVE ACTION:\nPARAGRAPH 4.14.3 APPLY TO PRODUCT ONLY\n4.16, QUALITY RECORDS:\nFAR CLAUSE 52.246-11 APPLIES",
      "sequence_number": 3
    },
    {
      "id": 9218,
      "title": "Additional information.",
      "text_content": "CLAUSE 52.246-15, CERTIFICATE OF CONFORMANCE,\nIS NOT AUTHORIZED FOR THIS NSN.",
      "sequence_number": 4
    }
  ]
};

const VENDOR_CONTACTS: VendorContact[] = [
  {
    "contact_type": "govt_business",
    "first_name": "SAMANTHA",
    "middle_initial": "R",
    "last_name": "WILSON",
    "title": "GLOBAL RELATIONS DIRECTOR",
    "phone": "267-543-4002",
    "fax": null,
    "email": "amy@kampi.com"
  },
  {
    "contact_type": "alt_govt_business",
    "first_name": "SABRINA",
    "middle_initial": null,
    "last_name": "DAVID",
    "title": null,
    "phone": null,
    "fax": null,
    "email": null
  },
  {
    "contact_type": "alt_electronic",
    "first_name": "SAMANTHA",
    "middle_initial": null,
    "last_name": "WILSON",
    "title": null,
    "phone": null,
    "fax": null,
    "email": null
  },
  {
    "contact_type": "alt_past_performance",
    "first_name": "KELLY",
    "middle_initial": null,
    "last_name": "HARDY",
    "title": null,
    "phone": null,
    "fax": null,
    "email": null
  },
  {
    "contact_type": "government",
    "first_name": "SAMANTHA",
    "middle_initial": "R",
    "last_name": "WILSON",
    "title": "GLOBAL RELATIONS DIRECTOR",
    "phone": null,
    "fax": null,
    "email": null
  },
  {
    "contact_type": "electronic",
    "first_name": "PENNY",
    "middle_initial": null,
    "last_name": "JACKSON",
    "title": "IT DIRECTOR",
    "phone": null,
    "fax": null,
    "email": null
  },
  {
    "contact_type": "past_performance",
    "first_name": "PENNY",
    "middle_initial": null,
    "last_name": "JACKSON",
    "title": null,
    "phone": null,
    "fax": null,
    "email": null
  }
];

const VENDOR_BOOKINGS: { months: VendorBookingMonth[]; totals: VendorBookingTotals } = {
  months: [
  {
    "month_ending": "2026-07-31",
    "month_label": "Jul-26",
    "dscp_booked": 924150.35,
    "dscp_rank": 34,
    "dscr_booked": 1796826.15,
    "dscr_rank": 36,
    "dscc_booked": 9270573.36,
    "dscc_rank": 5,
    "other_booked": 0.0,
    "other_rank": null,
    "month_total": 11991549.86
  },
  {
    "month_ending": "2026-06-30",
    "month_label": "Jun-26",
    "dscp_booked": 1125989.62,
    "dscp_rank": 20,
    "dscr_booked": 1225665.99,
    "dscr_rank": 61,
    "dscc_booked": 7755234.05,
    "dscc_rank": 7,
    "other_booked": 13448.0,
    "other_rank": 155,
    "month_total": 10120337.66
  },
  {
    "month_ending": "2026-05-31",
    "month_label": "May-26",
    "dscp_booked": 88406.68,
    "dscp_rank": 114,
    "dscr_booked": 2838800.31,
    "dscr_rank": 24,
    "dscc_booked": 7088932.77,
    "dscc_rank": 4,
    "other_booked": 0.0,
    "other_rank": null,
    "month_total": 10016139.76
  },
  {
    "month_ending": "2026-04-30",
    "month_label": "Apr-26",
    "dscp_booked": 791051.64,
    "dscp_rank": 21,
    "dscr_booked": 645499.62,
    "dscr_rank": 68,
    "dscc_booked": 2900946.8,
    "dscc_rank": 13,
    "other_booked": 0.0,
    "other_rank": null,
    "month_total": 4337498.06
  },
  {
    "month_ending": "2026-03-31",
    "month_label": "Mar-26",
    "dscp_booked": 304316.76,
    "dscp_rank": 44,
    "dscr_booked": 928223.23,
    "dscr_rank": 47,
    "dscc_booked": 3631604.58,
    "dscc_rank": 9,
    "other_booked": 12208.98,
    "other_rank": 158,
    "month_total": 4876353.55
  },
  {
    "month_ending": "2026-02-28",
    "month_label": "Feb-26",
    "dscp_booked": 999768.09,
    "dscp_rank": 38,
    "dscr_booked": 3681442.09,
    "dscr_rank": 24,
    "dscc_booked": 7245597.35,
    "dscc_rank": 8,
    "other_booked": 1901.96,
    "other_rank": 161,
    "month_total": 11928709.49
  },
  {
    "month_ending": "2026-01-31",
    "month_label": "Jan-26",
    "dscp_booked": 4005941.23,
    "dscp_rank": 17,
    "dscr_booked": 13600848.34,
    "dscr_rank": 11,
    "dscc_booked": 20688995.83,
    "dscc_rank": 10,
    "other_booked": 450.96,
    "other_rank": 256,
    "month_total": 38296236.36
  },
  {
    "month_ending": "2025-12-31",
    "month_label": "Dec-25",
    "dscp_booked": 1471995.18,
    "dscp_rank": 13,
    "dscr_booked": 3058520.77,
    "dscr_rank": 21,
    "dscc_booked": 8669704.68,
    "dscc_rank": 6,
    "other_booked": 165.5,
    "other_rank": 251,
    "month_total": 13200386.13
  },
  {
    "month_ending": "2025-11-30",
    "month_label": "Nov-25",
    "dscp_booked": 1771627.32,
    "dscp_rank": 9,
    "dscr_booked": 4974448.07,
    "dscr_rank": 14,
    "dscc_booked": 9835643.09,
    "dscc_rank": 2,
    "other_booked": 0.0,
    "other_rank": 0,
    "month_total": 16581718.48
  },
  {
    "month_ending": "2025-10-31",
    "month_label": "Oct-25",
    "dscp_booked": 1574841.07,
    "dscp_rank": 17,
    "dscr_booked": 8075312.42,
    "dscr_rank": 8,
    "dscc_booked": 13866221.48,
    "dscc_rank": 4,
    "other_booked": 5557.24,
    "other_rank": 212,
    "month_total": 23521932.21
  },
  {
    "month_ending": "2025-09-30",
    "month_label": "Sep-25",
    "dscp_booked": 1555501.03,
    "dscp_rank": 8,
    "dscr_booked": 6578302.02,
    "dscr_rank": 12,
    "dscc_booked": 8149514.45,
    "dscc_rank": 2,
    "other_booked": 87909.92,
    "other_rank": 116,
    "month_total": 16371227.42
  },
  {
    "month_ending": "2025-08-31",
    "month_label": "Aug-25",
    "dscp_booked": 1004854.63,
    "dscp_rank": 16,
    "dscr_booked": 2588673.89,
    "dscr_rank": 30,
    "dscc_booked": 7945339.75,
    "dscc_rank": 5,
    "other_booked": 3530.25,
    "other_rank": 230,
    "month_total": 11542398.52
  },
  {
    "month_ending": "2025-07-31",
    "month_label": "Jul-25",
    "dscp_booked": 1444563.38,
    "dscp_rank": 14,
    "dscr_booked": 2155404.98,
    "dscr_rank": 45,
    "dscc_booked": 7104557.72,
    "dscc_rank": 4,
    "other_booked": 0.0,
    "other_rank": 0,
    "month_total": 10704526.08
  }
],
  totals: {
  "dscp_total": 17063006.98,
  "dscr_total": 52147967.88,
  "dscc_total": 114152865.91,
  "other_total": 125172.81,
  "grand_total": 183489013.58
},
};

const VENDOR_SOLICITATIONS: VendorSolicitation[] = [
  {
    "solicitation_id": 14664199,
    "solicitation_number": "SPE4A1-26-T-0792",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 13,
    "niin": "00-582-9981",
    "fsc": "5306",
    "description": "BOLT,CLOSE TOLERANCE",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Fast Award",
    "rating": "DO-C9",
    "unit_price": 143.0,
    "estimated_value": 1859.0,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 14955557,
    "solicitation_number": "SPE7L1-26-T-778L",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 13,
    "niin": "01-458-4236",
    "fsc": "5340",
    "description": "HINGE,BUTT",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Fast Award",
    "rating": "DO-C9",
    "unit_price": 76.96,
    "estimated_value": 1000.48,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 14964641,
    "solicitation_number": "SPE7M0-26-T-000G",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 1,
    "niin": "01-248-6415",
    "fsc": "5930",
    "description": "SWITCH,BREAKAWAY,TILT DECK TRAILER",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Fast Award",
    "rating": null,
    "unit_price": 31.9,
    "estimated_value": 31.9,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15004120,
    "solicitation_number": "SPE7LX-26-U-9352",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 3,
    "niin": "01-181-0636",
    "fsc": "5330",
    "description": "GASKET",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Automated IDC",
    "rating": null,
    "unit_price": 443.94,
    "estimated_value": 1331.82,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15012419,
    "solicitation_number": "SPE4A6-26-T-18XE",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 2146,
    "niin": "01-015-5060",
    "fsc": "5970",
    "description": "TAPE,INSULATION,ELECTRICAL",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Fast Award",
    "rating": "DO-C9",
    "unit_price": 1.8,
    "estimated_value": 3862.8,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15016140,
    "solicitation_number": "SPE4A6-26-T-20FV",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 14,
    "niin": "00-589-8536",
    "fsc": "1450",
    "description": "PEDAL ASSEMBLY,BRAKE",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Fast Award",
    "rating": "DO-C9",
    "unit_price": 101.0,
    "estimated_value": 1414.0,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15018028,
    "solicitation_number": "SPE7M1-26-U-5502",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 6,
    "niin": "01-514-9577",
    "fsc": "6060",
    "description": "COVER,FIBER OPTIC CONNECTOR",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Automated IDC",
    "rating": null,
    "unit_price": 230.6,
    "estimated_value": 1383.6,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15018299,
    "solicitation_number": "SPE7L1-26-U-0606",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 30,
    "niin": "00-898-4615",
    "fsc": "1045",
    "description": "VALVE",
    "set_aside": "Y",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": null,
    "solicitation_type_label": "Automated IDC",
    "rating": null,
    "unit_price": 790.0,
    "estimated_value": 23700.0,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15018314,
    "solicitation_number": "SPE7L1-26-U-0621",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 13,
    "niin": "01-577-2029",
    "fsc": "4910",
    "description": "SUPPORT PLATFORM,JACK",
    "set_aside": "Y",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": null,
    "solicitation_type_label": "Automated IDC",
    "rating": null,
    "unit_price": 12.09,
    "estimated_value": 157.17,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15018702,
    "solicitation_number": "SPE7L4-26-U-1141",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 72,
    "niin": "01-658-8113",
    "fsc": "5330",
    "description": "GASKET",
    "set_aside": "Y",
    "set_aside_code": "SBA",
    "set_aside_label": "Small Business Set-Aside",
    "solicitation_type": null,
    "solicitation_type_label": "Automated IDC",
    "rating": null,
    "unit_price": 128.46,
    "estimated_value": 9249.12,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15019220,
    "solicitation_number": "SPE4A6-26-T-21TW",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 1,
    "niin": "01-620-4227",
    "fsc": "6150",
    "description": "CABLE ASSEMBLY,SPECIAL PURPOSE,E",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Fast Award",
    "rating": "DO-A7",
    "unit_price": 1068.31,
    "estimated_value": 1068.31,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15020099,
    "solicitation_number": "SPE7L1-26-T-02E0",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 4,
    "niin": "00-366-2712",
    "fsc": "2815",
    "description": "BODY",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Fast Award",
    "rating": "DO-C9",
    "unit_price": 287.4,
    "estimated_value": 1149.6,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15020261,
    "solicitation_number": "SPE7L1-26-T-02N7",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 3,
    "niin": "01-179-1456",
    "fsc": "5330",
    "description": "GASKET",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Fast Award",
    "rating": "DO-C9",
    "unit_price": 359.0,
    "estimated_value": 1077.0,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15020361,
    "solicitation_number": "SPE7L1-26-T-02U0",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 80,
    "niin": "01-313-4959",
    "fsc": "5331",
    "description": "O-RING",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Fast Award",
    "rating": "DO-C9",
    "unit_price": 22.46,
    "estimated_value": 1796.8,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  },
  {
    "solicitation_id": 15020414,
    "solicitation_number": "SPE7L3-26-T-204C",
    "agency_code": "DIBBS2",
    "close_date": "2026-09-11",
    "status": "open",
    "quantity": 119,
    "niin": "01-472-5849",
    "fsc": "5330",
    "description": "PACKING ASSEMBLY",
    "set_aside": "N",
    "set_aside_code": "UNA",
    "set_aside_label": "Unrestricted",
    "solicitation_type": null,
    "solicitation_type_label": "Fast Award",
    "rating": "DO-C9",
    "unit_price": 35.95,
    "estimated_value": 4278.05,
    "has_pdf": false,
    "source": "DLA",
    "notice_type": null,
    "sam_url": null,
    "sam_description": null,
    "document_count": 0,
    "nsns": []
  }
];
const VENDOR_SOLICITATIONS_TOTAL = 50;

const VENDOR_RESULTS: VendorSearchResult[] = [
  {
    cage_code: VENDOR_DETAIL.cage_code,
    uei: VENDOR_DETAIL.uei,
    duns: VENDOR_DETAIL.duns,
    legal_business_name: VENDOR_DETAIL.legal_business_name,
    dba_name: VENDOR_DETAIL.dba_name,
    city: VENDOR_DETAIL.addresses[0]?.city ?? null,
    state: VENDOR_DETAIL.addresses[0]?.state ?? null,
    sam_status: "Active",
    small_business: VENDOR_DETAIL.small_business,
  },
];

/**
 * Search results: the DIBBS-sourced parts from the bid-matching fixture,
 * de-duplicated by NSN, as a "valve" description search would list them.
 * Unit price is the solicitation's estimated value spread over its quantity.
 */
function buildPartResults(): PartSearchResult[] {
  const seen = new Set<string>();
  const out: PartSearchResult[] = [];
  for (const seed of DEMO_ROW_SEEDS) {
    if (!seed.nsn || seen.has(seed.nsn)) continue;
    seen.add(seed.nsn);
    const digits = seed.nsn.replace(/-/g, "");
    out.push({
      id: 900000 + out.length,
      nsn: digits,
      niin: seed.nsn.slice(5),
      fsc: seed.fsc ?? digits.slice(0, 4),
      mfg_cage: null,
      mfg_part_number: null,
      description: seed.part_description,
      unit_of_issue: "EA",
      unit_price:
        seed.estimated_value != null && seed.quantity
          ? Math.round((seed.estimated_value / seed.quantity) * 100) / 100
          : null,
      psclas: null,
      nscode: null,
    });
  }
  // The record the demo opens must be addressable by the real part id, since
  // the detail fixture carries it.
  return out.map((p) =>
    p.nsn === PART_DETAIL.nsn.replace(/-/g, "") ? { ...p, id: PART_DETAIL.id } : p,
  );
}

export function resolveDemoLibrary(baseISO: string): DemoLibraryData {
  const parts = buildPartResults();
  const inventory = resolveDemoInventory(baseISO).partInventory;
  const byNsn = (nsn: string) => parts.find((p) => p.nsn === nsn.replace(/-/g, ""));
  const availability: Record<number, PartAvailability> = {};
  const mark = (nsn: string, network: number, mine: number) => {
    const p = byNsn(nsn);
    if (p) availability[p.id] = { part_id: p.id, network_listings: network, network_in_stock: network > 0, my_listings: mine };
  };
  mark("4820-01-317-9684", 3, 2);
  mark("4810-01-614-4712", 1, 1);
  mark("4720-01-425-1217", 2, 0);
  mark("5925-01-318-9547", 1, 0);

  return {
    parts,
    availability,
    part: {
      detail: PART_DETAIL,
      manufacturers: MANUFACTURERS,
      procurement: PROCUREMENT,
      procurementTotal: PROCUREMENT.length,
      technical: TECHNICAL,
      codeDefinitions: CODE_DEFINITIONS,
      codeTypeNames: CODE_TYPE_NAMES,
      solicitations: PART_SOLICITATIONS,
      solicitationsTotal: PART_SOLICITATIONS_TOTAL,
      endUse: END_USE,
      endUseTotal: END_USE_TOTAL,
      packaging: PACKAGING,
      packagingCodeDefinitions: { ...CODE_DEFINITIONS, ...PACKAGING_CODE_DEFINITIONS },
      packagingMarkingDefinitions: PACKAGING_MARKING_DEFINITIONS,
      packagingSupplemental: PACKAGING_SUPPLEMENTAL.text ? PACKAGING_SUPPLEMENTAL : null,
      procurementItemDescription: PROCUREMENT_ITEM_DESCRIPTION,
      inventory,
    },
    vendors: VENDOR_RESULTS,
    vendor: {
      detail: { ...VENDOR_DETAIL, contacts: VENDOR_CONTACTS },
      awards: VENDOR_AWARDS,
      awardsTotal: VENDOR_AWARDS_TOTAL,
      bookings: VENDOR_BOOKINGS,
      solicitations: VENDOR_SOLICITATIONS,
      solicitationsTotal: VENDOR_SOLICITATIONS_TOTAL,
    },
  };
}
