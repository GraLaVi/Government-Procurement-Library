// Single source of truth for the Help Center (`/help`).
//
// This registry drives BOTH the `/help/[slug]` route allowlist AND the
// landing-page layout, so the two can never drift. Each entry maps a URL
// slug to the markdown file in `src/content/help/<slug>.md`, a display
// title, and a one-line blurb used on the landing-page cards.
//
// To add an article: drop `<slug>.md` into src/content/help/ and add an
// entry here. To retire one: remove both. Nothing else needs editing.

export type HelpGroup = "start-here" | "platform" | "account";

export interface HelpArticleMeta {
  /** URL slug — also the markdown filename stem (`<slug>.md`). */
  slug: string;
  /** Display title used in nav, cards, and breadcrumbs. */
  title: string;
  /** One-line description shown on the landing-page card/list. */
  blurb: string;
  /** Which landing-page section this article appears under. */
  group: HelpGroup;
  /**
   * If set, this article is a "spoke" of the given hub slug and is rendered
   * nested beneath it on the landing page (e.g. recipes under profiles).
   */
  spokeOf?: string;
}

// Order here is the order articles render within their group.
export const HELP_ARTICLES: HelpArticleMeta[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    blurb:
      "New to GPH? A quick walkthrough of your dashboard and the three steps to activate your account.",
    group: "start-here",
  },
  {
    slug: "bid-matching-profiles",
    title: "Setting Up Bid-Matching Profiles",
    blurb:
      "Create and manage the profiles that automatically surface relevant solicitations.",
    group: "platform",
  },
  {
    slug: "bid-matching-recipes",
    title: "Bid-Matching Recipes and Tuning",
    blurb:
      "Pick the right conditions, copy worked examples, and tune a noisy or quiet profile.",
    group: "platform",
    spokeOf: "bid-matching-profiles",
  },
  {
    slug: "solicitation-matching",
    title: "How Solicitation Matching Works",
    blurb:
      "Understand how GPH matches incoming solicitations to your profiles and how to read your results.",
    group: "platform",
  },
  {
    slug: "parts-search",
    title: "Searching for Parts",
    blurb:
      "Look up parts by NSN, NIIN, manufacturer part number, or description, and read detailed part records.",
    group: "platform",
  },
  {
    slug: "vendor-research",
    title: "Researching Vendors",
    blurb:
      "Investigate any government contractor's awards, contracts, and active solicitations by CAGE code or name.",
    group: "platform",
  },
  {
    slug: "supplier-stock",
    title: "Sharing and Finding Supplier Stock",
    blurb:
      "Upload your inventory, control what other subscribers see, and find parts that are on the shelf right now.",
    group: "platform",
  },
  // HIDDEN UNTIL ANALYTICS ADD-ON LAUNCH: both articles below cover features
  // gated by the gph_analytics add-on, which isn't announced yet. Uncomment
  // BOTH at the same time as ANALYTICS_ADDON_PUBLIC in @/lib/analytics/tier —
  // they cross-link to each other, so relisting one alone leaves a dead link.
  // Their markdown is unchanged on disk and renders as-is once restored. Also
  // restore the analytics passages commented out in plans-and-pricing.md.
  // {
  //   slug: "procurement-analytics",
  //   title: "Reading the Procurement Analytics Dashboard",
  //   blurb:
  //     "Understand every section of the Analytics dashboard — market pulse, act-now signals, your win history, and prospecting — and how to act on each.",
  //   group: "platform",
  // },
  // {
  //   slug: "demand-intelligence",
  //   title: "Reading Demand & Stock Data",
  //   blurb:
  //     "Use DLA's demand forecast and inventory signals on a part's Demand & Stock tab to decide what to bid on and how to price.",
  //   group: "platform",
  //   spokeOf: "procurement-analytics",
  // },
  {
    slug: "requests-for-quote",
    title: "Sending RFQs to Vendors",
    blurb:
      "Send requests for quote to vendors from a part's Manufacturers tab and collect structured quotes.",
    group: "platform",
  },
  {
    slug: "rfq-enterprise",
    title: "The RFQ Enterprise Work Queue",
    blurb:
      "Disburse matched solicitations to buyers by CAGE, quote private vendors, and compare quotes side by side.",
    group: "platform",
  },
  {
    slug: "solicitations-and-contracts",
    title: "Viewing Solicitations and Contracts",
    blurb: "Open solicitation and contract PDFs and review amendment history.",
    group: "platform",
  },
  {
    slug: "plans-and-pricing",
    title: "Plans and Pricing",
    blurb: "Understand what each plan includes and which features are tier-gated.",
    group: "account",
  },
  {
    slug: "account-settings",
    title: "Managing Your Account",
    blurb:
      "Manage your profile, password, team, preferences, and non-login contacts.",
    group: "account",
  },
  {
    slug: "notifications",
    title: "Notifications",
    blurb: "Configure email alert preferences for yourself and your team.",
    group: "account",
  },
  {
    // Cross-cutting: reached from the landing page's "Can't find what you're
    // looking for?" section rather than a numbered group.
    slug: "faq",
    title: "Frequently Asked Questions",
    blurb: "Quick answers to common questions about using GPH.",
    group: "account",
  },
];

/** Every valid slug — used by the [slug] route's allowlist and SSG params. */
export const HELP_SLUGS = HELP_ARTICLES.map((a) => a.slug);

export function getHelpArticle(slug: string): HelpArticleMeta | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

/** Articles in a group, in registry order (spokes included). */
export function articlesInGroup(group: HelpGroup): HelpArticleMeta[] {
  return HELP_ARTICLES.filter((a) => a.group === group);
}
