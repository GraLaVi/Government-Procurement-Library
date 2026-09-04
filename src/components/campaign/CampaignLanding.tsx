"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import {
  CheckIcon,
  DatabaseIcon,
  TargetIcon,
  ZapIcon,
} from "@/components/icons";
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

// Per-product copy for the rows a basket campaign lists under its headline,
// keyed by products.key.
//
// Only the icon, the summary line and three features are authored here. The
// NAME comes from the catalog (`productName` on the resolved offer), so a
// campaign page cannot call a product something other than the thing it is
// selling — the same rule that keeps prices off this page. The basket
// includes `request_for_quote`, so the row says "RFQ Add-on" and cannot
// quietly promise `request_for_quote_enterprise`'s feature list.
//
// Deliberately NOT the landing page's product copy (src/components/landing/
// Products.tsx). That copy is written for a comparison — its bullets quote
// per-user prices and its descriptions say "everything in Basic plus…" —
// both wrong beside a catalog-resolved bundle price on a page with no other
// tier in view.
//
// Three features, not five: they set inline under the summary, and the fourth
// wraps to a line that reads as a list nobody finishes. The full breakdown is
// one link away on /pricing, which is where it belongs.
//
// A product with no entry here still renders: catalog name, no summary, no
// features. That is the right failure for a page that must not invent claims
// about a product nobody has written copy for.
const CAMPAIGN_PRODUCT_COPY: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    summary: string;
    features: string[];
  }
> = {
  library_search_advanced: {
    icon: DatabaseIcon,
    summary: "The complete procurement picture.",
    features: [
      "Full procurement and award history",
      "Open solicitations by vendor",
      "Bid-matching profiles with full solicitation view",
    ],
  },
  request_for_quote: {
    icon: TargetIcon,
    summary: "Send RFQs and collect quotes without leaving the platform.",
    features: [
      "Structured RFQs with line-item detail",
      "Shared batch cart and private vendor book",
      "Response tracking across every recipient",
    ],
  },
  gph_analytics: {
    icon: ZapIcon,
    summary: "Know your market, your competitors, and what DLA is about to buy.",
    features: [
      "Win rate and competitor leaderboard",
      "Market prioritization — parts worth qualifying on",
      "DLA demand forecasts and stock levels",
    ],
  },
};

