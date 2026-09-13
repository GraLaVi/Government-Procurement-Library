import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/icons";

/**
 * The section vocabulary every product page is built from.
 *
 * Bid-matching is the first of four (RFQ, the parts and vendor library, and
 * analytics follow), so these are deliberately content-shaped: a new product
 * page should be copy, a fixture and a demo component, not another set of
 * bespoke sections.
 */

export function ProductHero({
  eyebrow, title, lede, proof, primaryCta, secondaryCta,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede: string;
  /** One number, stated once. Two numbers in a hero is a dashboard. */
  proof?: React.ReactNode;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
}) {
  return (
    <section className="relative overflow-hidden pt-32 pb-12 lg:pt-40 lg:pb-16">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-light/35 via-white to-white dark:from-primary-light/25 dark:via-background dark:to-background" />
      <div className="absolute top-10 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/products"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← All products
        </Link>
        <div className="mt-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {eyebrow}
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-secondary dark:text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted dark:text-foreground/70 sm:text-xl">
            {lede}
          </p>
          {proof && <div className="mt-8">{proof}</div>}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href={primaryCta.href} variant="primary" size="lg">
              {primaryCta.label}
            </Button>
            {secondaryCta && (
              <Button href={secondaryCta.href} variant="outline" size="lg">
                {secondaryCta.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The whole product in three lines. Deliberately capped at three and at one
 * sentence each — this is the part a visitor who reads nothing else will read.
 */
export function ProductSteps({
  steps,
}: {
  steps: Array<{ title: string; body: string }>;
}) {
  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-border bg-card-bg p-6"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-secondary dark:text-card-foreground">
                {step.title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted dark:text-card-foreground/80">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ProductDemoSection({
  title, lede, children, id = "demo", badge,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
  /** A page with two demos gives the second its own anchor. */
  id?: string;
  /** Short qualifier beside the title — "Enterprise add-on" on a demo of a
   *  screen the base product does not include. */
  badge?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-12 lg:py-16">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {badge && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {badge}
            </div>
          )}
          <h2 className="text-3xl font-bold text-secondary dark:text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-lg text-muted dark:text-foreground/70">{lede}</p>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/**
 * The depth, folded away. Everything above this point is for the visitor who
 * will not read; this is for the one who will, and it stays closed until they
 * say so. <details> rather than a controlled accordion so it works before
 * hydration and prints open.
 */
export function ProductDetail({
  title, lede, items,
}: {
  title: string;
  lede?: string;
  items: Array<{ q: string; a: React.ReactNode }>;
}) {
  return (
    <section id="detail" className="scroll-mt-24 bg-muted-light/40 py-16 dark:bg-background/40 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-secondary dark:text-foreground sm:text-4xl">
          {title}
        </h2>
        {lede && <p className="mt-4 text-lg text-muted dark:text-foreground/70">{lede}</p>}
        <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card-bg">
          {items.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left font-semibold text-foreground hover:bg-muted-light/60 dark:hover:bg-background/40">
                {item.q}
                <span
                  className="shrink-0 text-xl leading-none text-primary transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div className="space-y-3 px-5 pb-5 leading-relaxed text-muted dark:text-card-foreground/80">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** What you get on which plan — the hand-off from "what is it" to /pricing. */
export function ProductTiers({
  title, note, tiers,
}: {
  title: string;
  note?: string;
  tiers: Array<{ tier: string; blurb: string; features: string[]; highlighted?: boolean }>;
}) {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-secondary dark:text-foreground sm:text-4xl">
          {title}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.tier}
              className={`flex flex-col rounded-2xl border bg-card-bg p-6 ${
                t.highlighted
                  ? "border-primary shadow-xl shadow-primary/10"
                  : "border-border"
              }`}
            >
              <h3 className="text-xl font-semibold text-secondary dark:text-card-foreground">
                {t.tier}
              </h3>
              <p className="mt-1 text-sm font-medium text-primary">{t.blurb}</p>
              <ul className="mt-4 space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground dark:text-card-foreground/90">
                    <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {note && (
          <p className="mt-8 text-center text-sm text-muted dark:text-foreground/70">
            {note}{" "}
            <Link href="/pricing" className="font-medium text-primary hover:underline">
              See pricing →
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

export function ProductCTA({
  title, body, primaryCta, secondaryCta,
}: {
  title: string;
  body: string;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
}) {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-secondary dark:text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted dark:text-foreground/70">
          {body}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href={primaryCta.href} variant="primary" size="lg">
            {primaryCta.label}
          </Button>
          {secondaryCta && (
            <Button href={secondaryCta.href} variant="outline" size="lg">
              {secondaryCta.label}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
