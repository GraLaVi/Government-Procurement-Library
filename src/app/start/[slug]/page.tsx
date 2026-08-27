import { promises as fs } from "node:fs";
import path from "node:path";
import { after } from "next/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import type { Metadata } from "next";
import { recordCampaignLanding } from "@/lib/campaignLanding";
import {
  CAMPAIGN_SLUGS,
  getCampaign,
  parseCampaignFrontmatter,
  resolveCampaignTitle,
  type CampaignFrontmatter,
} from "@/lib/campaigns";
import { fetchCatalog } from "@/lib/billing/catalog";
import { resolveBundleVariants, type BundleVariants } from "@/lib/billing/resolveOffer";
import { CampaignLanding } from "@/components/campaign/CampaignLanding";

// Rendered per request, NOT prerendered at build.
//
// The tempting setup is SSG + ISR, and it's wrong here. Prerendering bakes
// the price in at build time, so a build host that can't reach the billing
// service (the Docker build runs against INTERNAL_API_URL, which is not
// reachable from every environment) ships a campaign page with no price on
// it — and ISR would then serve that stale, priceless page for a full
// revalidate window after every deploy. A campaign page without a price is
// the exact failure this whole route exists to prevent.
//
// Rendering per request removes the build-time dependency entirely. It isn't
// expensive: the catalog fetch below is cached in the Data Cache for an hour,
// so this costs one upstream call per hour, not one per visitor.
export const dynamic = "force-dynamic";

/** How long a fetched catalog stays warm in the Data Cache. */
const CATALOG_TTL_SECONDS = 3600;

async function loadCampaign(
  slug: string,
): Promise<{ frontmatter: CampaignFrontmatter; content: string } | null> {
  if (!CAMPAIGN_SLUGS.includes(slug)) return null;
  const filePath = path.join(process.cwd(), "src", "content", "campaigns", `${slug}.md`);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    // Listed in the registry but the file is missing — a half-finished
    // launch. 404 rather than crash; the registry entry is the thing to fix.
    console.error(`[campaign] "${slug}" is registered but ${filePath} does not exist.`);
    return null;
  }
  const parsed = matter(raw);
  // Throws on malformed frontmatter — see parseCampaignFrontmatter. A campaign
  // that can't say what it's selling must not render.
  const frontmatter = parseCampaignFrontmatter(slug, parsed.data as Record<string, unknown>);
  return { frontmatter, content: parsed.content.trim() };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await loadCampaign(slug);
  if (!campaign) return {};
  return {
    // Metadata is generated without the catalog, so a title leading with the
    // trial offer has no figure to interpolate — resolveCampaignTitle falls
    // back to the campaign's no-trial headline rather than leaking the
    // placeholder into a <title>. Campaigns that care set meta_title anyway.
    title:
      campaign.frontmatter.meta_title ??
      resolveCampaignTitle(campaign.frontmatter, null),
    description: campaign.frontmatter.description,
  };
}

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const campaign = await loadCampaign(slug);
  if (!campaign) notFound();

  // Count the landing server-side, after the response is sent. GA4 can't do
  // this job — it stays unloaded until the visitor accepts the cookie
  // banner, so it never sees the ones who decline or ignore it, which on
  // cold campaign traffic is most of them. Runs only for a real campaign
  // page (after the notFound above), and never delays the render.
  const query = await searchParams;
  // Read the request headers HERE, in request scope — inside after() the
  // request APIs are gone, and the failure is silent (the logger swallows
  // its own errors so a marketing page can't 500 over a metric).
  const headerList = await headers();
  const requestInfo = {
    referrer: headerList.get("referer") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
  after(() => recordCampaignLanding(slug, query, requestInfo));

  const { frontmatter, content } = campaign;

  // Two different failures, handled two different ways:
  //   - catalog unreachable  → no offers, the page renders and points at
  //     /pricing. A billing blip shouldn't fail the deploy.
  //   - catalog fine but the campaign names a product/interval that isn't
  //     there → this throws, which is what we want: that's a typo in the
  //     markdown, and a 500 on the campaign page is a far louder signal than
  //     quietly serving one with the price missing.
  const plans = await fetchCatalog(CATALOG_TTL_SECONDS);

  // A single-product campaign is a basket of one, so the page only ever has
  // one shape to render. `basket` (from the registry) wins when present; the
  // markdown's offer_product covers every campaign that sells one thing.
  const basket = getCampaign(slug)?.basket;
  const productKeys = basket
    ? [basket.tierProductKey, ...basket.addonProductKeys]
    : [frontmatter.offer_product!];

  let offers: BundleVariants = {};
  if (plans) {
    // Every interval the basket sells is priced here, not just the campaign's
    // default, so ?interval= can switch between them client-side without
    // another catalog round trip. For a multi-product basket that set is the
    // INTERSECTION — one Stripe subscription has one billing cycle.
    offers = resolveBundleVariants(plans, productKeys, frontmatter.offer_seats);
    if (!offers[frontmatter.offer_interval]) {
      const sold = Object.keys(offers).join(", ") || "none";
      throw new Error(
        `src/content/campaigns/${slug}.md: offer_interval is ` +
          `"${frontmatter.offer_interval}", but ${productKeys.map((k) => `"${k}"`).join(" + ")} ` +
          `${productKeys.length > 1 ? "share only these intervals" : "only sells"}: ${sold}.`,
      );
    }
  } else {
    console.error(
      `[campaign] Rendering "${slug}" without live pricing — the billing ` +
        `service was unreachable.`,
    );
  }

  return (
    <CampaignLanding
      slug={slug}
      title={frontmatter.title}
      titleNoTrial={frontmatter.title_no_trial}
      eyebrow={frontmatter.eyebrow}
      ctaLabel={frontmatter.cta_label}
      content={content}
      offers={offers}
      defaultInterval={frontmatter.offer_interval}
      isBasket={Boolean(basket)}
    />
  );
}
