"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConsent } from "@/contexts/ConsentContext";
import { useTheme } from "@/contexts/ThemeContext";

// Public embeddable-widget key for our Jira Service Management portal. Safe to
// commit (it only identifies which portal the widget opens), but overridable
// per-environment so staging can file into a different project without a code
// change.
const JSD_KEY =
  process.env.NEXT_PUBLIC_JSD_WIDGET_KEY ??
  "4093c9c8-9664-499a-98b0-209012b76f14";
const JSD_BASE_URL = "https://jsd-widget.atlassian.com";
const SCRIPT_ID = "jsd-widget-embed";
// The embed renders its launcher into an <iframe id="jsd-widget">.
const WIDGET_IFRAME_ID = "jsd-widget";

/**
 * Atlassian Jira Service Management "Help" widget (bottom-right launcher).
 *
 * Mounted from <AppFooter>, which is only rendered by the authenticated app
 * shells (dashboard, library, account, analytics, bidmatching) — so the widget
 * never appears on marketing/login/legal pages. The isAuthenticated guard is a
 * belt-and-braces check in case AppFooter is ever reused elsewhere.
 *
 * Gated behind functional cookie consent: the embed loads a third-party iframe
 * from Atlassian that sets its own cookies/storage, so we don't inject it until
 * the visitor has functional consent on.
 *
 * Why manual injection instead of next/script: embed.js registers its
 * initialiser inside a `DOMContentLoaded` listener and only then queries the
 * DOM for `script[data-jsd-embedded]`. In a hydrated SPA that event has long
 * since fired by the time any deferred script runs, so next/script (lazyOnload
 * or afterInteractive) loads the file but the widget never initialises. We
 * append the script ourselves and re-dispatch DOMContentLoaded once it has
 * executed, which is what actually triggers the render.
 *
 * Why the script is injected at most once and never removed: `enabled` can
 * toggle true → false → true within a single page (an auth-refresh blip or a
 * consent change during sign-in). If teardown removed the <script>, the next
 * enable would inject a *second* embed.js — and because each embed.js registers
 * its own DOMContentLoaded initialiser, our re-dispatch would fire both and
 * embed.js aborts with "could not render more than one widget on a single
 * page". So we load embed.js once, leave it in place, and only add/remove the
 * visible iframe launcher. A full reload is still needed for a completely clean
 * slate on sign-out (the embed has no public unload API).
 */
export function SupportWidget() {
  const { isAuthenticated } = useAuth();
  const { consent } = useConsent();
  const { resolvedTheme } = useTheme();

  const enabled = isAuthenticated && consent.functional;

  useEffect(() => {
    if (!enabled) {
      // Signed out / consent withdrawn: remove only the visible launcher and
      // its iframe (where the third-party cookies/storage live). The embed
      // script stays put — see the component doc comment for why.
      document
        .querySelectorAll(`#${WIDGET_IFRAME_ID}, iframe#${WIDGET_IFRAME_ID}`)
        .forEach((el) => el.remove());
      return;
    }

    // embed.js only initialises on DOMContentLoaded, which fired long before
    // this hydrated SPA mounted, so we re-dispatch it to trigger a render.
    // Never dispatch while a launcher already exists, or embed.js re-runs its
    // initialiser on the live widget and aborts with the duplicate-widget error.
    const renderWidget = () => {
      if (!document.getElementById(WIDGET_IFRAME_ID)) {
        document.dispatchEvent(new Event("DOMContentLoaded"));
      }
    };

    // Already loaded earlier this page (e.g. the user navigated, or signed out
    // and back in). Don't inject a second embed.js — just re-render the
    // launcher if it was torn down.
    if (document.getElementById(SCRIPT_ID)) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `${JSD_BASE_URL}/assets/embed.js`;
    script.async = true;
    script.setAttribute("data-jsd-embedded", "");
    script.setAttribute("data-key", JSD_KEY);
    script.setAttribute("data-base-url", JSD_BASE_URL);

    // Re-fire DOMContentLoaded once the script has executed so the initialiser
    // it just registered actually runs.
    script.addEventListener("load", renderWidget);

    document.body.appendChild(script);
  }, [enabled]);

  /*
   * Paint the launcher's canvas to match our theme.
   *
   * The white box was never Atlassian's palette — it is the iframe's own
   * CANVAS. Measured in-browser (dark theme, white widget): the only painted
   * element inside is the round teal button (`#help-button.icon`); the inner
   * <html> and <body> are both rgba(0,0,0,0). What shows through is the UA
   * base color, and that is chosen by the used `color-scheme` of the EMBEDDED
   * document's root — which Atlassian never declares, so it computes to
   * `normal` and the base color is white.
   *
   * `prefers-color-scheme` inside the frame is already correct (the globals.css
   * rule on the iframe element propagates it, measured `true` in dark). But a
   * preference is not an opt-in: a document that declares no `color-scheme`
   * gets the light canvas regardless of what the media query reports. That is
   * the whole bug, and it is why the previous attempt could not work — it tried
   * to drive a matchMedia listener writing `data-color-mode` onto the inner
   * <html>, and that element carries no attributes at all.
   *
   * The launcher is same-origin (embed.js builds it with document.write and no
   * src), so we can set the property on the inner root directly. No event to
   * manufacture, no race against the frame's init: whenever the frame exists
   * and whenever the theme changes, state the scheme and the canvas follows.
   */
  useEffect(() => {
    if (!enabled) return;

    let frame: HTMLIFrameElement | null = null;
    let observer: MutationObserver | null = null;

    const paint = () => {
      // Null while the frame is cross-origin or not yet written; the load
      // handler below covers the second case.
      const root = frame?.contentDocument?.documentElement;
      if (root) root.style.colorScheme = resolvedTheme;
    };

    const attach = (found: HTMLIFrameElement) => {
      frame = found;
      // document.write implies document.open(), which wipes whatever we set on
      // the blank document that preceded it — so paint again once the written
      // document has loaded, not only on the node appearing.
      found.addEventListener("load", paint);
      paint();
    };

    const existing = document.getElementById(WIDGET_IFRAME_ID);
    if (existing instanceof HTMLIFrameElement) {
      attach(existing);
    } else {
      // embed.js appends the launcher whenever its bundle lands, with no event
      // to await — watch for the node instead of polling.
      observer = new MutationObserver(() => {
        const added = document.getElementById(WIDGET_IFRAME_ID);
        if (added instanceof HTMLIFrameElement) {
          observer?.disconnect();
          observer = null;
          attach(added);
        }
      });
      observer.observe(document.body, { childList: true });
    }

    return () => {
      observer?.disconnect();
      frame?.removeEventListener("load", paint);
    };
  }, [enabled, resolvedTheme]);

  return null;
}
