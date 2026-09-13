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
import { AnalyticsDemo } from "@/components/products/AnalyticsDemo";
import { resolveDemoAnalytics } from "@/lib/demo/analytics";

export const metadata: Metadata = {
  title: "Procurement Analytics | Government Procurement Hub",
  description:
    "Your win rate, your competitors, what a winning price looks like on your parts, and what DLA is about to buy — one dashboard built from the government's own data. Try the live mock-up.",
};

// The demo's dates are resolved against the server's clock at request time, so
// the page must not be frozen at build time — a prerendered copy would still
// be advertising the build date's "closing in 3 days" months later.
export const dynamic = "force-dynamic";

export default function AnalyticsProductPage() {
  const demo = resolveDemoAnalytics(new Date().toISOString());

  return (
    <>
      <Navbar />
      <main>
        <ProductHero
          eyebrow="Procurement Analytics"
          title={
            <>
              Bid on evidence,
              <span className="mt-3 block text-primary">not instinct.</span>
            </>
          }
          lede="Procurement Analytics turns the government's own data — awards, solicitations, DLA's demand forecasts and stock levels — into one dashboard about your business: what closes this week, what a winning price looks like on your parts, who keeps beating you, and which parts are worth getting qualified on next."
          primaryCta={{ href: "/pricing#add-ons", label: "See the add-on" }}
          secondaryCta={{ href: "#demo", label: "Try the mock-up" }}
        />

        <ProductSteps
          steps={[
            {
              title: "It starts from your CAGE",
              body:
                "Everything about your business is keyed to your CAGE code: the awards you have won, the parts on them, and the solicitations open on those parts today. There is nothing to upload and nothing to configure.",
            },
            {
              title: "The dashboard builds itself",
              body:
                "Five tabs, from the most urgent to the widest view — what to act on now, what to pursue next, what you are up against, whether your matching is tuned, and the market as a whole. Every number says where it came from.",
            },
            {
              title: "You act on signals, not hunches",
              body:
                "A part on DLA backorder, a competitor's winning price, a profile that has gone quiet. Each one is a decision you can make today, and the bell tells you when DLA flags one of your parts for a buy.",
            },
          ]}
        />

        <ProductDemoSection
          title="This is the dashboard you get."
          lede="Not a screenshot — the real analytics widgets, running on sample data for a fictional supplier. Click a tour below, or work through the tabs the way you would in your own account."
        >
          <AnalyticsDemo data={demo} />
        </ProductDemoSection>

        <ProductDetail
          title="The parts that matter once you're using it"
          lede="Everything above is the shape of the product. This is the detail that decides whether it earns its seat."
          items={[
            {
              q: "Where do the winning prices come from?",
              a: (
                <>
                  <p>
                    From DIBBS award history: every award on each of your parts over the
                    trailing twelve months, with the unit price that won. The benchmark
                    shows the minimum, median and maximum, draws the range, and ranks your
                    parts by how often they are awarded.
                  </p>
                  <p>
                    The demand tag beside each row comes from DLA&rsquo;s own forecast data
                    and says whether the part is bought repeatedly or was likely a one-off.
                    A recurring part is worth defending on price; a one-off usually is not.
                  </p>
                </>
              ),
            },
            {
              q: "What is a buy signal, exactly?",
              a: (
                <>
                  <p>
                    DLA publishes its on-hand stock, reorder points and backorder
                    quantities monthly. A buy signal is one of your parts where that data
                    shows a backorder, or stock below the reorder point that triggers
                    DLA&rsquo;s replenishment. It is the government&rsquo;s own trigger,
                    not our prediction.
                  </p>
                  <p>
                    The same data appears on every part record as a Demand &amp; Stock
                    tab, and when one of your parts trips a signal the notification bell
                    tells you, linking straight to the widget.
                  </p>
                </>
              ),
            },
            {
              q: "What does market prioritization actually rank?",
              a: (
                <>
                  <p>
                    Parts <strong>outside</strong> your current catalog, in Federal Supply
                    Classes where you already have award history, that DLA is flagging for
                    a near-term buy. Each is ranked by estimated order value — the
                    forecast quantity times what the item has recently sold for.
                  </p>
                  <p>
                    Read it as a prospecting list: things you are already credible on,
                    that the government is about to need, in the order they are worth
                    getting qualified for.
                  </p>
                </>
              ),
            },
            {
              q: "How does it tell me my bid-matching is mistuned?",
              a: (
                <>
                  <p>
                    The Bid Matching tab reads your own results. Profile health flags a
                    profile as dormant when it has stopped matching, and as over-broad
                    when it matches far more than the others — the two failure modes
                    that make people stop reading their matches.
                  </p>
                  <p>
                    Match trend and the hard-versus-soft split over thirty days show the
                    shape of what the profiles produce, and the condition-type chart shows
                    which conditions are doing the work, so a fix is a matter of editing
                    the right profile rather than guessing.
                  </p>
                </>
              ),
            },
            {
              q: "How fresh are the numbers?",
              a: (
                <>
                  <p>
                    Market Pulse is shared by every customer and refreshes every few
                    minutes. Your own figures refresh about once a minute while the page
                    is open. DLA&rsquo;s demand and stock data is published monthly, so
                    buy signals carry an as-of date and lag reality by a few weeks.
                  </p>
                  <p>
                    Every figure is derived from published government data. Forecasts and
                    buy signals raise or lower the probability of a solicitation; none of
                    them guarantee one.
                  </p>
                </>
              ),
            },
            {
              q: "What do I need to have to use it?",
              a: (
                <>
                  <p>
                    An Advanced plan and an Analytics seat. The add-on is assigned per
                    user, so a team can give the dashboard to the person who prices bids
                    without buying it for everyone. Your account also needs a CAGE code on
                    file, since that is what your business figures are keyed to.
                  </p>
                  <p>
                    Two of the headline cards — open matched solicitations and
                    competitors on your parts — come with the Advanced plan on its own;
                    the rest of the dashboard is the add-on. Bid-matching health needs
                    bid-matching profiles to read, which every plan has. The{" "}
                    <Link href="/help/procurement-analytics" className="font-medium text-primary hover:underline">
                      help article
                    </Link>{" "}
                    walks every widget.
                  </p>
                </>
              ),
            },
          ]}
        />

        <ProductTiers
          title="Analytics is an add-on seat on the Advanced plan."
          note="Add-on seats are priced per user."
          tiers={[
            {
              tier: "Free and Basic",
              blurb: "The data the dashboard is built from.",
              features: [
                "Parts and vendor lookup with award history",
                "Bid-matching profiles and results",
                "Solicitations closing soonest on your parts",
              ],
            },
            {
              tier: "Advanced",
              blurb: "The plan the add-on sits on.",
              features: [
                "Open matched solicitations and competitor count on your dashboard",
                "Full procurement history and open solicitation intelligence",
                "Saved searches, pinned items and CSV exports",
              ],
            },
            {
              tier: "Advanced + Analytics seat",
              blurb: "The whole dashboard, per user.",
              features: [
                "Winning price benchmarks, competitor leaderboard and set-aside win rate",
                "Buy signals and the Demand & Stock tab on every part",
                "Market prioritization — parts worth getting qualified on",
                "Bid-matching health and amendment alerts",
                "Bell alerts when DLA flags one of your parts for a buy",
              ],
              highlighted: true,
            },
          ]}
        />

        <ProductCTA
          title="See what the data says about your shop."
          body="Analytics is assigned per user, so one seat is enough to find out. Already on Advanced? Add it from your billing page."
          primaryCta={{ href: "/pricing#add-ons", label: "See pricing" }}
          secondaryCta={{ href: "/signup?tier=free", label: "Start free" }}
        />
      </main>
      <Footer />
    </>
  );
}
