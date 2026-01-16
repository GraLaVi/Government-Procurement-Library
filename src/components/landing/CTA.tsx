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
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Ready to Win More Government Contracts?
              </h2>
              <p className="mt-6 text-lg text-white/80 leading-relaxed">
                Join thousands of defense contractors using GPH to find and win federal opportunities. Start your free trial today.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button
                  href="/trial"
                  variant="secondary"
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90"
                >
                  Start Free Trial
                </Button>
                <Button
                  href="/contact"
                  variant="ghost"
                  size="lg"
                  className="text-white border-2 border-white/30 hover:bg-white/10"
                >
                  Contact Sales
                </Button>
              </div>
            </div>

            {/* Stats/Trust */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <ZapIcon className="w-8 h-8 text-white/80 mb-4" />
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="text-white/70 mt-1">Opportunities Matched Monthly</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <ShieldIcon className="w-8 h-8 text-white/80 mb-4" />
                <div className="text-3xl font-bold text-white">$4.2B+</div>
                <div className="text-white/70 mt-1">Contract Value Tracked</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:col-span-2">
                <div className="text-white/70 text-sm mb-3">Trusted by contractors working with:</div>
                <div className="flex flex-wrap gap-4 text-white font-medium">
                  <span>DoD</span>
                  <span>DHS</span>
                  <span>Army</span>
                  <span>Navy</span>
                  <span>Air Force</span>
                  <span>NASA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
