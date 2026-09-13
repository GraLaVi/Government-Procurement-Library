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
import { InventoryDemo } from "@/components/products/InventoryDemo";
import { resolveDemoInventory } from "@/lib/demo/inventory";

export const metadata: Metadata = {
  title: "Supplier Stock | Government Procurement Hub",
  description:
    "Upload your stock free. It shows on every part you research and in your RFQ queue, and sharing it — anonymously, column by column — opens what the rest of the network has on the shelf. Try the live mock-up.",
};

// The demo's dates are resolved against the server's clock at request time —
// a stale stock line has to be genuinely older than thirty days on the day
// the visitor looks.
export const dynamic = "force-dynamic";

export default function SupplierStockProductPage() {
  const demo = resolveDemoInventory(new Date().toISOString());

  return (
    <>
      <Navbar />
      <main>
        <ProductHero
          eyebrow="Supplier Stock"
          title={
            <>
              Put your shelf
              <span className="mt-3 block text-primary">on every part you research.</span>
            </>
          }
          lede="Upload your inventory as a CSV — free, on every plan — and your own stock appears on every part record your team opens and beside every solicitation in your RFQ queue. Share it, anonymously and column by column, and you see what every other supplier on GPH has on the shelf too."
          primaryCta={{ href: "/signup?tier=free", label: "Start free" }}
          secondaryCta={{ href: "#demo", label: "Try the mock-up" }}
        />

        <ProductSteps
          steps={[
            {
              title: "Export from your ERP, upload the file",
              body:
                "One CSV. Each line needs an NSN or a part number and a quantity; everything else — your SKU, CAGE, condition, cost, lead time, bin — makes it better. Your own column names work: GPH maps them, shows you the mapping, and remembers it.",
            },
            {
              title: "Review, then confirm",
              body:
                "Nothing imports until you say so. The review screen shows a sample of parsed rows with what GPH already knows about each part, the valid and rejected counts, and a warning when a snapshot would drop more of your catalog than a real count should.",
            },
            {
              title: "It shows up where you work",
              body:
                "Your stock on every part record. A green cube on every solicitation in the Send RFQs queue you can fill from the shelf, and a Use my stock button that prices it. And if you share, the network's stock next to yours.",
            },
          ]}
        />

        <ProductDemoSection
          title="This is what it looks like."
          lede="Not a screenshot — the real Supplier Stock tab, items list and upload review, running on a fictional supplier's inventory. Click a tour, or walk the tabs the way you would in your own account."
        >
          <InventoryDemo data={demo} />
        </ProductDemoSection>

        <ProductDetail
          title="The parts that matter once you're using it"
          lede="Everything above is the shape of the product. This is the detail that decides whether your ops team will keep the file current."
          items={[
            {
              q: "What does a line need, and what is worth adding?",
              a: (
                <>
                  <p>
                    Required: an NSN or NIIN <em>or</em> a part number, and a quantity on
                    hand. Strongly recommended: your own SKU, which is how GPH recognises the
                    same line across uploads so updates update instead of duplicating; the
                    manufacturer CAGE, which roughly doubles clean-match rates on part
                    numbers; unit of measure and condition code, which default to EA and A
                    with a warning — and a line without a condition code is never shown to
                    other customers.
                  </p>
                  <p>
                    Beyond that, whatever a buyer would ask you: cost and price validity,
                    minimum order and package quantities, lead time, country of origin,
                    material source, traceability, lot and cure dates, DFARS and export
                    flags. Bad values in optional columns warn; they never reject the line.
                    Files go to 20&nbsp;MB or 100,000 rows.
                  </p>
                </>
              ),
            },
            {
              q: "Snapshot or changes — which upload mode do I use?",
              a: (
                <>
                  <p>
                    <strong>Full snapshot</strong> is the default: the file is your complete
                    current stock, and lines missing from it are removed. No delete files,
                    no drift, and removed lines are recoverable. <strong>Changes only</strong>{" "}
                    updates the lines in the file and leaves the rest alone — right for a
                    cycle count of one warehouse.
                  </p>
                  <p>
                    A snapshot that would remove more of your catalog than your threshold
                    allows is stopped at review with the count, because that is what a
                    truncated export looks like. Every completed upload can be rolled back.
                  </p>
                </>
              ),
            },
            {
              q: "Who sees my inventory?",
              a: (
                <>
                  <p>
                    Nobody, until an admin turns sharing on and accepts the terms. Until
                    then GPH is a private stock lookup for your own team. When you do share,
                    each field is exposed or withheld separately: quantity as an exact
                    number, a band like &ldquo;100&ndash;499&rdquo;, or just &ldquo;in
                    stock&rdquo;; price, minimum order, lead time, condition, traceability
                    and ship-from region each on their own switch, with price off by
                    default.
                  </p>
                  <p>
                    Your identity is hidden by default — buyers see &ldquo;Authorized
                    distributor · ships from US-East&rdquo;, not your name — and inquiries
                    route through GPH&rsquo;s RFQ system unless you publish an email.
                    Warehouse and bin locations are never shared with anyone. A live
                    preview on the settings page shows exactly what the network sees.
                  </p>
                </>
              ),
            },
            {
              q: "How does sharing unlock the network?",
              a: (
                <>
                  <p>
                    Seeing other suppliers&rsquo; stock is included on the Advanced plan. On
                    any other plan, including Free, you get it by contributing: turn sharing
                    on and keep at least one shared line current. Feed the network and you
                    see the network. Let every line go stale and the access pauses until
                    your next fresh upload.
                  </p>
                </>
              ),
            },
            {
              q: "What happens as the file ages?",
              a: (
                <>
                  <p>
                    A line older than thirty days is marked stale — still visible, still
                    quotable, flagged so nobody trusts the count blindly. At ninety days it
                    is withdrawn from the network; you still see it, marked as needing a
                    refresh, and one fresh upload restores it. You get a warning email about
                    a week before. Both thresholds are yours to change.
                  </p>
                </>
              ),
            },
            {
              q: "How does it work with the RFQ queue?",
              a: (
                <>
                  <p>
                    On the RFQ Enterprise add-on, every solicitation in the Send RFQs queue
                    whose parts are on your shelf shows a green cube with a fraction: solid
                    when you stock every quotable line, an outline when some. Expand the row
                    and a Your stock column shows quantity, condition, warehouse and count
                    date, with a partial tag when you cannot cover the solicited quantity.
                  </p>
                  <p>
                    Use my stock creates a quote from your own cost and markup — no vendor
                    contacted, no email — and you can quote part of the quantity from stock
                    and RFQ vendors for the rest, then compare them side by side. This works
                    on your own inventory only, whether or not you share it. The{" "}
                    <Link href="/products/rfq#enterprise-demo" className="font-medium text-primary hover:underline">
                      RFQ page
                    </Link>{" "}
                    has the queue itself, and the{" "}
                    <Link href="/help/supplier-stock" className="font-medium text-primary hover:underline">
                      help article
                    </Link>{" "}
                    covers every field.
                  </p>
                </>
              ),
            },
          ]}
        />

        <ProductTiers
          title="Uploading is free on every plan."
          note="Seeing the network is what differs."
          tiers={[
            {
              tier: "Free",
              blurb: "Your stock, on your parts.",
              features: [
                "Upload, review, roll back — up to 100,000 lines",
                "Your stock on every part record you open",
                "Network stock if you share current stock of your own",
                "3 users",
              ],
            },
            {
              tier: "Basic",
              blurb: "The same, with the full part record around it.",
              features: [
                "Everything in Free",
                "Manufacturers, characteristics and end use on every part",
                "Network stock if you share current stock of your own",
              ],
            },
            {
              tier: "Advanced",
              blurb: "The network, whether or not you share.",
              features: [
                "Everything in Basic",
                "Other suppliers' shared stock on every part, no reciprocity required",
                "Procurement history and open solicitations beside it",
                "With RFQ Enterprise: your stock in the Send RFQs queue and Use my stock",
              ],
              highlighted: true,
            },
          ]}
        />

        <ProductCTA
          title="Your first upload takes one export."
          body="Start free, upload the file you already send to nobody, and see your shelf on every part you research the same afternoon."
          primaryCta={{ href: "/signup?tier=free", label: "Start free" }}
          secondaryCta={{ href: "/pricing", label: "See pricing" }}
        />
      </main>
      <Footer />
    </>
  );
}
