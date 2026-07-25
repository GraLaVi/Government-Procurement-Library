// Shared tiered-price math for Stripe Prices returned by GET /api/billing/plans.
// Used by /pricing and the account billing page's add-on picker so both
// compute totals/seat bounds the same way.

export type PriceTier = {
  up_to_quantity: number | null; // null = infinity
  unit_amount_cents: number;
  flat_amount_cents: number;
};

export type Price = {
  id: number;
  stripe_price_id: string;
  interval_unit: string;
  interval_count: number;
  unit_amount_cents: number;
  currency: string;
  billing_scheme: "per_unit" | "tiered";
  tiers_mode: "volume" | "graduated" | null;
  tiers: PriceTier[];
};

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

export function intervalLabel(months: number): string {
  switch (months) {
    case 1:
      return "Monthly";
    case 3:
      return "Quarterly";
    case 6:
      return "Semi-annual";
    case 12:
      return "Annual";
    default:
      return `Every ${months} months`;
  }
}

// Find the volume bracket the seat count falls into (first tier whose up_to >= qty,
// or the last/infinity tier).
export function findVolumeTier(tiers: PriceTier[], quantity: number): PriceTier | null {
  if (tiers.length === 0) return null;
  for (const t of tiers) {
    if (t.up_to_quantity === null || quantity <= t.up_to_quantity) return t;
  }
  return tiers[tiers.length - 1];
}

// Graduated ("progressive") tiers: each bracket's units are billed at that
// bracket's rate, then summed — the way Stripe computes graduated pricing.
// `tiers` are ascending by up_to_quantity (null = the final, unbounded tier).
export function computeGraduatedCents(tiers: PriceTier[], quantity: number): number | null {
  if (tiers.length === 0 || quantity < 1) return null;
  let total = 0;
  let prevUpTo = 0;
  for (const t of tiers) {
    const upTo = t.up_to_quantity ?? Infinity;
    const unitsInBracket = Math.min(quantity, upTo) - prevUpTo;
    if (unitsInBracket > 0) {
      total += unitsInBracket * t.unit_amount_cents + t.flat_amount_cents;
    }
    prevUpTo = upTo;
    if (quantity <= upTo) break;
  }
  return total;
}

// Compute the period total for a given price + seat count, regardless of scheme.
// Returns null when the price/tiers don't support this seat count.
export function computeTotalCents(price: Price, quantity: number): number | null {
  if (price.billing_scheme === "per_unit") {
    return price.unit_amount_cents * quantity;
  }
  if (price.billing_scheme === "tiered" && price.tiers_mode === "volume") {
    const t = findVolumeTier(price.tiers, quantity);
    if (!t) return null;
    return t.unit_amount_cents * quantity + t.flat_amount_cents;
  }
  if (price.billing_scheme === "tiered" && price.tiers_mode === "graduated") {
    return computeGraduatedCents(price.tiers, quantity);
  }
  return null;
}

// Maximum seats we let a picker reach. For tiered prices we use the largest
// finite up_to bound × 2; for unbounded ("up_to: inf"), default to 1000.
export function maxPickerSeats(price: Price): number {
  if (price.billing_scheme !== "tiered" || price.tiers.length === 0) return 1000;
  const finite = price.tiers
    .map((t) => t.up_to_quantity)
    .filter((x): x is number => typeof x === "number");
  if (finite.length === 0) return 1000;
  return Math.max(...finite) * 2;
}

// "$X / mo" given a total for a 1/3/6/12-month interval. Returns "" if interval=1.
export function perMonthSuffix(totalCents: number, intervalCount: number, currency: string): string {
  if (intervalCount === 1) return "/mo";
  return ` (${formatMoney(totalCents / intervalCount, currency)}/mo)`;
}
