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
    ensureGtag()("event", "page_view", {
      // Full href, not pathname: campaign links carry their utm_* in the
      // query string and GA4 reads attribution off page_location.
      page_location: window.location.href,
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
