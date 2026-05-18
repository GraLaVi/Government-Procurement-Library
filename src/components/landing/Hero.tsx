import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/icons";
import { TodaySolicitationsCard } from "@/components/landing/TodaySolicitationsCard";

const highlights = [
  "Live DLA and DIBBS solicitation feeds updated daily",
  "NSN/NIIN part search with cross-referenced CAGE codes",
  "Automated bid-matching against your saved profiles",
];

export function Hero() {
  return (
    <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background gradient — soft teal glow entering from the top-left
          only, fading to clean white across the rest of the hero. */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-light/35 via-white to-white" />

      {/* Decorative shapes */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            {/* Beta pill */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              Private beta · applications open
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary dark:text-foreground leading-tight">
              Federal Procurement Intelligence.
              <span className="block mt-3 text-2xl sm:text-3xl lg:text-4xl font-medium italic text-primary">
                Find every opportunity.
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted dark:text-foreground/70 leading-relaxed">
              Search DLA and DIBBS opportunities, track military branch RFQs,
              and match your CAGE-coded capabilities to active solicitations —
              before your competitors do.
            </p>

            {/* Highlights */}
            <ul className="mt-8 space-y-4">
              {highlights.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-success/10 rounded-full flex items-center justify-center mt-0.5">
                    <CheckIcon className="w-4 h-4 text-success" />
                  </span>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Button href="/signup" variant="primary" size="lg">
                Request Beta Access
              </Button>
              <Button href="/pricing" variant="outline" size="lg">
                View Pricing
              </Button>
            </div>

            {/* Trust indicator */}
            <p className="mt-6 text-sm text-muted dark:text-foreground/70">
              Beta access is reviewed and approved before activation. No
              credit card required to apply.
            </p>
          </div>

          {/* Visual */}
          <div className="relative lg:pl-8">
            <TodaySolicitationsCard />
          </div>
        </div>
      </div>
    </section>
  );
}
