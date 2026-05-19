import { SearchIcon, BellIcon, ChartIcon } from "@/components/icons";

const valueProps: Array<{
  icon: React.ComponentType<{ className?: string }>;
  lead: string;
  rest: string;
}> = [
  {
    icon: SearchIcon,
    lead: "See every relevant contract in one place",
    rest: "instead of checking multiple government portals.",
  },
  {
    icon: BellIcon,
    lead: "Get alerts when a new opportunity matches",
    rest: "what you sell — so you don't find out after the close date.",
  },
  {
    icon: ChartIcon,
    lead: "Know who has won similar contracts before",
    rest: "so you bid smarter.",
  },
];

export function WhatGPHDoes() {
  return (
    <section className="py-20 lg:py-32 bg-muted-light/30 dark:bg-card-bg/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header — plain-language explainer for visitors who didn't decode
            the Hero's DLA/DIBBS/CAGE subhead. Centered max-w-3xl pattern
            mirrors Features.tsx and HowItWorks.tsx. */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary dark:text-foreground">
            Find every contract you can compete for.
          </h2>
          <p className="mt-4 text-lg text-muted dark:text-foreground/70 leading-relaxed">
            The U.S. military buys billions of dollars in parts, materials,
            and equipment every year through public solicitations. GPH
            monitors those solicitations, matches them to your products, and
            alerts you when there&apos;s a contract you can compete for — so
            you stop finding out about opportunities after they&apos;ve closed.
          </p>
        </div>

        {/* Value props — 3-up grid, single-sentence cards. Lead phrase
            bolded so a skimmer gets the benefit even without reading the
            tail clause. */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {valueProps.map((prop) => {
            const Icon = prop.icon;
            return (
              <div
                key={prop.lead}
                className="bg-white dark:bg-card-bg rounded-xl p-6 lg:p-8 border border-border"
              >
                <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <p className="mt-5 text-base text-foreground dark:text-card-foreground leading-relaxed">
                  <span className="font-semibold text-secondary dark:text-card-foreground">
                    {prop.lead}
                  </span>{" "}
                  <span className="text-muted dark:text-card-foreground/80">
                    {prop.rest}
                  </span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Scope callout — qualifies the lead BEFORE they look at pricing.
            Bordered + tinted so it reads as a "before you go further, this
            is who we're for" gesture instead of another feature card. */}
        <div className="mt-10 max-w-3xl mx-auto">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
            <p className="text-sm text-foreground dark:text-card-foreground/90 leading-relaxed">
              <span className="font-semibold text-primary uppercase text-xs tracking-wide mr-2">
                Who this is for
              </span>
              GPH is built for companies that sell parts, materials, and
              manufactured goods to the federal government — not IT services,
              consulting, or construction.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