// How often the plan is charged, as an adverbial phrase that follows
// "billed": "$2,110 billed annually". The card's headline figure is always
// per month — see the offer card below — so the noun form ("/ year") this
// component used to need is gone; only the cadence sentence still varies.
function billedEvery(months: number): string {
  switch (months) {
    case 1:
      return "monthly";
    case 3:
      return "quarterly";
    case 6:
      return "every 6 months";
    case 12:
      return "annually";
    default:
      return `every ${months} months`;
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

  // ?interval= lets one SINGLE-PRODUCT campaign page be linked as either the
  // monthly or the annual offer — the same copy, a different price, and a
  // different price id carried into checkout. An unknown or unsold interval
  // falls back to the campaign file's own choice rather than showing nothing.
  //
  // A basket must ignore it. Its handoff carries the slug and nothing else —
  // that is what stops a visitor assembling their own basket in the URL — so
  // the chosen interval never reaches the API, which prices the basket at the
  // interval in its OWN registry (src/billing/campaigns.py). Honouring
  // ?interval= here would quote a monthly figure on a page that then bills
  // annually: the card would be advertising a price we have no way to sell.
  //
  // So a basket sells exactly one interval: its campaign's. To sell the same
  // basket month-to-month, register a SECOND campaign at that interval in
  // both repos — see docs/campaign-pages.md. That keeps the page honest and
  // gives the two offers separate landing counts, which one URL cannot.
  const requestedInterval = isBasket
    ? undefined
    : searchParams.get("interval")?.toLowerCase();
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

  // One row per product in the basket. Single-product campaigns get none —
  // the offer card already names the one thing on offer, and a lone row
  // repeating it is the same sentence twice.
  const rows =
    offer && offer.items.length > 1
      ? offer.items.map((item) => ({
          key: item.productKey,
          name: item.productName,
          ...CAMPAIGN_PRODUCT_COPY[item.productKey],
        }))
      : [];

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
            {/* The campaign file's body. A basket campaign leaves it empty —
                its products are tiles below, and the prose that used to sit
                here said less than they do. */}
            {content && (
              <div className="mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {content}
                </ReactMarkdown>
              </div>
            )}

            {/* Products as ruled rows inside one container, not three cards.
                Three bordered cards read as three separate purchases sitting
                next to each other — the opposite of the one plan the offer
                card is selling — and put the CAGE field below the fold on a
                laptop, which is the only thing this page asks anyone to do.
                Weight and the icon separate the rows; the single border holds
                them together. */}
            {rows.length > 0 && (
              /* One container around all three, not one per product. The
                 border is what says "this is a single plan"; the rules inside
                 it separate the parts without splitting them into three
                 things to buy. Transparent, so it sits on the page ground
                 rather than competing with the offer card's filled surface
                 alongside it. */
              <div className="mt-8 rounded-xl border border-border p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
                  What&apos;s included
                </h2>
                <div className="mt-4">
                  {rows.map((row) => {
                    const Icon = row.icon ?? CheckIcon;
                    return (
                      <div
                        key={row.key}
                        className="flex items-start gap-3.5 py-4 border-t border-border first:border-t-0 first:pt-0 last:pb-0"
                      >
                        <span className="flex-none w-[34px] h-[34px] rounded-[9px] bg-primary-light grid place-items-center">
                          <Icon className="w-[18px] h-[18px] text-primary" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-foreground">
                              {row.name}
                            </h3>
                            {/* "Included", not the catalog's "Add-on": on this
                                page all three are part of what the trial hands
                                over, and two of them being add-ons is a
                                billing fact, not something the visitor picks. */}
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                              Included
                            </span>
                          </div>
                          {row.summary && (
                            <p className="mt-1 text-sm text-muted">{row.summary}</p>
                          )}
                          {row.features && row.features.length > 0 && (
                            <ul className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-[13px] text-muted">
                              {row.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-1.5">
                                  <CheckIcon className="w-[13px] h-[13px] text-success flex-none" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* The one link off this page, and deliberately the last thing in
                the column. It is also where the two features each row had to
                drop went: feature-by-feature comparison belongs on /pricing,
                which already has the table — building a second one here would
                turn a page with a single action into a page with a decision. */}
            <p className="mt-6 text-sm text-muted">
              Want the feature-by-feature breakdown?{" "}
              <Link href="/pricing#compare" className="text-primary hover:underline">
                Compare all plans →
              </Link>
            </p>
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
                  // separate things and the card has to say which, in the
                  // order they'll appear on the invoice (tier first).
                  //
                  // Deliberately NOT itemised by price. The basket carries no
                  // bundle discount, so per-item figures sum to exactly the
                  // total below them: they add three more dollar amounts to
                  // the reader's path and no information. The names are the
                  // value; the one figure that matters is the one under them.
                  // (Re-itemise the moment a basket IS discounted — then the
                  // list is showing a saving rather than repeating a cost.)
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      Everything below, on one plan
                    </p>
                    <ul className="mt-3 space-y-2">
                      {offer.items.map((item) => (
                        <li
                          key={item.priceId}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                          <span>{item.productName}</span>
                        </li>
                      ))}
                    </ul>
                    <hr className="border-0 border-t border-border my-4" />
                  </>
                )}

                {/* What actually happens at checkout, in the card's loudest
                    voice: nothing is charged. The H1 says this too, but it
                    scrolls away — on mobile the card sits below the whole
                    body copy, and on desktop it stays stuck to the viewport
                    long after the headline is gone. This is the copy that is
                    on screen at the moment the CAGE field is filled in. */}
                {offer.trialDays !== null && offer.trialDays > 0 && (
                  <p className="text-base font-semibold text-foreground">
                    Free for {offer.trialDays} days
                    <span className="text-muted font-normal">
                      {" · "}no card required
                    </span>
                  </p>
                )}

                {/* The price, anchored per month even though the plan bills
                    annually. $175.83/mo is a figure a supplier can judge
                    against what the products save them; $2,110 is a
                    purchase-order-sized number, and leading with it invites
                    "let me think about it" on a page whose whole offer is
                    that thinking about it is free.

                    The annual total is NOT hidden — it sits directly below,
                    in the same breath as when it's charged. A price the
                    visitor discovers late reads as a price we were hiding,
                    and /signup quotes the full figure on its badge one click
                    from here anyway. */}
                <div
                  className={`flex items-baseline gap-2 flex-wrap ${
                    offer.trialDays ? "mt-3" : "mt-1"
                  }`}
                >
                  <span className="text-2xl font-bold text-foreground">
                    {formatMoney(
                      offer.intervalMonths > 1 ? offer.perMonthCents : offer.totalCents,
                      offer.currency,
                    )}
                  </span>
                  <span className="text-sm text-muted">/ month</span>
                </div>
                <p className="text-sm text-muted mt-1.5">
                  {/* On a monthly plan the figure above IS the charge, so
                      "billed monthly at $207" would only restate it. */}
                  {offer.intervalMonths > 1 && (
                    <>
                      {offer.trialDays ? "then " : ""}
                      {formatMoney(offer.totalCents, offer.currency)}{" "}
                      billed {billedEvery(offer.intervalMonths)}
                      {" · "}
                    </>
                  )}
                  {offer.seats} user{offer.seats === 1 ? "" : "s"}
                </p>
                {offer.savingsVsMonthlyCents !== null && (
                  <span className="inline-block mt-3 px-2 py-1 rounded bg-muted-light border border-border text-xs text-foreground">
                    Save {formatMoney(offer.savingsVsMonthlyCents, offer.currency)} vs. paying monthly
                  </span>
                )}
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
                      leaves the page. Not derived from ctaLabel, which a
                      campaign may write as a step ("Check my CAGE code")
                      rather than the outcome. Falls back to neutral wording on a price that
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
