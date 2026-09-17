// Single source of truth for what the public crawlers see: the URL list behind
// `/sitemap.xml` (src/app/sitemap.ts) and the rules in `/robots.txt`
// (src/app/robots.ts).
//
// The route list is DERIVED wherever a registry already exists — help articles
// come from HELP_ARTICLES, product pages from PRODUCT_PAGES — so publishing an
// article or a product page puts it in the sitemap with no edit here. Only the
// handful of one-off marketing pages are listed literally.
//
// Everything in here is public, unauthenticated, and indexable. App routes
// (/dashboard, /account, /library, /rfq, /analytics, /bidmatching) are behind a
// login and are listed in DISALLOWED_PREFIXES instead.

import { HELP_ARTICLES } from "@/lib/help";
import { PRODUCT_PAGES } from "@/lib/products";

/**
 * Canonical origin. The `www` host is deliberate: the apex (gphusa.com)
 * 301s to www at Cloudflare's edge and the origin cert only covers www
 * (see nginx/nginx.production.conf), so www is the only form that answers
 * directly. Every URL we hand a crawler must already be the redirect target —
 * a sitemap full of redirecting URLs is a crawl-budget tax and muddies which
 * host owns the ranking.
 *
 * Hard-coded rather than read from the environment on purpose: dev and prod
 * run the same code path, and a sitemap is only ever fetched from production.
 */
export const SITE_URL = "https://www.gphusa.com";

/** Section defaults, applied by `publicRoutes()` below. */
type ChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface SitemapRoute {
  /** Site-root-relative path, e.g. "/help/parts-search". */
  path: string;
  /**
   * ISO date (YYYY-MM-DD) of the last MEANINGFUL change to the page, for
   * `<lastmod>`. Bump it when the copy changes; leave it alone for a refactor
   * that renders the same page. A date that moves on every deploy teaches
   * Google to ignore the field entirely, which costs us the recrawl signal
   * that is the whole point of publishing one.
   *
   * For /help/* and /legal/* this is only the FALLBACK: a `last_updated` in
   * the markdown frontmatter wins (see src/app/sitemap.ts), so an article can
   * carry its own date next to its own copy. Undated routes ship with no
   * <lastmod> at all — an omitted date is honest, a guessed one is not.
   */
  lastmod?: string;
  changeFrequency: ChangeFrequency;
  /**
   * Relative importance WITHIN this site, 0.0-1.0. Google ignores both this
   * and changeFrequency; Bing and smaller crawlers still read them, and they
   * cost nothing to emit.
   */
  priority: number;
}

/**
 * Seeded from `git log -1` per route at the time the sitemap was built
 * (Sept 2026). Maintain by hand from here — the Docker build has no .git
 * (see .dockerignore), so nothing can recompute these at build time.
 */
const MARKETING_ROUTES: SitemapRoute[] = [
  { path: "/", lastmod: "2026-08-28", changeFrequency: "weekly", priority: 1.0 },
  { path: "/pricing", lastmod: "2026-09-04", changeFrequency: "monthly", priority: 0.9 },
  { path: "/about", lastmod: "2026-05-21", changeFrequency: "yearly", priority: 0.5 },
  { path: "/contact", lastmod: "2026-05-06", changeFrequency: "yearly", priority: 0.5 },
  { path: "/support", lastmod: "2026-06-22", changeFrequency: "monthly", priority: 0.5 },
];

/** Fallback dates for the product pages, keyed by PRODUCT_PAGES slug. */
const PRODUCT_LASTMOD: Record<string, string> = {
  "bid-matching": "2026-09-13",
  library: "2026-09-13",
  rfq: "2026-09-13",
  "supplier-stock": "2026-09-13",
  analytics: "2026-09-13",
};

/**
 * Fallback dates for help articles, keyed by HELP_ARTICLES slug. A new article
 * needs no entry here — it joins the sitemap the moment it is in the registry,
 * initially without a <lastmod>. Add its date here, or a `last_updated` to its
 * frontmatter, to give it one.
 */
