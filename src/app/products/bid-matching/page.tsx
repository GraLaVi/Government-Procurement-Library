import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ProductHero,
  ProductSteps,
  ProductDemoSection,
  ProductDetail,
  ProductTiers,
  ProductCTA,
} from "@/components/products/ProductSections";
import { LiveVolumeProof } from "@/components/products/LiveVolumeProof";
import { BidMatchingDemo } from "@/components/products/BidMatchingDemo";
import { resolveDemoBidMatching } from "@/lib/demo/bidMatching";

export const metadata: Metadata = {
  title: "Bid-Matching | Government Procurement Hub",
  description:
    "Tell GPH what you sell and it reads every new DIBBS and SAM.gov solicitation for you, every day — and tells you why each one matched. Try the live mock-up.",
};

// The demo's dates are resolved against the server's clock at request time, so
// the page must not be frozen at build time — a prerendered copy would still
// be advertising the build date's match run months later. The rest of the page
// is static copy, so this costs nothing but the render.
export const dynamic = "force-dynamic";

export default function BidMatchingProductPage() {
  const demo = resolveDemoBidMatching(new Date().toISOString());

  return (
    <>
      <Navbar />
      <main>
        <ProductHero
          eyebrow="Bid-Matching"
          title={
            <>
              Stop reading solicitations.
              <span className="mt-3 block text-primary">
                Read the ones that are yours.
              </span>
            </>
          }
          lede="Describe what you sell once — the NSNs you stock, the CAGE codes you're an approved source for, the families you compete in — and GPH checks every new DIBBS and SAM.gov posting against it, every day. You get a list with the reason attached to each row."
          proof={<LiveVolumeProof />}
          primaryCta={{ href: "/signup?tier=free", label: "Start free" }}
          secondaryCta={{ href: "#demo", label: "Try the mock-up" }}
        />

        <ProductSteps
          steps={[
            {
              title: "Describe what you sell",
              body:
                "A profile is a set of conditions: NSNs and NIINs, CAGE codes, FSC families, NAICS codes, set-asides, or plain keywords in the item description. Stack as many as you need, and exclude what you never want to see.",
            },
            {
              title: "The engine reads the day's postings",
              body:
                "Every new DIBBS and SAM.gov solicitation is checked against every active profile in your organization, once a day, including the ones that arrived late or were quietly amended into a match.",
            },
            {
              title: "Matches arrive with their reason",
              body:
                "Each row says which profile fired and which condition did it, so you can tell an exact part hit from a family hit at a glance — and act on the first without wading through the second.",
            },
          ]}
        />

        <ProductDemoSection
          title="This is the screen you get."
          lede="Not a screenshot — the real results table, running on a day's worth of sample matches. Click a tour below, or sort, filter, search and expand rows the way you would in your own account."
        >
          <BidMatchingDemo data={demo} />
        </ProductDemoSection>

        <ProductDetail
          title="The parts that matter once you're using it"
          lede="Everything above is the shape of the product. This is the detail that decides whether it works for your shop."
          items={[
            {
              q: "What can a profile actually match on?",
              a: (
                <>
                  <p>
                    Exact part identity — NSN or NIIN — and CAGE code, for the parts you
                    stock and the items you are already an approved source for. Those
                    produce <strong>hard hits</strong>.
                  </p>
                  <p>
                    Family and market conditions — FSC, NAICS, set-aside code, keywords
                    in the item description, technical characteristics and end-use text
                    — produce <strong>soft hits</strong>: worth a look, not worth
                    dropping everything for.
                  </p>
                  <p>
                    Conditions stack, and any of them can be negated. &ldquo;FSC 4820,
                    but never a kit&rdquo; is one profile, and the row that matches shows
                    you both halves of that rule.
                  </p>
                </>
              ),
            },
            {
              q: "How fast do I hear about a match?",
              a: (
                <>
                  <p>
                    Matching runs daily, after each day&rsquo;s ingestion from DIBBS and
                    SAM.gov. How quickly you are told depends on your plan: weekly digests
                    on Free, daily on Basic, and immediately on Advanced.
                  </p>
                  <p>
                    Matches also land in the in-app notification bell, so you see them
                    without going looking, and you choose how they are grouped.
                  </p>
                </>
              ),
            },
            {
              q: "What happens when a solicitation changes?",
              a: (
                <>
                  <p>
                    Buyers amend solicitations constantly — a revised quantity, an added
                    line item, a set-aside that flips. Two things follow from that.
                  </p>
                  <p>
                    A solicitation that did not match you before can match you after an
                    amendment, and GPH surfaces it on the run that noticed. And a
                    solicitation you have already been matched on gets flagged when it
                    changes underneath you, so you are not quoting against a superseded
                    version. Amended rows carry a pill that opens the full change history.
                  </p>
                </>
              ),
            },
            {
              q: "Why are there two dates on every run?",
              a: (
                <>
                  <p>
                    The <strong>run date</strong> is when GPH found it for you. The{" "}
                    <strong>posted date</strong> is when the government put it on the
                    street. Most of a day&rsquo;s run was posted that same day, but not
                    all of it: DIBBS and SAM.gov routinely publish late, so a run brings
                    in solicitations dated days or weeks earlier.
                  </p>
                  <p>
                    That is why the date picker nests posted dates under each run — and
                    why a late arrival is still a first match, not a repeat. Once
                    you&rsquo;ve been matched on a solicitation, it will not be surfaced
                    to you again.
                  </p>
                </>
              ),
            },
            {
              q: "Does it cover SAM.gov, or only DLA?",
              a: (
                <>
                  <p>
                    Both. The same profiles run against SAM.gov postings, and each
                    run&rsquo;s SAM matches sit in their own bucket beside the DIBBS ones.
                  </p>
                  <p>
                    SAM postings are not all biddable — presolicitations and sources-sought
                    notices are announcements, not opportunities to quote. GPH badges those
                    as what they are and lets you hide them in one click, rather than
                    padding your match count with things you cannot bid on.
                  </p>
                </>
              ),
            },
            {
              q: "Can a whole team work off the same matches?",
              a: (
                <>
                  <p>
                    Yes. Profiles belong to the organization, not to one login, and the
                    flag on a row is shared — when someone stars a solicitation to come
                    back to, everyone sees it. The number of profiles you can run and
                    how much solicitation detail each match carries are what differ by
                    plan.
                  </p>
                </>
              ),
            },
            {
              q: "What do I do with a match once I have one?",
              a: (
                <>
                  <p>
                    Expand it for the bid terms — quality requirements, inspection point,
                    Buy American, first-article, the DLA priority rating — which decide
                    whether the item is worth quoting before the price does. The
                    solicitation PDF opens in-app.
                  </p>
                  <p>
                    From there, the part links into the{" "}
                    <Link href="/library/parts" className="font-medium text-primary hover:underline">
                      parts library
                    </Link>{" "}
                    for award history and competitors, and into RFQs if you want to price
                    it out with your vendors without leaving the platform.
                  </p>
                </>
              ),
            },
          ]}
        />

        <ProductTiers
          title="Bid-matching is on every plan, including the free one."
          note="Priced per user with volume discounts for teams."
          tiers={[
            {
              tier: "Free",
              blurb: "One profile, so you can see whether the matches are any good.",
              features: [
                "1 bid-matching profile",
                "Match alerts without full solicitation detail",
                "Weekly notifications",
                "3 users",
              ],
            },
            {
              tier: "Basic",
              blurb: "Enough profiles to cover a real product line.",
              features: [
                "5 profiles, with the full solicitation view",
                "Daily notifications",
                "Full parts and vendor detail behind every match",
              ],
            },
            {
              tier: "Advanced",
              blurb: "The whole picture, the moment it lands.",
              features: [
                "Bid-matching profiles with the full solicitation view",
                "Immediate notifications",
                "Full procurement history and open solicitation intelligence",
                "Saved searches, pinned items and CSV exports",
              ],
              highlighted: true,
            },
          ]}
        />

        <ProductCTA
          title="Your first profile takes about two minutes."
          body="Start on the free tier, point one profile at the parts you know best, and see what the next run turns up. No card required."
          primaryCta={{ href: "/signup?tier=free", label: "Start free" }}
          secondaryCta={{ href: "/pricing", label: "See pricing" }}
        />
      </main>
      <Footer />
    </>
  );
}
