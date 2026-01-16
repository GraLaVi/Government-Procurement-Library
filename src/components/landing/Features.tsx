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
    title: "Intelligent Bid Matching",
    description:
      "Our AI analyzes your capabilities and automatically matches you with relevant opportunities from SAM.gov, DIBBS, FedBizOpps, and 20+ other sources.",
  },
  {
    icon: BellIcon,
    title: "Real-Time Alerts",
    description:
      "Get instant notifications when new opportunities match your criteria. Never miss a deadline with automated reminders and tracking.",
  },
  {
    icon: DatabaseIcon,
    title: "SAM.gov Integration",
    description:
      "Seamlessly pull opportunity data, entity information, and award history directly from SAM.gov and other federal databases.",
  },
  {
    icon: ChartIcon,
    title: "Contract Analytics",
    description:
      "Analyze historical contract data, pricing trends, and award patterns to build more competitive proposals.",
  },
  {
    icon: UsersIcon,
    title: "Competitor Tracking",
    description:
      "Monitor competitor activity, win rates, and contract awards to understand your competitive landscape.",
  },
  {
    icon: SearchIcon,
    title: "Advanced Search",
    description:
      "Filter opportunities by NAICS codes, set-asides, contract type, agency, location, and dozens of other criteria.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-muted-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary dark:text-foreground">
            Everything You Need to Win Government Contracts
          </h2>
          <p className="mt-4 text-lg text-muted dark:text-foreground/70">
            Powerful tools designed specifically for defense contractors and government vendors
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
