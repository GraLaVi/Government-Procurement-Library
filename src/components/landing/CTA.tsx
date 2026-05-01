import { Button } from "@/components/ui/Button";
import { ShieldIcon, ZapIcon } from "@/components/icons";

export function CTA() {
  return (
    <section className="py-20 lg:py-32 bg-secondary dark:bg-[#1C2C54]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-primary to-primary-hover p-8 lg:p-16 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

          <div className="relative grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Beta seats available
              </div>
              <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Ready to Win More DoD Bids?
              </h2>
              <p className="mt-6 text-lg text-white/80 leading-relaxed">
                Apply for a beta seat to get hands-on with live DLA solicitation
                feeds, NSN/NIIN search, and bid matching. Pick a plan when
                you&apos;re ready — your team is approved before any charge.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  href="/signup"
                  variant="secondary"
                  size="lg"
                  className="!bg-white !text-primary hover:!bg-white/90"
                >
                  Request Beta Access
                </Button>
                <Button
                  href="/pricing"
                  variant="outline"
                  size="lg"
                  className="!border-white/30 !text-white hover:!bg-white/10"
                >
                  View Pricing
                </Button>
              </div>
            </div>

            {/* Stats/Trust */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <ZapIcon className="w-8 h-8 text-white/80 mb-4" />
                <div className="text-3xl font-bold text-white">15K+</div>
                <div className="text-white/70 mt-1">DoD Solicitations Indexed Monthly</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <ShieldIcon className="w-8 h-8 text-white/80 mb-4" />
                <div className="text-3xl font-bold text-white">$4.2B+</div>
                <div className="text-white/70 mt-1">DoD Contract Value Tracked</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:col-span-2">
                <div className="text-white/70 text-sm mb-3">Covering solicitations from:</div>
                <div className="flex flex-wrap gap-4 text-white font-medium">
                  <span>DLA</span>
                  <span>Army</span>
                  <span>Navy</span>
                  <span>Air Force</span>
                  <span>Marines</span>
                  <span>Space Force</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
