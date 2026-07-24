import Link from "next/link";
import { ChartIcon, DatabaseIcon, SearchIcon, TargetIcon, CheckIcon, ZapIcon } from "@/components/icons";

type ProductCta = { href: string; label: string };

const products: Array<{
  icon: React.ComponentType<{ className?: string }>;
  family: string;
  tier: string;
  tagline: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta?: ProductCta;
}> = [
  {
    icon: TargetIcon,
    family: "Parts & Vendor Library",
    tier: "Free",
    tagline: "Start with the essentials, no card required.",
    description:
      "Look up parts and vendors right after signup — no commitment. See part identifiers, vendor demographics, and whether solicitations and awards exist for a given record.",
    features: [
      "Part identifiers, details, and codes at a glance",
      "See which vendors are registered and active on the parts you sell",
      "Bid-matching: 1 profile (match alerts, no solicitation detail)",
      "Weekly match notifications",
      "1 user",
    ],
  },
  {
    icon: SearchIcon,
    family: "Parts & Vendor Library",
    tier: "Basic",
    tagline: "Get the lay of the land.",
    description:
      "Full parts and vendor detail — manufacturers, technical characteristics, packaging, contacts, award history, and more.",
    features: [
      "Manufacturers, technical characteristics, packaging, and end-use data",
      "See which vendors are competing and winning on the parts you sell",
      "Recent solicitation detail",
      "Bid-matching: 5 profiles with full solicitation view",
      "Daily match notifications",
      "$59 per user / mo — volume discounts for teams",
    ],
  },
  {
    icon: DatabaseIcon,
    family: "Parts & Vendor Library",
    tier: "Advanced",
    tagline: "The complete procurement picture.",
    description:
      "Everything in Basic plus full procurement history, open solicitation detail, 20 bid-matching profiles, saved searches, exports, and real-time notifications.",
    features: [
      "Full procurement history and open solicitation intelligence",
      "Open solicitation intelligence by vendor — active opportunities on parts they've won before",
      "20 bid-matching profiles with full solicitation view",
      "Saved searches, pinned items, and CSV exports",
      "Immediate match notifications",
      "$99 per user / mo — volume discounts for teams",
    ],
    highlighted: true,
  },
  {
    icon: ZapIcon,
    family: "Parts & Vendor Library",
    tier: "Maximum",
    tagline: "The deepest procurement intelligence available.",
    description:
      "Everything in Advanced, plus Procurement Analytics and DLA demand & stock intelligence — see market and inventory signals no other tier gets.",
    features: [
      "Everything in Advanced",
      "Procurement Analytics dashboard",
      "DLA demand & stock intelligence on every part",
      "$149 per user / mo — volume discounts for teams",
    ],
  },
  {
    icon: ChartIcon,
    family: "Data Reports",
    tier: "Quote",
    tagline: "Bespoke procurement intelligence, scoped to your need.",
    description:
      "Tell us what you need — sourcing analysis, vendor scorecards, contract intelligence, or a one-off pull from our data. We scope, price, and deliver.",
    features: [
      "One-time deliverables or recurring cadence",
      "Custom data extracts",
      "Engagement-scoped pricing",
    ],
    cta: {
      href: "mailto:sales@gphusa.com?subject=Custom%20Reports%20Quote%20Request",
      label: "Contact sales →",
    },
  },
];

export function Products() {
  // Split the products into the four subscription tiers (rendered as a
  // 4-up grid: Free / Basic / Advanced / Maximum) and the bespoke
  // Data Reports offer (rendered as a full-width horizontal panel below).
  // Keeping the layouts visually distinct signals that Data Reports is a
  // different kind of product — quoted per engagement, not a subscription
  // tier — and avoids the "single-card row looks lonely" problem you get
  // from folding it into the tier grid.
  const tierProducts = products.filter((p) => p.family !== "Data Reports");
  const customReportsProduct = products.find((p) => p.family === "Data Reports");

  return (
    <section id="products" className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary dark:text-foreground">
            The Procurement Intelligence platform.
          </h2>
          <p className="mt-4 text-lg text-muted dark:text-foreground/70">
            Start free, then upgrade as your pipeline grows. Paid plans are
            priced per user with volume discounts for teams, and every one
            includes bid-matching — Advanced unlocks 20 profiles and
            immediate notifications.
          </p>
        </div>

        {/* Kicker — names the product family once, so each card heading
            below can be just the tier name. */}
        <div className="mt-16 flex items-center justify-center gap-4">
          <span className="h-px w-8 bg-border" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-widest uppercase text-muted dark:text-foreground/60">
            Federal Procurement Intelligence
          </span>
          <span className="h-px w-8 bg-border" aria-hidden="true" />
        </div>

        {/* Tier products — 4-up grid (2-up on md) */}
        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tierProducts.map((product) => {
            const Icon = product.icon;
            const productKey = `${product.family}-${product.tier}`;
            return (
              <div
                key={productKey}
                className={`relative bg-white dark:bg-card-bg rounded-2xl p-5 xl:p-6 border transition-all duration-300 flex flex-col ${
                  product.highlighted
                    ? "border-primary shadow-xl shadow-primary/10 lg:-translate-y-2"
                    : "border-border hover:border-primary/30 hover:shadow-lg"
                }`}
              >
                {product.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-secondary dark:text-card-foreground">
                  {product.tier}
                </h3>
                <p className="mt-1 text-sm font-medium text-primary">
                  {product.tagline}
                </p>
                <p className="mt-2 text-muted dark:text-card-foreground/80 leading-relaxed">
                  {product.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {product.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-foreground dark:text-card-foreground/90"
                    >
                      <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-border">
                  {product.cta ? (
                    <a
                      href={product.cta.href}
                      className="text-primary font-medium hover:underline"
                    >
                      {product.cta.label}
                    </a>
                  ) : (
                    <Link
                      href="/pricing"
                      className="text-primary font-medium hover:underline"
                    >
                      See pricing →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Reports — full-width horizontal panel. Different shape
            on purpose: subdued background, two-column internal layout on
            lg+, dashed accent border. Reads as "and if none of the above
            fit, here's the custom path." */}
        {customReportsProduct && (() => {
          const Icon = customReportsProduct.icon;
          return (
            <div className="mt-6 rounded-2xl border border-border bg-muted-light/40 dark:bg-card-bg p-8 lg:p-10">
              <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
                {/* Left: identity + pitch */}
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-secondary dark:text-card-foreground">
                          {customReportsProduct.family}
                        </h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {customReportsProduct.tier}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-primary">
                        {customReportsProduct.tagline}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-muted dark:text-card-foreground/80 leading-relaxed">
                    {customReportsProduct.description}
                  </p>
                </div>

                {/* Right: features + CTA */}
                <div className="lg:border-l lg:border-border lg:pl-8">
                  <ul className="space-y-2.5">
                    {customReportsProduct.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-foreground dark:text-card-foreground/90"
                      >
                        <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {customReportsProduct.cta && (
                    <div className="mt-6">
                      <a
                        href={customReportsProduct.cta.href}
                        className="inline-flex items-center text-primary font-medium hover:underline"
                      >
                        {customReportsProduct.cta.label}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <p className="mt-12 text-center text-sm text-muted dark:text-foreground/70">
          Pricing varies by billing period. Visit{" "}
          <Link href="/pricing" className="text-primary font-medium hover:underline">
            the pricing page
          </Link>{" "}
          for current numbers.
        </p>
      </div>
    </section>
  );
}
