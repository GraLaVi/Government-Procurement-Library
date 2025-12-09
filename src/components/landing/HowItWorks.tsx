import { ArrowRightIcon } from "@/components/icons";

const steps = [
  {
    number: "01",
    title: "Set Your Criteria",
    description:
      "Define your capabilities, NAICS codes, contract preferences, and target agencies. Our system learns what opportunities matter to you.",
  },
  {
    number: "02",
    title: "Get Matched",
    description:
      "Our AI scans federal databases daily and delivers personalized opportunity matches directly to your dashboard and inbox.",
  },
  {
    number: "03",
    title: "Win Contracts",
    description:
      "Use our analytics and insights to craft winning proposals. Track your pipeline and grow your government business.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary">
            How Gralavi Works
          </h2>
          <p className="mt-4 text-lg text-muted">
            Get started in minutes and find your first matched opportunities today
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
                  <div className="bg-white rounded-2xl p-8 border border-border hover:shadow-xl transition-shadow duration-300">
                    {/* Number badge */}
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg mb-6">
                      {step.number}
                    </div>

                    <h3 className="text-xl font-semibold text-secondary">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-muted leading-relaxed">
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
