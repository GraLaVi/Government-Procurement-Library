// Resolves a campaign's declared offer ("Advanced, billed annually, 1 seat")
// against the live Stripe catalog from GET /billing/plans.
//
// Campaign content NEVER names a ProductPrice id. Those are database row ids
// — dev's Advanced prices are 15/16, prod's are 3/4 — so a marketing link
// built on one is silently wrong the moment the catalog is re-synced. A
// campaign names a product key and an interval in words; this module turns
// that into the current price id and the money to print on the page.

import { type Price, computeTotalCents } from "./pricing";

// Minimal shape of a plan row from GET /billing/plans. The pricing page
// declares its own, richer copy for the tier grid (seat pickers, add-on
// gating, current-plan badges); a campaign page only ever resolves a single
// offer, so it takes the subset it needs rather than both pages having to
// agree on one wide type.
export type CatalogPlan = {
  kind: "product" | "product_group";
  id: number;
  key: string;
  name: string;
  description: string | null;
  default_trial_days: number | null;
  max_seat_count: number | null;
  prices: Price[];
};

export type OfferInterval = "monthly" | "quarterly" | "semiannual" | "annual";

// Campaign frontmatter names an interval in words; Stripe prices carry an
// interval_count in months. This is the only place the two are mapped.
export const INTERVAL_MONTHS: Record<OfferInterval, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export function isOfferInterval(value: unknown): value is OfferInterval {
  return typeof value === "string" && value in INTERVAL_MONTHS;
}

export type ResolvedOffer = {
  /** Catalog product name, e.g. "Procurement Intelligence — Advanced". */
  productName: string;
  /** Tier half of the product name, lowercased — the ?tier= slug /signup wants. */
  tierSlug: string | null;
  /** Current ProductPrice id for this product + interval. */
  priceId: number;
  seats: number;
  intervalMonths: number;
  currency: string;
  /** What the customer pays per billing period, for `seats` seats. */
  totalCents: number;
  /** totalCents spread across the period — the "$84/mo" line. */
  perMonthCents: number;
  trialDays: number | null;
  /**
   * Saving vs. paying month-to-month for the same span. Null when this offer
   * IS the monthly price, or the product has no monthly price to compare to.
   */
  savingsVsMonthlyCents: number | null;
};

/**
 * Thrown when a campaign names a product or interval the catalog doesn't
 * carry. This is a content bug in the .md file, not a runtime condition —
 * it should stop a build rather than render a campaign page with a hole
 * where the price goes.
 */
export class OfferResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfferResolutionError";
  }
}

// Split "Procurement Intelligence — Advanced" into its tier half. Mirrors
// splitFamilyTier on the pricing page; names without an em-dash have no tier.
export function tierSlugFromName(name: string): string | null {
  const match = name.match(/^(.+?)\s*—\s*(.+)$/);
  return match ? match[2].trim().toLowerCase() : null;
}

function findPlan(plans: CatalogPlan[], productKey: string): CatalogPlan {
  const plan = plans.find((p) => p.key === productKey);
  if (!plan) {
    throw new OfferResolutionError(
      `No product with key "${productKey}" in the catalog. Either the key is ` +
        `misspelled in the campaign frontmatter, or the product is not ` +
        `billing_enabled (disabled products never reach GET /billing/plans).`,
    );
  }
  return plan;
}

/** Every interval this product actually sells, in ascending term length. */
export function availableIntervals(
  plans: CatalogPlan[],
  productKey: string,
): OfferInterval[] {
  const plan = findPlan(plans, productKey);
  return (Object.keys(INTERVAL_MONTHS) as OfferInterval[])
    .filter((i) => plan.prices.some((p) => p.interval_count === INTERVAL_MONTHS[i]))
    .sort((a, b) => INTERVAL_MONTHS[a] - INTERVAL_MONTHS[b]);
}

export type OfferVariants = Partial<Record<OfferInterval, ResolvedOffer>>;

/**
 * Price every interval the product sells, so one campaign page can switch
 * between them without another catalog round trip. The whole catalog arrives
 * in a single fetch, so this costs nothing beyond the arithmetic.
 */
export function resolveOfferVariants(
  plans: CatalogPlan[],
  productKey: string,
  seats: number,
): OfferVariants {
  const variants: OfferVariants = {};
  for (const interval of availableIntervals(plans, productKey)) {
    variants[interval] = resolveOffer(plans, productKey, interval, seats);
  }
  return variants;
}

export function resolveOffer(
  plans: CatalogPlan[],
  productKey: string,
  interval: OfferInterval,
  seats: number,
): ResolvedOffer {
  const plan = findPlan(plans, productKey);

  const intervalMonths = INTERVAL_MONTHS[interval];
  const price = plan.prices.find((p) => p.interval_count === intervalMonths);
  if (!price) {
    const available = plan.prices.map((p) => `${p.interval_count}mo`).join(", ") || "none";
    throw new OfferResolutionError(
      `"${plan.name}" has no ${interval} price (interval_count ${intervalMonths}). ` +
        `Available intervals: ${available}.`,
    );
  }

  // Clamp to the product's seat ceiling rather than quoting a price the
  // checkout would later refuse.
  const cappedSeats = plan.max_seat_count
    ? Math.min(Math.max(1, seats), plan.max_seat_count)
    : Math.max(1, seats);

  const totalCents = computeTotalCents(price, cappedSeats);
  if (totalCents === null) {
    throw new OfferResolutionError(
      `Could not compute a total for "${plan.name}" at ${cappedSeats} seat(s). ` +
        `The price has billing_scheme "${price.billing_scheme}" with ` +
        `tiers_mode "${price.tiers_mode}", which the campaign card can't price.`,
    );
  }

  // Longer commitments are sold on the discount, so work out what the same
  // span would cost month-to-month. Only surfaced when it's actually cheaper.
  let savingsVsMonthlyCents: number | null = null;
  if (intervalMonths > 1) {
    const monthlyPrice = plan.prices.find((p) => p.interval_count === 1);
    const monthlyTotal = monthlyPrice ? computeTotalCents(monthlyPrice, cappedSeats) : null;
    if (monthlyTotal !== null) {
      const delta = monthlyTotal * intervalMonths - totalCents;
      if (delta > 0) savingsVsMonthlyCents = delta;
    }
  }

  return {
    productName: plan.name,
    tierSlug: tierSlugFromName(plan.name),
    priceId: price.id,
    seats: cappedSeats,
    intervalMonths,
    currency: price.currency,
    totalCents,
    perMonthCents: Math.round(totalCents / intervalMonths),
    trialDays: plan.default_trial_days,
    savingsVsMonthlyCents,
  };
}
