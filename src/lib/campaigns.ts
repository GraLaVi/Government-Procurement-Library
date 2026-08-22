// Single source of truth for marketing campaign landing pages (`/start/<slug>`).
//
// This registry drives the `/start/[slug]` route allowlist and its SSG params,
// so a stray or half-finished markdown file in src/content/campaigns/ can
// never publish itself — a page goes live only when its slug is listed here.
//
// To launch a campaign: drop `<slug>.md` into src/content/campaigns/ and add
// an entry below. To retire one: remove the entry (the URL then 404s) and
// leave or delete the markdown as you prefer.
//
// The frontmatter names WHAT is being sold; it never names a price. Prices,
// trial length, and seat math are resolved from the live catalog at render
// time — see @/lib/billing/resolveOffer.

import { isOfferInterval, type OfferInterval } from "@/lib/billing/resolveOffer";

export interface CampaignMeta {
  /** URL slug — also the markdown filename stem (`<slug>.md`). */
  slug: string;
  /**
   * Internal note: which campaign, channel, or audience this page serves.
   * Never rendered — it's here so the registry stays readable a year from now.
   */
  note: string;
}

export const CAMPAIGNS: CampaignMeta[] = [
  {
    slug: "advanced-annual-q4",
    note: "Email + paid social. Advanced tier sold on the annual discount.",
  },
];

/** Every valid slug — the [slug] route's allowlist and SSG params. */
export const CAMPAIGN_SLUGS = CAMPAIGNS.map((c) => c.slug);

export function getCampaign(slug: string): CampaignMeta | undefined {
  return CAMPAIGNS.find((c) => c.slug === slug);
}

/** Frontmatter contract for src/content/campaigns/<slug>.md. */
export interface CampaignFrontmatter {
  /** On-page H1. */
  title: string;
  /** Small pill above the headline, e.g. "Limited launch offer". Optional. */
  eyebrow?: string;
  /** Label on the button under the CAGE field. Optional. */
  cta_label?: string;
  /** products.key of the tier being sold, e.g. "library_search_advanced". */
  offer_product: string;
  /** monthly | quarterly | semiannual | annual. */
  offer_interval: OfferInterval;
  /** Seats to quote and pre-fill at checkout. Defaults to 1. */
  offer_seats: number;
  /** SEO <title>; falls back to `title`. Optional. */
  meta_title?: string;
  /** SEO meta description. Optional. */
  description?: string;
}

/**
 * Validate raw frontmatter into the typed contract above.
 *
 * Throws on anything missing or malformed. That's deliberate: a campaign page
 * whose offer fields are wrong would render a live page selling an unknown
 * thing, so it should break the build instead — the error names the file and
 * the field so it's obvious what to fix.
 */
export function parseCampaignFrontmatter(
  slug: string,
  raw: Record<string, unknown>,
): CampaignFrontmatter {
  const where = `src/content/campaigns/${slug}.md`;

  const requireString = (field: string): string => {
    const value = raw[field];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`${where}: frontmatter "${field}" is required and must be a non-empty string.`);
    }
    return value.trim();
  };

  const optionalString = (field: string): string | undefined => {
    const value = raw[field];
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") {
      throw new Error(`${where}: frontmatter "${field}" must be a string.`);
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const interval = raw.offer_interval;
  if (!isOfferInterval(interval)) {
    throw new Error(
      `${where}: frontmatter "offer_interval" must be one of ` +
        `monthly, quarterly, semiannual, annual — got ${JSON.stringify(interval)}.`,
    );
  }

  const rawSeats = raw.offer_seats ?? 1;
  const seats = typeof rawSeats === "number" ? rawSeats : Number(rawSeats);
  if (!Number.isInteger(seats) || seats < 1) {
    throw new Error(
      `${where}: frontmatter "offer_seats" must be a whole number of 1 or more — ` +
        `got ${JSON.stringify(raw.offer_seats)}.`,
    );
  }

  return {
    title: requireString("title"),
    eyebrow: optionalString("eyebrow"),
    cta_label: optionalString("cta_label"),
    offer_product: requireString("offer_product"),
    offer_interval: interval,
    offer_seats: seats,
    meta_title: optionalString("meta_title"),
    description: optionalString("description"),
  };
}
