import {
  SearchIcon,
  TargetIcon,
  UsersIcon,
  DatabaseIcon,
  ZapIcon,
  BoxIcon,
  SendIcon,
} from "@/components/icons";

// The grid runs at two weights on purpose. A uniform 9-up gave the visitor
// nine equal targets and no entry point, so the four features we actually
// lead with are cards with a filled icon tile, and the platform capabilities
// underneath them are a plain three-up row with no card chrome — evidence
// that the data is real, not four more things to evaluate.
//
// Two cards were merged in getting here, and the copy still covers both:
// match alerts live inside Bid-Matching (they're how it delivers, not a
// separate product), and the old "CAGE Code Intelligence" / "Award & Vendor
// Intelligence" pair is one "Vendor & award intelligence" entry.
//
// How each one is sold is a badge rather than a closing sentence, so the
// "is this included?" question is answered before the description is read.
// The wording tracks the cards in Products.tsx and the panels on /pricing;
// change them together.

type Badge = { label: string; tone: "included" | "addon" };

const heroFeatures: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge: Badge;
  description: string;
}> = [
  {
    icon: TargetIcon,
    title: "Bid-Matching",
    badge: { label: "Every plan", tone: "included" },
    description:
      "Profile what you sell by NIIN/NSN, part description, and set-aside. GPH matches every incoming DIBBS, DLA, and SAM.gov solicitation against it and tells you — weekly on Free, daily on Basic, the moment it lands on Advanced.",
  },
  {
    icon: SendIcon,
    title: "Requests for Quote",
    badge: { label: "Add-on", tone: "addon" },
    description:
      "Send structured RFQs to manufacturers and stocking suppliers without leaving the part record, and collect every quote in one place — shared batch cart, private vendor contact book, response tracking.",
  },
  {
    icon: ZapIcon,
    title: "Procurement Analytics",
    badge: { label: "Add-on", tone: "addon" },
    description:
      "Your win rate, the competitor leaderboard, and the parts worth getting qualified on — plus DLA demand forecasts and stock levels on what you supply, with an alert the moment one goes on backorder.",
  },
  {
    icon: BoxIcon,
    title: "Supplier Stock",
    badge: { label: "Free on every plan", tone: "included" },
    description:
      "Upload your inventory and it appears on every part record you research, so you always know what you can quote off the shelf. Share it — field by field, your call — and you see what the rest of the network has.",
  },
];

const supportingFeatures: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}> = [
  {
    icon: DatabaseIcon,
    title: "NSN/NIIN parts database",
    description:
      "Search by NIIN, NSN, description, solicitation or contract number — full part data, cross-references, and linked history in one record.",
  },
  {
    icon: UsersIcon,
    title: "Vendor & award intelligence",
    description:
      "Look up any vendor by CAGE, name, or UEI: award history, who has won this part before, and what they have open right now.",
  },
  {
    icon: SearchIcon,
    title: "Unified federal data",
    description:
      "DIBBS, DLA, and SAM.gov in one searchable place — no toggling portals or running the same search three times.",
  },
];

// Included vs add-on is the distinction the badge exists to draw, so it gets
// two colors rather than two labels in the same pill.
const badgeToneClass: Record<Badge["tone"], string> = {
  included: "bg-success/10 text-success",
  addon: "bg-primary/10 text-primary",
};

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary dark:text-foreground">
            Everything You Need to Win Federal Contracts
          </h2>
          <p className="mt-4 text-lg text-muted dark:text-foreground/70">
            Purpose-built for suppliers selling parts to DLA, DIBBS, and the military service branches
          </p>
        </div>

        {/* Lead features — 2-up so the copy has room to breathe. Reading order
            is the priority order: bid-matching, RFQ, analytics, supplier stock. */}
        <div className="mt-16 grid md:grid-cols-2 gap-6 lg:gap-8">
          {heroFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white dark:bg-card-bg rounded-xl p-6 lg:p-8 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-semibold text-secondary dark:text-card-foreground">
                      {feature.title}
                    </h3>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeToneClass[feature.badge.tone]}`}
                    >
                      {feature.badge.label}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-muted dark:text-card-foreground/80 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Supporting capabilities — deliberately not cards. Same content
            weight as a card would carry, a fraction of the visual weight, so
            the four above keep the emphasis. */}
        <div className="mt-14">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold tracking-widest uppercase text-muted dark:text-foreground/60">
              Built on the data underneath
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-8">
            {supportingFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-base font-semibold text-secondary dark:text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted dark:text-foreground/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
