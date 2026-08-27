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

/**
 * A campaign that sells several products on ONE subscription.
 *
 * Declared here rather than in the markdown because, unlike a single-product
 * campaign, a basket is not something marketing can launch on its own: the
 * same basket must exist in the API's registry (`src/billing/campaigns.py`)
 * under the same slug, and that is what actually decides the charge. Keeping
 * it in TypeScript also lets `/signup` name the products on its confirmation
 * badge, which it cannot do from a markdown file.
 *
 * The checkout handoff for these campaigns carries the SLUG, never price ids
 * — the API resolves the basket itself. A basket assembled from query
 * parameters would be a free trial of anything the visitor cared to name.
 */
export interface CampaignBasket {
  /** products.key of the library tier. Leads the offer card and owns the trial. */
  tierProductKey: string;
  /** products.key of each add-on riding the same subscription. */
  addonProductKeys: string[];
}

export interface CampaignMeta {
  /** URL slug — also the markdown filename stem (`<slug>.md`). */
  slug: string;
  /**
   * Internal note: which campaign, channel, or audience this page serves.
   * Never rendered — it's here so the registry stays readable a year from now.
   */
  note: string;
  /**
   * Present when this campaign sells more than one product. The markdown then
   * omits `offer_product` — the basket is declared here instead, so there is
   * exactly one place per campaign that says what is sold.
   */
  basket?: CampaignBasket;
}

export const CAMPAIGNS: CampaignMeta[] = [
  {
    slug: "advanced-annual-q4",
    note: "Email + paid social. Advanced tier sold on the annual discount.",
  },
  {
    slug: "advanced-trial-all-access",
    note:
      "All-access trial: Advanced + RFQ + Analytics on one 14-day trial, no " +
      "card. MUST stay in sync with CAMPAIGNS in the API's " +
      "src/billing/campaigns.py — that registry decides the charge, this one " +
      "only decides what the page says.",
    basket: {
      tierProductKey: "library_search_advanced",
      addonProductKeys: ["request_for_quote", "gph_analytics"],
    },
  },
];

/** Every valid slug — the [slug] route's allowlist and SSG params. */
export const CAMPAIGN_SLUGS = CAMPAIGNS.map((c) => c.slug);

export function getCampaign(slug: string): CampaignMeta | undefined {
  return CAMPAIGNS.find((c) => c.slug === slug);
}

/**
 * Placeholder a campaign may use inside `title` to lead with the trial
 * offer. Filled from the live catalog at render time — the same rule the
 * rest of this page follows: the file says what is sold, never the numbers.
 */
export const TRIAL_DAYS_TOKEN = "{trial_days}";

/** Frontmatter contract for src/content/campaigns/<slug>.md. */
export interface CampaignFrontmatter {
  /**
   * On-page H1. May contain {@link TRIAL_DAYS_TOKEN}, which is replaced with
   * the resolved price's trial length so the headline can never drift from
   * the offer card beside it.
   */
  title: string;
  /**
   * H1 used when there is no trial length to quote — the billing service was
   * unreachable, or the resolved price sells without a trial. Required when
   * `title` uses {@link TRIAL_DAYS_TOKEN}.
   */
  title_no_trial?: string;
  /** Small pill above the headline, e.g. "Limited launch offer". Optional. */
  eyebrow?: string;
  /** Label on the button under the CAGE field. Optional. */
  cta_label?: string;
  /**
   * products.key of the tier being sold, e.g. "library_search_advanced".
   * Omitted by basket campaigns — those declare their products in the
   * `CAMPAIGNS` registry above, so the two can't drift.
   */
  offer_product?: string;
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
  const basket = getCampaign(slug)?.basket;

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

  const title = requireString("title");
  const titleNoTrial = optionalString("title_no_trial");
  if (title.includes(TRIAL_DAYS_TOKEN) && !titleNoTrial) {
    throw new Error(
      `${where}: frontmatter "title" uses ${TRIAL_DAYS_TOKEN}, so ` +
        `"title_no_trial" is required — it is the headline shown when there ` +
        `is no trial length to quote (billing unreachable, or the price ` +
        `sells without a trial).`,
    );
  }

  return {
    title,
    title_no_trial: titleNoTrial,
    eyebrow: optionalString("eyebrow"),
    cta_label: optionalString("cta_label"),
    // A basket campaign names its products in the registry, so requiring the
    // field here would create a second place to say the same thing — and the
    // first one to go stale would be the one nobody is looking at. A basket
    // campaign that names one anyway is a mistake worth stopping.
    offer_product: basket
      ? (() => {
          if (raw.offer_product !== undefined) {
            throw new Error(
              `${where}: "${slug}" is a basket campaign — its products are ` +
                `declared in CAMPAIGNS (src/lib/campaigns.ts). Remove ` +
                `"offer_product" from the frontmatter so there is only one ` +
                `place that says what this campaign sells.`,
            );
          }
          return undefined;
        })()
      : requireString("offer_product"),
    offer_interval: interval,
    offer_seats: seats,
    meta_title: optionalString("meta_title"),
    description: optionalString("description"),
  };
}

/**
 * The headline to render for a campaign.
 *
 * A campaign that leads with the trial offer writes it as
 * `Free for {trial_days} days. No card required.` — the sentence is the
 * file's to edit, the number is the catalog's to supply, so the H1 can never
 * disagree with the price card beside it. When no trial length is available
 * (billing unreachable, or the price sells without one), the campaign's
 * `title_no_trial` headline is used instead; `parseCampaignFrontmatter`
 * guarantees one exists whenever the token is used.
 */
export function resolveCampaignTitle(
  frontmatter: Pick<CampaignFrontmatter, "title" | "title_no_trial">,
  trialDays: number | null,
): string {
  const { title, title_no_trial: titleNoTrial } = frontmatter;
  if (!title.includes(TRIAL_DAYS_TOKEN)) return title;
  if (trialDays === null || trialDays <= 0) return titleNoTrial ?? title;
  return title.split(TRIAL_DAYS_TOKEN).join(String(trialDays));
}
