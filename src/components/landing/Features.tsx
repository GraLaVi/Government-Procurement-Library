import {
  SearchIcon,
  BellIcon,
  ChartIcon,
  TargetIcon,
  UsersIcon,
  DatabaseIcon,
  ZapIcon,
  BoxIcon,
  SendIcon,
} from "@/components/icons";

const features = [
  {
    icon: TargetIcon,
    title: "Bid-Matching",
    description:
      "Set up profiles based on NIIN/NSN, part descriptions, set-asides, and other criteria. GPH automatically matches incoming solicitations from DIBBS, DLA, and SAM.gov against your profiles so relevant opportunities surface without manual searching.",
  },
  {
    icon: BellIcon,
    title: "Solicitation Match Alerts",
    description:
      "Get notified when new solicitations match your bid-matching profiles. Weekly on Free, daily on Basic, immediate on Advanced — delivered by email so you never miss a window.",
  },
  {
    icon: DatabaseIcon,
    title: "NSN/NIIN Parts Database",
    description:
      "Search by NIIN, NSN, part description, solicitation number, contract number, and more. See complete part data, cross-references, management codes, and linked solicitation history — all in one record.",
  },
  {
    icon: ChartIcon,
    title: "CAGE Code Intelligence",
    description:
      "Look up any vendor by CAGE code, entity name, or UEI to see associated contracts, award history, and active solicitations. Understand who is competing and winning.",
  },
  {
    icon: UsersIcon,
    title: "Award & Vendor Intelligence",
    description:
      "See which vendors have won past awards for a specific part and which vendors have previously won on parts with open solicitations now — so you know who you're up against before you bid.",
  },
  {
    icon: SearchIcon,
    title: "Unified Federal Data",
    description:
      "DIBBS, DLA, and SAM.gov solicitations aggregated into a single searchable platform. No more toggling between portals or running the same search three different ways.",
  },
  // The last three are the add-ons and Supplier Stock. Each names how it is
  // sold in its closing sentence, the way the alerts card names its tiers —
  // a feature grid that reads as "all of this is included" sets up the wrong
  // expectation at the pricing table. The wording tracks the cards in
  // Products.tsx and the panels on /pricing; change them together.
  {
    icon: ZapIcon,
    title: "Procurement Analytics",
    description:
      "See your market and your place in it: win rate, competitor leaderboard, the parts worth getting qualified on, and DLA demand forecasts and stock levels on the parts you supply — with alerts when one goes on backorder. An add-on on the Advanced plan.",
  },
  {
    icon: BoxIcon,
    title: "Supplier Stock",
    description:
      "Upload your inventory and it shows up on every part record you research, so you always know what you can quote off the shelf. Sharing is free on every plan, each field shared or withheld separately — share your stock and you see what the rest of the network has.",
  },
  {
    icon: SendIcon,
    title: "Requests for Quote",
    description:
      "Send structured RFQs to manufacturers and stocking suppliers without leaving the part record, and collect their quotes in one place — with a shared batch cart, a private vendor contact book, and response tracking. An add-on on any paid plan.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-muted-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary dark:text-foreground">
            Everything You Need to Win Federal Contracts
          </h2>
          <p className="mt-4 text-lg text-muted dark:text-foreground/70">
            Purpose-built tools for defense suppliers working with DLA, DIBBS, and military service branches
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
