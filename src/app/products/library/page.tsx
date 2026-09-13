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
import { LibraryDemo } from "@/components/products/LibraryDemo";
import { resolveDemoLibrary } from "@/lib/demo/library";

export const metadata: Metadata = {
  title: "Parts & Vendor Library | Government Procurement Hub",
  description:
    "Look up any NSN or CAGE: identifiers, manufacturers, technical characteristics, award history, open solicitations, and who is competing on it. Try the live mock-up on real catalog data.",
};

// The Supplier Stock tab's as-of dates are offsets resolved against the
// server's clock at request time, like the other demos.
export const dynamic = "force-dynamic";

export default function LibraryProductPage() {
  const demo = resolveDemoLibrary(new Date().toISOString());

  return (
    <>
      <Navbar />
      <main>
        <ProductHero
          eyebrow="Parts & Vendor Library"
          title={
            <>
              Every part. Every vendor.
              <span className="mt-3 block text-primary">Everything the government knows about them.</span>
            </>
          }
          lede="Type an NSN, a part number, a solicitation, a contract number or a CAGE code, and get the whole record: what the item is, who makes it, what it has sold for, what is open on it right now, and what the vendor behind any award looks like in SAM. Free to start, deeper by plan."
          primaryCta={{ href: "/signup?tier=free", label: "Start free" }}
          secondaryCta={{ href: "#demo", label: "Try the mock-up" }}
        />

        <ProductSteps
          steps={[
            {
              title: "Search the way you already think",
              body:
                "NSN or NIIN, solicitation number, manufacturer part number, contract number, or a plain description for parts; CAGE, UEI or company name for vendors. Recent searches stay a click away, and on Advanced you can pin the ones you run every week.",
            },
            {
              title: "Open the record",
              body:
                "A part record is one page with tabs: overview and codes, manufacturers, technical characteristics, end use, packaging, procurement history, open solicitations, supplier stock. A vendor record is SAM demographics, contacts, recent awards, monthly bookings by DLA center, and open solicitations.",
            },
            {
              title: "Act from it",
              body:
                "Open the solicitation PDF in place. Send the manufacturers an RFQ. Follow a CAGE into its profile and back. Export the table to CSV. Everything else on GPH — matching, RFQs, analytics — is built on these records.",
            },
          ]}
        />

        <ProductDemoSection
          title="This is the library you get."
          lede="Not a screenshot — the real search bar, results tables and record panels, running on a real part and a real vendor pulled from the catalog. Click a tour, or search, open and tab through the way you would in your own account."
        >
          <LibraryDemo data={demo} />
        </ProductDemoSection>

        <ProductDetail
          title="The parts that matter once you're using it"
          lede="Everything above is the shape of the product. This is the detail that decides whether it replaces the six browser tabs you have open now."
          items={[
            {
              q: "What exactly is on a part record?",
              a: (
                <>
                  <p>
                    <strong>Overview</strong> — NSN, NIIN and FSC, description, unit of issue,
                    the government&rsquo;s standard price, and the codes that decide how DLA
                    buys the item: buy type, acquisition method, place of inspection, shelf
                    life. Each code is explained on hover and links to the full definitions.
                  </p>
                  <p>
                    <strong>Manufacturers</strong> — every source on the item with its part
                    number, whether it is an approved source, and its SAM status.{" "}
                    <strong>Characteristics</strong>, <strong>End Use</strong> and{" "}
                    <strong>Procurement Item Description</strong> — what it is made of, what
                    platforms it goes on, and the full procurement description with its
                    mil-specs and drawing references. <strong>Packaging</strong> — the
                    MIL-STD-2073 codes and the narrative requirements.
                  </p>
                  <p>
                    <strong>Procurement History</strong> — every award on the part: contract,
                    date, winner, quantity, unit price. <strong>Solicitations</strong> — what
                    is open and recently closed, with set-aside, quantity, estimated value,
                    buyer contact, the PDF, and an amendment timeline. <strong>Supplier
                    Stock</strong> — your own inventory on the part and what other suppliers
                    have shared.
                  </p>
                </>
              ),
            },
            {
              q: "And on a vendor record?",
              a: (
                <>
                  <p>
                    <strong>Demographics</strong> from SAM — registration and exclusion
                    status, expiry, entity structure, state of incorporation, certifications
                    the vendor has published, physical and mailing addresses with the
                    congressional district. <strong>Contacts</strong> — the registered
                    points of contact by role.
                  </p>
                  <p>
                    <strong>Recent Awards</strong> — what they have won, newest first, with
                    NSN, quantity and unit price. <strong>Contracts Booked</strong> — a
                    thirteen-month view of their award dollars by DLA distribution center,
                    with their rank at each center each month. <strong>Open
                    Solicitations</strong> — what they are positioned to bid on right now,
                    which is the fastest read on a competitor there is.
                  </p>
                </>
              ),
            },
            {
              q: "Where does the data come from, and how fresh is it?",
              a: (
                <>
                  <p>
                    DIBBS solicitations and awards, SAM.gov opportunities and entity
                    registrations, and the federal logistics catalog, ingested continuously.
                    Open solicitations and new awards land the day they publish; SAM
                    registration data refreshes on SAM&rsquo;s own schedule. Every table says
                    where it came from.
                  </p>
                </>
              ),
            },
            {
              q: "What does a solicitation number do when I click it?",
              a: (
                <>
                  <p>
                    Three things live on every solicitation and contract row. The number
                    runs a search for the parts on it. The document icon opens the
                    government&rsquo;s PDF in an in-app viewer with search, zoom and download.
                    The Amended pill opens the change history — what changed, when, and the
                    old value struck through — so you are never quoting a superseded version.
                  </p>
                  <p>
                    Rows also carry the DLA type indicators: a green lightning bolt for a
                    fast-award candidate that can be awarded before the return date, and IDC
                    for an automated indefinite-delivery contract where quotes must hold
                    ninety days or more.
                  </p>
                </>
              ),
            },
            {
              q: "Can I get the data out?",
              a: (
                <>
                  <p>
                    On Advanced, every table exports to CSV — search results, procurement
                    history, solicitations, manufacturers, a vendor&rsquo;s awards and bookings
                    — and the export carries a few fields the screen does not show, such as
                    a solicitation&rsquo;s DPAS rating and source agency. A one-page layout
                    with print and export-all is a preference away. For anything bespoke,
                    there is a{" "}
                    <Link href="/contact?subject=Custom%20parts%20report" className="font-medium text-primary hover:underline">
                      custom report
                    </Link>{" "}
                    request on every page.
                  </p>
                </>
              ),
            },
            {
              q: "What do I get for free?",
              a: (
                <>
                  <p>
                    Search itself, the part Overview, the vendor Demographics and Contacts,
                    your own supplier stock on every part, and a count of recent
                    solicitations on a part with an upgrade prompt where the table would
                    be. Enough to check whether GPH knows your parts and your competitors
                    before you pay for the rest. The{" "}
                    <Link href="/help/parts-search" className="font-medium text-primary hover:underline">
                      parts
                    </Link>{" "}
                    and{" "}
                    <Link href="/help/vendor-research" className="font-medium text-primary hover:underline">
                      vendor
                    </Link>{" "}
                    help articles walk every tab.
                  </p>
                </>
              ),
            },
          ]}
        />

        <ProductTiers
          title="The library is on every plan. The depth is what changes."
          note="Priced per user with volume discounts for teams."
          tiers={[
            {
              tier: "Free",
              blurb: "Identify parts and vendors, no card required.",
              features: [
                "Every search type, for parts and vendors",
                "Part overview: identifiers, price, DLA buy codes",
                "Vendor demographics, SAM status and contacts",
                "A count of recent solicitations on a part",
                "Your own supplier stock on every part",
              ],
            },
            {
              tier: "Basic",
              blurb: "The full record on every part and vendor.",
              features: [
                "Manufacturers with approved-source and SAM status",
                "Technical characteristics, end use, procurement item description",
                "Vendor recent awards",
                "Everything in Free",
              ],
            },
            {
              tier: "Advanced",
              blurb: "History, what is open now, and the data out.",
              features: [
                "Procurement history and packaging on every part",
                "Open solicitations on parts and on vendors, with PDFs",
                "Contracts booked by DLA center, with rank",
                "Other suppliers' shared stock, whether or not you share",
                "Pinned searches, one-page layout, CSV exports",
              ],
              highlighted: true,
            },
          ]}
        />

        <ProductCTA
          title="Look up your own CAGE first."
          body="The free tier is a real account, not a trial. Search a part you sell and a competitor you know, and see how much of your market is already on the page."
          primaryCta={{ href: "/signup?tier=free", label: "Start free" }}
          secondaryCta={{ href: "/pricing", label: "See pricing" }}
        />
      </main>
      <Footer />
    </>
  );
}
