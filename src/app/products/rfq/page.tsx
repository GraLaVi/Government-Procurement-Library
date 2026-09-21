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
import { RfqDemo } from "@/components/products/RfqDemo";
import { RfqWorklistDemo } from "@/components/products/RfqWorklistDemo";
import { resolveDemoRfq } from "@/lib/demo/rfq";
import { resolveDemoWorklist } from "@/lib/demo/rfqWorklist";

export const metadata: Metadata = {
  title: "Request for Quote | Government Procurement Hub",
  description:
    "Send structured RFQs to manufacturers and your own vendors from any part, collect every quote on one record, price the winner to the government, and see what's ready to bid. Try the live mock-up.",
};

// The demo's dates are resolved against the server's clock at request time, so
// the page must not be frozen at build time — a prerendered copy would still
// be showing the build date's bid deadlines months later.
export const dynamic = "force-dynamic";

export default function RfqProductPage() {
  const now = new Date().toISOString();
  const demo = resolveDemoRfq(now);
  const worklist = resolveDemoWorklist(now);

  return (
    <>
      <Navbar />
      <main>
        <ProductHero
          eyebrow="Request for Quote"
          title={
            <>
              Get vendor quotes
              <span className="mt-3 block text-primary">without the inbox archaeology.</span>
            </>
          }
          lede="Start an RFQ from any part, send it to the manufacturers and your own vendors in one step, and collect every quote as structured lines — unit price, lead time, alternates — on one record. Price the winner to the government right there, and the pipeline tells you what is ready to bid."
          primaryCta={{ href: "/pricing#add-ons", label: "See the add-on" }}
          secondaryCta={{ href: "#demo", label: "Try the mock-up" }}
        />

        <ProductSteps
          steps={[
            {
              title: "Pick the part and the vendors",
              body:
                "From a part's Manufacturers tab, or from a matched solicitation in the work queue, tick the vendors to ask. Saved contacts and SAM.gov addresses pre-fill; quantities and units come from the part. Send now, or stage it in the team's batch.",
            },
            {
              title: "Vendors quote on a private link",
              body:
                "Each vendor gets an email with a link to a response form — no account needed. They fill in price, quantity available, lead time, alternates or a no-bid, per line. GPH reminds them before the due date, and marks the RFQ stale if the window passes.",
            },
            {
              title: "Price it, bid it, track it",
              body:
                "Quotes land on the RFQ's record as structured lines. Add your markup and shipping to reach a price to government, mark the bid sent, and the pipeline shows every RFQ your team has out and whether it is ready.",
            },
          ]}
        />

        <ProductDemoSection
          title="This is the pipeline you get."
          lede="Not a screenshot — the real RFQ Pipeline and the real RFQ record, running on a team's worth of sample requests. Click a tour below, or sort, filter, move a progress pill and open a record the way you would in your own account."
        >
          <RfqDemo data={demo} />
        </ProductDemoSection>

        <ProductDemoSection
          id="enterprise-demo"
          badge="RFQ Enterprise add-on only"
          title="Enterprise adds the queue in front of the pipeline."
          lede="The Send RFQs page is where a buying team starts: every matched solicitation, routed to the buyer who owns its approved-source CAGE, with claiming, progress and quotes in one place. This is the real queue's row anatomy on sample data — expand a row, claim one, move a pill."
        >
          <RfqWorklistDemo data={worklist} />
        </ProductDemoSection>

        <ProductDetail
          title="The parts that matter once you're using it"
          lede="Everything above is the shape of the product. This is the detail that decides whether it fits how your shop buys."
          items={[
            {
              q: "What does the vendor actually see?",
              a: (
                <>
                  <p>
                    An email with your company name, the RFQ reference and a private link.
                    The link opens a response page listing each line you asked about —
                    NSN, part number, description, quantity, need-by date — with fields
                    for unit price, quantity available, lead time, an alternate part, a
                    per-line note and a no-bid box. They can also decline the whole
                    request in one click.
                  </p>
                  <p>
                    No login is required to answer. A vendor who wants to keep track of
                    the RFQs sent to them can create a free account from that page and see
                    them under Received RFQs.
                  </p>
                </>
              ),
            },
            {
              q: "Why are there two due dates?",
              a: (
                <>
                  <p>
                    <strong>Bid due</strong> is the government&rsquo;s deadline — the
                    solicitation&rsquo;s close date. <strong>Quote due</strong> is the
                    vendor&rsquo;s deadline to you. It is normally earlier so you have time
                    to price the bid, and on the Enterprise add-on it pre-fills from the
                    close date minus a lead time you configure.
                  </p>
                  <p>
                    GPH sends vendors up to two reminders before the quote is due. After
                    it passes with no answer the RFQ reads Stale, and if auto-close is on
                    it is closed for you after a grace period.
                  </p>
                </>
              ),
            },
            {
              q: "What does 'progress' track, and why is it shared?",
              a: (
                <>
                  <p>
                    Progress belongs to the solicitation, not the RFQ. One solicitation
                    quoted to three vendors is three RFQs, but it is one bid — so all
                    three rows share a single value, and moving it on any of them moves
                    the others. The control tells you how many it covers.
                  </p>
                  <p>
                    Two transitions are automatic: sending an RFQ marks the solicitation
                    RFQ Sent, and the first quote back marks it Quotes In. Priced, Bid
                    sent, No Bid and Passed are yours to set, so the whole team can see
                    what is done.
                  </p>
                </>
              ),
            },
            {
              q: "What does the Enterprise add-on add?",
              a: (
                <>
                  <p>
                    A work queue — the{" "}
                    <Link href="#enterprise-demo" className="font-medium text-primary hover:underline">
                      second mock-up above
                    </Link>
                    . Your bid-matching results become a Send RFQs page,
                    disbursed to buyers by the approved-source CAGEs each one owns, with
                    claiming so two people never work the same solicitation and an
                    unassigned pool that nobody can lose track of.
                  </p>
                  <p>
                    From the queue, Get quotes suggests vendors from your own private
                    vendor book — matched on the NSNs, CAGEs, supply classes and keywords
                    you have recorded for them — alongside the part&rsquo;s manufacturers.
                    Quotes come back into a side-by-side comparison per item, with the
                    best price highlighted and a Price button that builds the price to
                    government. A Coverage page shows what is falling through: closing
                    soon and unworked, in flight and stalled, quotes overdue.
                  </p>
                </>
              ),
            },
            {
              q: "Can I quote from my own stock?",
              a: (
                <>
                  <p>
                    Yes, on Enterprise, if your company uploads its inventory to GPH. A
                    solicitation whose parts are on your shelf shows how many, and a Use
                    my stock button creates a priced quote from your own cost and
                    markup — no vendor contacted, no email sent. Quote part of the
                    quantity from stock and RFQ vendors for the rest, then compare them
                    together.
                  </p>
                </>
              ),
            },
            {
              q: "How does a team work in it?",
              a: (
                <>
                  <p>
                    RFQs, the batch cart, the contact book and progress all belong to the
                    organization. Anyone can see every RFQ and filter to a teammate&rsquo;s;
                    the batch shows who staged what; Updated-by says who last touched a
                    row. Response alerts go to the creator or the whole team, by bell or
                    email, as you choose.
                  </p>
                  <p>
                    Admins decide who may edit the vendor book, whether overdue RFQs
                    auto-close, and the default response window. The{" "}
                    <Link href="/help/requests-for-quote" className="font-medium text-primary hover:underline">
                      help article
                    </Link>{" "}
                    covers every screen, and the{" "}
                    <Link href="/help/rfq-enterprise" className="font-medium text-primary hover:underline">
                      Enterprise guide
                    </Link>{" "}
                    covers the work queue.
                  </p>
                </>
              ),
            },
          ]}
        />

        <ProductTiers
          title="Two add-ons, on any paid plan."
          note="Add-on seats are priced per user."
          tiers={[
            {
              tier: "Vendors you send to",
              blurb: "Nothing to buy, nothing to install.",
              features: [
                "Private response link in the invitation email",
                "Structured quote form: price, quantity, lead time, alternates, no-bid",
                "Reminders before the due date, and a one-click decline",
                "Optional free account to track received RFQs",
              ],
            },
            {
              tier: "RFQ Add-on",
              blurb: "Send, collect and track, from any part.",
              features: [
                "RFQs from a part's Manufacturers tab, one per vendor",
                "Shared batch cart for sending later, together",
                "Private vendor contact book",
                "The RFQ Pipeline: status, progress and ready-to-bid",
                "Buyer pricing to government on every quoted line",
              ],
            },
            {
              tier: "RFQ Enterprise Add-on",
              blurb: "Everything in the RFQ add-on, plus the queue.",
              features: [
                "Send RFQs work queue, disbursed to buyers by CAGE, with claiming",
                "Private vendor lists with capabilities and suggested vendors",
                "Side-by-side quote comparison per item",
                "Vendor responsiveness and coverage reporting",
                "Quote from your own uploaded stock",
              ],
              highlighted: true,
            },
          ]}
        />

        <ProductCTA
          title="Your next RFQ takes about a minute."
          body="Add the RFQ add-on to any paid plan and start from the part you are quoting today. Vendors need nothing but the email."
          primaryCta={{ href: "/pricing#add-ons", label: "See pricing" }}
          secondaryCta={{ href: "/signup?tier=free", label: "Start free" }}
        />
      </main>
      <Footer />
    </>
  );
}