const HELP_LASTMOD: Record<string, string> = {
  "getting-started": "2026-08-24",
  "bid-matching-profiles": "2026-08-17",
  "bid-matching-recipes": "2026-07-16",
  "solicitation-matching": "2026-09-16",
  "parts-search": "2026-09-16",
  "vendor-research": "2026-09-16",
  "supplier-stock": "2026-08-26",
  "procurement-analytics": "2026-08-17",
  "demand-intelligence": "2026-08-28",
  "requests-for-quote": "2026-08-15",
  "rfq-enterprise": "2026-08-25",
  "solicitations-and-contracts": "2026-08-28",
  "plans-and-pricing": "2026-08-28",
  "account-settings": "2026-09-16",
  "company-profile": "2026-09-07",
  notifications: "2026-08-27",
  faq: "2026-09-05",
};

/**
 * Legal pages. privacy/terms are markdown (their frontmatter `last_updated`
 * wins); /legal/cookies is a hand-built page, so its date lives here.
 *
 * Kept as its own list rather than read from the /legal/[slug] route because
 * that route's KNOWN_SLUGS covers only the two markdown docs — /legal/cookies
 * is a separate route file.
 */
const LEGAL_ROUTES: SitemapRoute[] = [
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/cookies", lastmod: "2026-08-25", changeFrequency: "yearly", priority: 0.3 },
];

/** Newest of a set of ISO dates, or undefined if none are present. */
function newest(dates: (string | undefined)[]): string | undefined {
  // ISO dates sort lexicographically, so no parsing needed.
  return dates.filter((d): d is string => Boolean(d)).sort().at(-1);
}

/**
 * Every indexable URL, in the order they appear in the sitemap.
 *
 * Deliberately EXCLUDED, though all remain crawlable — they are simply not
 * advertised as ranking targets:
 *   /login, /signup, /forgot-password, /reset-password, /verify-email
 *     — auth flows; /signup also renders per ?tier= / campaign query string,
 *       which would seed the index with thin duplicate variants.
 *   /contact/success — a post-submit thank-you page with nothing to rank.
 *   /start/* — paid-traffic campaign landings (src/lib/campaigns.ts). They
 *     exist to be linked from an ad or an email, and would otherwise compete
 *     with /pricing for the same organic query.
 */
export function publicRoutes(): SitemapRoute[] {
  const productRoutes: SitemapRoute[] = PRODUCT_PAGES
    // href: null means the page isn't written yet — it is a greyed-out card in
    // the nav, not a URL. Never hand a crawler a page that doesn't exist.
    .filter((p) => p.href !== null)
    .map((p) => ({
      path: p.href as string,
      lastmod: PRODUCT_LASTMOD[p.slug],
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  const helpRoutes: SitemapRoute[] = HELP_ARTICLES.map((a) => ({
    path: `/help/${a.slug}`,
    lastmod: HELP_LASTMOD[a.slug],
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Both index pages are generated FROM their registries, so each genuinely
  // changes the day a child is added or revised. Taking the newest child date
  // keeps them accurate with nothing to maintain.
  const productsIndex: SitemapRoute = {
    path: "/products",
    lastmod: newest(productRoutes.map((r) => r.lastmod)),
    changeFrequency: "monthly",
    priority: 0.9,
  };
  const helpIndex: SitemapRoute = {
    path: "/help",
    lastmod: newest(helpRoutes.map((r) => r.lastmod)),
    changeFrequency: "weekly",
    priority: 0.7,
  };

  return [
    ...MARKETING_ROUTES,
    productsIndex,
    ...productRoutes,
    helpIndex,
    ...helpRoutes,
    ...LEGAL_ROUTES,
  ];
}

/**
 * Path prefixes no crawler should follow, emitted as robots.txt `Disallow`.
 *
 * Two kinds, both pointless to crawl: the signed-in application (every one of
 * these renders an access-denied shell to a logged-out visitor, so crawling
 * them spends our budget to index nothing), and URLs that carry a single-use
 * token in the path or query — fetching those is not read-only.
 */
export const DISALLOWED_PREFIXES = [
  "/api/",
  // No trailing slashes: /account, /rfq and /dashboard are pages in their own
  // right, and a prefix without the slash covers the page AND everything under
  // it. (Disallow is a prefix match, so "/analytics" leaves the marketing page
  // at /products/analytics crawlable.)
  "/account",
  "/dashboard",
  "/analytics",
  "/bidmatching",
  "/library",
  "/rfq",
  "/reset-password",
  "/verify-email",
  "/contact/success",
] as const;

/**
 * Site-root-relative path -> absolute canonical URL. The home page keeps its
 * trailing slash (the origin serves "/", and a bare origin is a second spelling
 * of the same page); every other path has none, matching Next's default
 * `trailingSlash: false` routing.
 */
export function absoluteUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}
