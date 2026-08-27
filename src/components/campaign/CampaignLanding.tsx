"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { resolveCampaignTitle } from "@/lib/campaigns";
import { formatMoney } from "@/lib/billing/pricing";
import {
  isOfferInterval,
  type BundleVariants,
  type OfferInterval,
} from "@/lib/billing/resolveOffer";
import {
  normalizeCage,
  validateCageCode,
  type CageValidateResponse,
} from "@/lib/signup/validateCage";

interface CampaignLandingProps {
  /** Campaign slug. Carried into signup for basket campaigns. */
  slug: string;
  /** H1 from the campaign file; may carry the {trial_days} placeholder. */
  title: string;
  /** H1 to fall back to when there is no trial length to quote. */
  titleNoTrial?: string;
  eyebrow?: string;
  ctaLabel?: string;
  /** Markdown body of the campaign file — selling copy and benefit bullets. */
  content: string;
  /**
   * Every interval this basket sells, priced from the live catalog. Empty
   * only when the billing service was unreachable at render time; the page
   * then sends visitors to /pricing rather than inventing a number.
   *
   * A single-product campaign is a basket of one, so there is only one shape
   * to render here.
   */
  offers: BundleVariants;
  /** The interval the campaign file sells, used when ?interval= is absent. */
  defaultInterval: OfferInterval;
  /**
   * True when this campaign sells several products on one subscription. The
   * handoff then carries the SLUG instead of a price id — the API resolves
   * the basket itself, so nobody can widen it by editing the URL.
   */
  isBasket: boolean;
}

// The period a price is quoted for, as a noun that reads naturally after a
// figure: "$1,008 / year". intervalLabel() gives the adjective form
// ("Annual"), which is right for the pricing page's toggles but not here.
function periodNoun(months: number): string {
  switch (months) {
    case 1:
      return "month";
    case 3:
      return "quarter";
    case 6:
      return "6 months";
    case 12:
      return "year";
    default:
      return `${months} months`;
  }
}

