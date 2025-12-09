import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/icons";

const highlights = [
  "Automatic bid matching from SAM.gov, DIBBS, FedBizOpps & more",
  "Real-time solicitation alerts delivered daily",
  "Contract history and competitor analysis",
];

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-light via-white to-accent-light opacity-50" />

      {/* Decorative shapes */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary leading-tight">
              Win More{" "}
              <span className="text-primary">Government Bids</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted leading-relaxed">
              Your Defense Contracting Intelligence Platform. Find, track, and win federal contracts with AI-powered bid matching and real-time market intelligence.
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
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button href="/trial" variant="primary" size="lg">
                Start Free Trial
              </Button>
              <Button href="#how-it-works" variant="outline" size="lg">
                See How It Works
              </Button>
            </div>

            {/* Trust indicator */}
            <p className="mt-6 text-sm text-muted">
              No credit card required. 14-day free trial.
            </p>
          </div>

          {/* Visual */}
          <div className="relative lg:pl-8">
            <div className="relative bg-white rounded-2xl shadow-2xl shadow-primary/10 border border-border p-6 lg:p-8">
              {/* Mock Dashboard Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-secondary">Today&apos;s Matches</h3>
                  <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">
                    12 New
                  </span>
                </div>

                {/* Mock opportunity cards */}
                {[
                  { title: "IT Support Services - DoD", value: "$2.4M", agency: "Department of Defense" },
                  { title: "Cybersecurity Assessment", value: "$890K", agency: "DHS" },
                  { title: "Network Infrastructure", value: "$1.2M", agency: "Army" },
                ].map((opp, index) => (
                  <div
                    key={index}
                    className="p-4 bg-muted-light rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground text-sm">{opp.title}</h4>
                        <p className="text-xs text-muted mt-1">{opp.agency}</p>
                      </div>
                      <span className="text-primary font-semibold text-sm">{opp.value}</span>
                    </div>
                  </div>
                ))}

                <div className="text-center pt-2">
                  <span className="text-sm text-primary font-medium cursor-pointer hover:underline">
                    View all 47 opportunities →
                  </span>
                </div>
              </div>
            </div>

            {/* Floating stats */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-border p-4">
              <div className="text-2xl font-bold text-primary">$4.2B+</div>
              <div className="text-xs text-muted">Contracts Tracked</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
