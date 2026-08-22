import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import type { Metadata } from "next";
import {
  CAMPAIGN_SLUGS,
  parseCampaignFrontmatter,
  type CampaignFrontmatter,
} from "@/lib/campaigns";
import { fetchCatalog } from "@/lib/billing/catalog";
import { resolveOfferVariants, type OfferVariants } from "@/lib/billing/resolveOffer";
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
    title: campaign.frontmatter.meta_title ?? campaign.frontmatter.title,
    description: campaign.frontmatter.description,
  };
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await loadCampaign(slug);
  if (!campaign) notFound();

  const { frontmatter, content } = campaign;

  // Two different failures, handled two different ways:
  //   - catalog unreachable  → no offers, the page renders and points at
  //     /pricing. A billing blip shouldn't fail the deploy.
  //   - catalog fine but the campaign names a product/interval that isn't
  //     there → this throws, which is what we want: that's a typo in the
  //     markdown, and a 500 on the campaign page is a far louder signal than
  //     quietly serving one with the price missing.
  const plans = await fetchCatalog(CATALOG_TTL_SECONDS);
  let offers: OfferVariants = {};
  if (plans) {
    // Every interval the product sells is priced here, not just the campaign's
    // default, so ?interval= can switch between them client-side without
    // another catalog round trip.
    offers = resolveOfferVariants(plans, frontmatter.offer_product, frontmatter.offer_seats);
    if (!offers[frontmatter.offer_interval]) {
      const sold = Object.keys(offers).join(", ") || "none";
      throw new Error(
        `src/content/campaigns/${slug}.md: offer_interval is ` +
          `"${frontmatter.offer_interval}", but "${frontmatter.offer_product}" ` +
          `only sells: ${sold}.`,
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
      title={frontmatter.title}
      eyebrow={frontmatter.eyebrow}
      ctaLabel={frontmatter.cta_label}
      content={content}
      offers={offers}
      defaultInterval={frontmatter.offer_interval}
    />
  );
}