// Campaign bodies are deliberately plain: a lead paragraph or two and a
// bulleted benefit list. Rendering only those elements — rather than a full
// article renderer — keeps every campaign page visually identical no matter
// what marketing writes.
const markdownComponents = {
  p: ({ children }: ComponentPropsWithoutRef<"p">) => (
    <p className="text-muted mt-4 first:mt-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: ComponentPropsWithoutRef<"ul">) => (
    <ul className="mt-6 space-y-3">{children}</ul>
  ),
  li: ({ children }: ComponentPropsWithoutRef<"li">) => (
    <li className="flex items-start gap-3 text-sm sm:text-base text-foreground">
      <CheckIcon className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  a: ({ href, children }: ComponentPropsWithoutRef<"a">) => (
    <a href={href} className="text-primary hover:underline">
      {children}
    </a>
  ),
};

export function CampaignLanding(props: CampaignLandingProps) {
  // useSearchParams needs a Suspense boundary on a statically rendered route.
  return (
    <Suspense fallback={null}>
      <CampaignLandingContent {...props} />
    </Suspense>
  );
}

function CampaignLandingContent({
  slug,
  title,
  titleNoTrial,
  eyebrow,
  ctaLabel,
  content,
  offers,
  defaultInterval,
  isBasket,
}: CampaignLandingProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  // ?interval= lets one campaign page be linked as either the monthly or the
  // annual offer — the same copy, a different price and a different price id
  // carried into checkout. An unknown or unsold interval falls back to the
  // campaign file's own choice rather than showing nothing.
  const requestedInterval = searchParams.get("interval")?.toLowerCase();
  const interval: OfferInterval =
    isOfferInterval(requestedInterval) && offers[requestedInterval]
      ? requestedInterval
      : defaultInterval;
  const offer = offers[interval] ?? null;

  // A campaign may lead with the trial offer; the length comes from the
  // resolved price, so switching ?interval= (or losing the catalog) can
  // never leave the headline quoting a figure the card disagrees with.
  const headline = resolveCampaignTitle(
    { title, title_no_trial: titleNoTrial },
    offer?.trialDays ?? null,
  );

  const [cageInput, setCageInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CageValidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eligible = result?.eligible === true;

  const checkCage = async () => {
    setError(null);
    setResult(null);
    setChecking(true);
    const outcome = await validateCageCode(cageInput);
    setChecking(false);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setResult(outcome.data);
  };

  // Hand off to the existing signup funnel.
  //
  // Single product: the price id is resolved from the catalog at render, so
  // this link is always current — nothing here is hardcoded the way a pasted
  // ?plan=4 campaign URL was.
  //
  // Basket: the SLUG goes over instead. The API resolves which prices that
  // means (src/billing/campaigns.py), so a visitor can't widen their own
  // basket into a free trial of everything we sell by editing the URL — and
  // the three price ids never have to survive a round trip through a query
  // string they can edit.
  const continueToSignup = () => {
    if (!offer) return;
    const cage = normalizeCage(cageInput);
    if (isBasket) {
      const qs = new URLSearchParams({ campaign: slug, cage });
      router.push(`/signup?${qs.toString()}`);
      return;
    }
    const [only] = offer.items;
    const qs = new URLSearchParams({
      plan: String(only.priceId),
      seats: String(only.seats),
      cage,
    });
    if (only.tierSlug) qs.set("tier", only.tierSlug);
    router.push(`/signup?${qs.toString()}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (eligible) {
      continueToSignup();
      return;
    }
    checkCage();
  };

  return (
    <>
      <Navbar />
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-14 items-start">
          {/* ---------- Selling copy (from the campaign markdown) ---------- */}
          <div>
            {eyebrow && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-semibold uppercase tracking-wide">
                {eyebrow}
              </span>
            )}
            <h1
              className={`text-3xl sm:text-4xl font-bold text-foreground leading-tight ${
                eyebrow ? "mt-4" : ""
              }`}
            >
              {headline}
            </h1>
            <div className="mt-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          </div>

          {/* ---------- Offer card + CAGE entry ---------- */}
          <div className="bg-card-bg border-2 border-primary rounded-xl p-6 shadow-lg shadow-primary/10 lg:sticky lg:top-28">
            {offer ? (
              <>
                {offer.items.length === 1 ? (
                  <p className="text-sm font-semibold text-foreground">
                    {offer.items[0].productName}
                  </p>
                ) : (
                  // A basket bills as one subscription, so it prices as one
                  // figure — but the visitor is being signed up to three
                  // separate things and the card has to say which. Itemised
                  // above the total, in the order they'll appear on the
                  // invoice (tier first).
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      Everything below, on one plan
                    </p>
                    <ul className="mt-3 space-y-2">
                      {offer.items.map((item) => (
                        <li
                          key={item.priceId}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <span className="flex items-start gap-2 text-foreground">
                            <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                            {item.productName}
                          </span>
                          <span className="text-muted whitespace-nowrap">
                            {formatMoney(item.totalCents, item.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <hr className="border-0 border-t border-border my-4" />
                  </>
                )}
                <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl font-bold text-foreground">
                    {formatMoney(offer.totalCents, offer.currency)}
                  </span>
                  <span className="text-sm text-muted">
                    / {periodNoun(offer.intervalMonths)}
                  </span>
                </div>
                <p className="text-sm text-muted mt-1.5">
                  {offer.seats} user{offer.seats === 1 ? "" : "s"}
                  {offer.intervalMonths > 1 && (
                    <>
                      {" · "}
                      {formatMoney(offer.perMonthCents, offer.currency)}/mo
                    </>
                  )}
                </p>
                {offer.savingsVsMonthlyCents !== null && (
                  <span className="inline-block mt-3 px-2 py-1 rounded bg-muted-light border border-border text-xs text-foreground">
                    Save {formatMoney(offer.savingsVsMonthlyCents, offer.currency)} vs. paying monthly
                  </span>
                )}
                {/* The trial is the headline now (campaigns lead with
                    "Free for {trial_days} days…"), so the card doesn't repeat
                    it — it leads with the price and the annual saving. The
                    reassurance strip below the fold still states the terms. */}
              </>
            ) : (
              // Catalog unreachable at render. Never invent a figure — point
              // at the page that always has the live one.
              <>
                <p className="text-sm font-semibold text-foreground">
                  Pricing is a click away
                </p>
                <p className="text-sm text-muted mt-2">
                  We couldn&apos;t load live pricing just now.{" "}
                  <Link href="/pricing" className="text-primary hover:underline">
                    See current plans and pricing
                  </Link>
                  .
                </p>
              </>
            )}

            <hr className="border-0 border-t border-border my-6" />

            {authLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : user ? (
              // Already a customer. Sending them through signup would only
              // bounce them to /dashboard, so offer the useful action instead.
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  You&apos;re signed in as{" "}
                  <span className="font-medium">{user.email}</span>.
                </p>
                <Button href="/pricing" variant="primary" className="w-full">
                  View plans and upgrade
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3" noValidate>
                <div>
                  <label
                    htmlFor="campaign-cage"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    Start with your CAGE code
                  </label>
                  <input
                    id="campaign-cage"
                    name="cage"
                    type="text"
                    value={cageInput}
                    onChange={(e) => {
                      setCageInput(e.target.value);
                      setResult(null);
                      setError(null);
                    }}
                    placeholder="e.g. 7Z016"
                    maxLength={10}
                    autoComplete="off"
                    aria-invalid={result !== null && !eligible}
                    className="w-full px-3 py-2.5 text-sm font-semibold tracking-wider uppercase border border-border bg-card-bg text-foreground rounded focus:ring-2 focus:ring-primary"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="p-3 bg-error/5 border border-error/20 text-error rounded text-sm"
                  >
                    {error}
                  </div>
                )}

                {result && !eligible && (
                  <div
                    role="alert"
                    className="p-3 bg-error/5 border border-error/20 text-error rounded text-sm"
                  >
                    <span className="font-medium">Not eligible.</span>{" "}
                    {result.reason ||
                      "Please contact support if you believe this is incorrect."}
                  </div>
                )}

                {eligible && (
                  <div className="p-3 bg-success/5 border border-success/20 text-success rounded text-sm">
                    <span className="font-medium">✓ Eligible.</span>{" "}
                    {result?.prefill?.legal_business_name && (
                      <>
                        Recognized as{" "}
                        <span className="font-medium">
                          {result.prefill.legal_business_name}
                        </span>
                        .
                      </>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={checking || (eligible && !offer)}
                >
                  {/* Once the CAGE clears, keep the offer's promise instead of
                      switching to process language ("create your account") —
                      the ✓ Eligible panel above already signals the step
                      changed, and the arrow marks this as the click that
                      leaves the page. Not derived from ctaLabel: that reads
                      as nonsense for a campaign whose CTA is "Check my CAGE
                      code". Falls back to neutral wording on a price that
                      sells without a trial, so the button never promises one
                      that isn't on offer. */}
                  {checking
                    ? "Checking…"
                    : eligible
                      ? offer?.trialDays
                        ? "Start my free trial →"
                        : "Continue to create your account →"
                      : ctaLabel || "Check my CAGE code"}
                </Button>

                <p className="text-xs text-muted">
                  We confirm your CAGE against SAM.gov, then you create your account.
                  No CAGE code yet?{" "}
                  <a
                    href="https://sam.gov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Apply on SAM.gov
                  </a>
                  .
                </p>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-muted">
          {offer !== null && offer.trialDays !== null && offer.trialDays > 0 && (
            <span>{offer.trialDays}-day trial, no payment method up front</span>
          )}
          <span>Payments processed securely by Stripe</span>
        </div>
      </main>
      <Footer />
    </>
  );
}
