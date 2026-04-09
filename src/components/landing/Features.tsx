import {
  SearchIcon,
  BellIcon,
  ChartIcon,
  TargetIcon,
  UsersIcon,
  DatabaseIcon,
} from "@/components/icons";

const features = [
  {
    icon: TargetIcon,
    title: "DLA Solicitation Matching",
    description:
      "Automatically scan and match DLA solicitations from DIBBS and other DoD procurement channels to your company's capabilities, CAGE code, and past performance.",
  },
  {
    icon: BellIcon,
    title: "Real-Time DoD Alerts",
    description:
      "Get instant notifications when new RFQs, RFPs, and solicitations are posted by DLA, Army, Navy, Air Force, and Marine Corps contracting offices.",
  },
  {
    icon: DatabaseIcon,
    title: "NSN/NIIN Parts Database",
    description:
      "Search millions of National Stock Numbers and NIINs with complete part data, cross-references, management codes, and linked solicitation history.",
  },
  {
    icon: ChartIcon,
    title: "CAGE Code Intelligence",
    description:
      "Look up any CAGE or DoDAAC code to see associated contracts, award history, and active solicitations. Understand who is competing and winning.",
  },
  {
    icon: UsersIcon,
    title: "Competitor Analysis",
    description:
      "Track which contractors are winning DoD awards in your space. See their CAGE codes, contract values, and bidding patterns across DLA and service branches.",
  },
  {
    icon: SearchIcon,
    title: "DIBBS & Solicitation Search",
    description:
      "Search and filter DIBBS solicitations, packaging requirements, and qualification criteria so you can respond to DoD opportunities faster and more accurately.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-muted-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary dark:text-foreground">
            Everything You Need to Win DoD Bids
          </h2>
          <p className="mt-4 text-lg text-muted dark:text-foreground/70">
            Purpose-built tools for defense contractors working with DLA, DIBBS, and military service branches
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-card-bg rounded-xl p-6 lg:p-8 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-secondary dark:text-card-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-muted dark:text-card-foreground/80 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
