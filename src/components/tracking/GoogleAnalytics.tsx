"use client";

/**
 * GA4 (gtag.js) for public pages only.
 *
 * Three things this component is careful about, all of which are easy
 * to get wrong with the copy-paste snippet Google hands you:
 *
 * 1. **Consent.** The snippet loads unconditionally. We don't: gtag.js
 *    is never injected until the visitor accepts the `analytics`
 *    category, so a visitor who declines has no Google request in their
 *    network log at all — not a cookieless ping, nothing. That's what
 *    /legal/cookies now promises, so keep it that way.
 *
 * 2. **Behind-gate pages are out of scope.** The tag exists to measure
 *    acquisition (landing → signup), and signed-in usage is measured by
 *    our own backend. Firing here would also send product URLs — which
 *    embed solicitation and CAGE identifiers — to Google. See
 *    GATED_PREFIXES.
 *
 * 3. **Exactly one pageview per page.** `gtag('config')` fires a
 *    page_view on load, but the App Router does client-side navigation,
 *    so that initial one is the *only* one you'd ever get — every
 *    subsequent route change would be invisible. The fix is
 *    `send_page_view: false` plus a manual page_view per pathname.
 *    Getting halfway (adding the manual event but leaving the config
 *    default) is what double-counts the entry page.
 */

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useConsent } from "@/contexts/ConsentContext";

/** Public by design — it ships in the page source of every GA4 site.
 *  Overridable so a staging deploy can point at a throwaway property
 *  instead of polluting the numbers we measure bot traffic against. */
const MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-GB3CHK3839";

/**
 * Route prefixes that require a session (or a signed token). Matched as
 * `=== prefix || startsWith(prefix + "/")` so a future public route
 * like `/libraries` can't be swallowed by the `/library` entry.
 *
 * `/rfq` is here in full, including `/rfq/respond/[token]`. That page
 * has no login, but it's reached only from a vendor invitation email —
 * it's not acquisition traffic, and counting it would inflate the
 * human side of the log-delta comparison with people who were emailed
 * a link.
 */
const GATED_PREFIXES = [
  "/account",
  "/analytics",
  "/bidmatching",
  "/dashboard",
  "/library",
  "/rfq",
];

function isPublicPath(pathname: string): boolean {
  return !GATED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Campaign parameters from the URL the visitor actually arrived on.
 *
 * The pageview cannot fire until analytics is accepted, and by then the
 * visitor may have clicked off the landing page — at which point
 * `window.location.href` no longer carries the `utm_*` that identify the
 * campaign, and GA4 books the whole session as direct/none. That is the
 * single biggest attribution leak on campaign traffic: someone arrives from
 * an email, reads, browses to /pricing, accepts the banner there, and the
 * campaign gets no credit for a visit it paid for.
 *
 * So the parameters are read once on entry — before any consent decision,
 * because reading the URL the browser already navigated to is not tracking —
 * and replayed onto the first pageview GA ever sees.
 *
 * Deliberately a module variable and NOT a cookie or storage: this lives in
 * the tab's JS memory for the life of the document, so nothing is written to
 * the visitor's device and the consent promise in /legal/cookies holds.
 */
let landingCampaign: Record<string, string> | null = null;
let landingCaptured = false;
/** Only the first pageview may carry replayed params; after that the URL
 *  speaks for itself and re-appending would attribute later pages twice. */
let firstPageViewSent = false;

/** `utm_*` plus the click ids GA4 attributes from. */
function campaignParamsOf(search: string): Record<string, string> | null {
  const found: Record<string, string> = {};
  new URLSearchParams(search).forEach((value, key) => {
    if (key.startsWith("utm_") || ["gclid", "gbraid", "wbraid"].includes(key)) {
      found[key] = value;
    }
  });
  return Object.keys(found).length > 0 ? found : null;
}

/** The current URL, with the landing campaign params restored if this page
 *  lost them.
 *
 *  All or nothing: a URL that carries any campaign parameter of its own is
 *  left exactly as it is. Merging the two would invent a hybrid that never
 *  existed — the current page's source with the landing page's campaign —
 *  and a wrong attribution is worse than the direct/none it replaces. */
function locationWithLandingCampaign(): string {
  const url = new URL(window.location.href);
  if (!landingCampaign || campaignParamsOf(url.search)) return url.href;
  for (const [key, value] of Object.entries(landingCampaign)) {
    url.searchParams.set(key, value);
  }
  return url.href;
}

/** Define window.gtag ourselves rather than waiting for gtag.js. Calls
 *  made before the remote script loads queue in dataLayer and replay on
 *  load, so this removes any ordering dependency between the <Script>
 *  tag and our effects. Must push `arguments` — gtag.js does not treat
 *  a pushed array the same way. */
function ensureGtag(): NonNullable<Window["gtag"]> {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  return window.gtag;
}

export function GoogleAnalytics() {
  const { consent } = useConsent();
  const pathname = usePathname();

  // `consent.analytics` is false pre-decision (see DEFAULT_PRE_DECISION),
  // so this stays false until the visitor actively accepts.
  //
  // The NODE_ENV check keeps `npm run dev` out of the property. That
  // matters more than usual here: the whole point of this tag is to
  // compare its human count against nginx's request count, and a few
  // hundred dev pageviews would quietly bias the bot estimate. It's a
  // build-time constant, so it can't cause a hydration mismatch.
  const enabled =
    process.env.NODE_ENV === "production" &&
    consent.analytics &&
    isPublicPath(pathname ?? "/");

  // Capture the entry URL's campaign params. Declared first so it has run
  // before the pageview effect on any commit, and deliberately NOT gated on
  // `enabled`: a visitor who accepts the banner a page or two later is
  // exactly the case this exists to rescue. Reads the URL only — no network
  // call, no storage, nothing that needs consent.
  useEffect(() => {
    if (landingCaptured) return;
    landingCaptured = true;
    landingCampaign = campaignParamsOf(window.location.search);
  }, []);

  // Bootstrap. Separate from the page_view effect so it can't re-run on
  // navigation — a second `config` for the same property would restart
  // the session and double-count.
  useEffect(() => {
    if (!enabled) return;
    const gtag = ensureGtag();
    gtag("js", new Date());
    gtag("config", MEASUREMENT_ID, { send_page_view: false });
  }, [enabled]);

  // One page_view per pathname, including the first. Effects run in
  // declaration order within a commit, so `config` above is always
  // queued ahead of this.
  useEffect(() => {
    if (!enabled) return;
    // The first pageview is the one GA attributes the session from, so it
    // gets the landing campaign params restored if consent arrived after
    // the visitor moved on. Every later pageview reports its real URL.
    const isFirst = !firstPageViewSent;
    firstPageViewSent = true;
    ensureGtag()("event", "page_view", {
      // Full href, not pathname: campaign links carry their utm_* in the
      // query string and GA4 reads attribution off page_location.
      page_location: isFirst ? locationWithLandingCampaign() : window.location.href,
      // Correct on entry (the case that matters for campaign landings);
      // on a client-side navigation the App Router applies the new
      // <title> after this commit, so this can lag by one page. Reading
      // it a frame later would fix that but requestAnimationFrame never
      // fires in a background tab — which would silently drop the
      // pageview for anyone opening the campaign link in a new tab.
      // A stale title is the cheaper error than a missing visit.
      page_title: document.title,
    });
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <Script
      id="ga4-gtag-js"
      src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  );
}
