import { ArrowRightIcon } from "@/components/icons";
import { SELF_SERVE_SIGNUP } from "@/lib/signup/entryPoint";

const steps = [
  {
    number: "01",
    title: SELF_SERVE_SIGNUP ? "Sign Up in Minutes" : "Request Beta Access",
    description: SELF_SERVE_SIGNUP
      ? "Sign up with your work email and pick your plan — start free with no credit card required."
      : "Sign up with your work email. Beta seats are reviewed and approved by the GPH team — no credit card needed to apply.",
  },
  {
    number: "02",
    title: "Tell Us What You Sell",
    description: SELF_SERVE_SIGNUP
      ? "Set up your match profile — part numbers, part description, or the types of contracts you go after — and GPH starts watching for relevant opportunities."
      : "Once approved, set up your match profile — part numbers, part description, or the types of contracts you go after — and GPH starts watching for relevant opportunities.",
  },
  {
    number: "03",
    title: "Bid With Better Information",
    description:
      "Matched opportunities show up in your dashboard and your inbox. See who has won similar contracts, what the government has paid, and which solicitations are closing soon — so every proposal you submit is backed by real data.",
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
            {SELF_SERVE_SIGNUP
              ? "From sign-up to your first matched solicitation"
              : "From beta application to your first matched solicitation"}
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
