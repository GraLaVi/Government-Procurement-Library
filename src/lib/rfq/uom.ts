// Units of measure for RFQ line items. Codes follow common
// federal/DLA two-letter UOM abbreviations.
export interface UomOption {
  code: string;
  label: string;
}

export const UOM_OPTIONS: UomOption[] = [
  { code: "EA", label: "EA — Each" },
  { code: "PR", label: "PR — Pair" },
  { code: "DZ", label: "DZ — Dozen" },
  { code: "GR", label: "GR — Gross" },
  { code: "HD", label: "HD — Hundred" },
  { code: "TH", label: "TH — Thousand" },
  { code: "SE", label: "SE — Set" },
  { code: "KT", label: "KT — Kit" },
  { code: "AY", label: "AY — Assembly" },
  { code: "BX", label: "BX — Box" },
  { code: "CA", label: "CA — Case" },
  { code: "PG", label: "PG — Package" },
  { code: "BG", label: "BG — Bag" },
  { code: "BD", label: "BD — Bundle" },
  { code: "CN", label: "CN — Can" },
  { code: "BT", label: "BT — Bottle" },
  { code: "DR", label: "DR — Drum" },
  { code: "RO", label: "RO — Roll" },
  { code: "RL", label: "RL — Reel" },
  { code: "SP", label: "SP — Spool" },
  { code: "CL", label: "CL — Coil" },
  { code: "RM", label: "RM — Ream" },
  { code: "SH", label: "SH — Sheet" },
  { code: "TU", label: "TU — Tube" },
  { code: "FT", label: "FT — Foot" },
  { code: "IN", label: "IN — Inch" },
  { code: "YD", label: "YD — Yard" },
  { code: "MR", label: "MR — Meter" },
  { code: "CM", label: "CM — Centimeter" },
  { code: "SQ", label: "SQ — Square Foot" },
  { code: "CF", label: "CF — Cubic Foot" },
  { code: "LB", label: "LB — Pound" },
  { code: "OZ", label: "OZ — Ounce" },
  { code: "KG", label: "KG — Kilogram" },
  { code: "GL", label: "GL — Gallon" },
  { code: "QT", label: "QT — Quart" },
  { code: "PT", label: "PT — Pint" },
  { code: "LT", label: "LT — Liter" },
  { code: "ML", label: "ML — Milliliter" },
  { code: "TN", label: "TN — Ton" },
];
