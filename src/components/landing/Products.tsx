import Link from "next/link";
import { DatabaseIcon, SearchIcon, TargetIcon, CheckIcon } from "@/components/icons";

const products = [
  {
    icon: SearchIcon,
    name: "ALAN Library — Basic",
    tagline: "Get the lay of the land.",
    description:
      "Combined parts + vendor library with the essentials: search, summary, code definitions, and award history.",
    features: [
      "Parts + Vendor search",
      "Awards history",
      "Code definitions",
      "Per-seat pricing",
    ],
  },
  {
    icon: DatabaseIcon,
    name: "ALAN Library — Full",
    tagline: "The complete procurement picture.",
    description:
      "Everything in Basic plus procurement history, manufacturers, packaging, bookings, technical characteristics, end-use, and live solicitations.",
    features: [
      "Everything in Basic",
      "Procurement history & bookings",
      "Manufacturers & packaging",
      "Active solicitations feed",
    ],
    highlighted: true,
  },
  {
    icon: TargetIcon,
    name: "Bid Matching Pro",
    tagline: "Never miss a relevant RFQ.",
    description:
      "Unlimited matching profiles and conditions across DLA, Army, Navy, Air Force, and Marines — plus priority queue and advanced filters.",
    features: [
      "Unlimited profiles",
      "Unlimited conditions per profile",
      "Priority match queue",
      "Advanced filters",
    ],
  },
];

export function Products() {
  return (
    <section id="products" className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary dark:text-foreground">
            Three products. Pick what fits.
          </h2>
          <p className="mt-4 text-lg text-muted dark:text-foreground/70">
            Subscribe to one, mix-and-match, or bundle. Bid Matching is
            included free with any active subscription — upgrade to Pro for
            unlimited use.
          </p>
        </div>

        {/* Products grid */}
        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const Icon = product.icon;
            return (
              <div
                key={product.name}
                className={`relative bg-white dark:bg-card-bg rounded-2xl p-8 border transition-all duration-300 flex flex-col ${
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
                <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-secondary dark:text-card-foreground">
                  {product.name}
                </h3>
                <p className="mt-1 text-sm font-medium text-primary">
                  {product.tagline}
                </p>
                <p className="mt-3 text-muted dark:text-card-foreground/80 leading-relaxed">
                  {product.description}
                </p>
                <ul className="mt-6 space-y-2.5">
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
                <div className="mt-8 pt-6 border-t border-border">
                  <Link
                    href="/pricing"
                    className="text-primary font-medium hover:underline"
                  >
                    See pricing →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-12 text-center text-sm text-muted dark:text-foreground/70">
          Pricing varies by billing period and seat count. Visit{" "}
          <Link href="/pricing" className="text-primary font-medium hover:underline">
            the pricing page
          </Link>{" "}
          for current numbers.
        </p>
      </div>
    </section>
  );
}
