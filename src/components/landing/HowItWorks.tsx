import { ArrowRightIcon } from "@/components/icons";

const steps = [
  {
    number: "01",
    title: "Join the Waitlist",
    description:
      "Enter your email to get early access when we launch. We'll notify you the moment GPH goes live with full DLA and DIBBS solicitation feeds.",
  },
  {
    number: "02",
    title: "Set Your DoD Profile",
    description:
      "At launch, configure your CAGE code, NSN categories, preferred military branches, and contract size range. Our system learns which DoD solicitations matter to you.",
  },
  {
    number: "03",
    title: "Win DoD Contracts",
    description:
      "Receive matched solicitations daily, analyze competitor bids with CAGE code intelligence, and submit stronger proposals backed by real procurement data.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary dark:text-foreground">
            How GPH Works
          </h2>
          <p className="mt-4 text-lg text-muted dark:text-foreground/70">
            Get notified at launch and start finding DoD solicitations immediately
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16">
          <div className="relative">
            {/* Connection line - desktop */}
            <div className="hidden lg:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary via-accent to-primary" />

            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  {/* Step card */}
                  <div className="bg-white dark:bg-card-bg rounded-2xl p-8 border border-border hover:shadow-xl transition-shadow duration-300">
                    {/* Number badge */}
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg mb-6">
                      {step.number}
                    </div>

                    <h3 className="text-xl font-semibold text-secondary dark:text-card-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-muted dark:text-card-foreground/80 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow - mobile/tablet */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center py-4">
                      <ArrowRightIcon className="w-6 h-6 text-primary rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
