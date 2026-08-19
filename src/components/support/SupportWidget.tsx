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
   * Push our theme into the widget once it exists.
   *
   * The CSS rule (globals.css, `:root[data-theme="dark"] #jsd-widget`) is the
   * declarative half and it works — but only for a theme change made while the
   * widget is already running. It cannot fix startup, because of how the two
   * sides are sequenced:
   *
   *   - layout.tsx renders <html> with NO data-theme, and there is no
   *     pre-hydration script; ThemeContext adds the attribute in an effect.
   *   - Atlassian's bundle resolves its palette exactly once at init
   *     (`useState(resolve(colorMode))` over prefers-color-scheme) and after
   *     that only reacts to a media-query CHANGE event.
   *
   * So the widget samples the scheme while the page is still unmarked, latches
   * light, and never re-reads it. Toggling the theme by hand produces the
   * change event it was waiting for, which is why that looked fixed until the
   * next reload.
   *
   * The fix is to manufacture that change after the frame exists: set the
   * opposite scheme, then the real one on the next frame. Two computed-value
   * changes, so the listener inside the frame fires regardless of what it
   * latched at init. Only needed for dark — light is what it already assumed,
   * and flipping through dark there would flash the widget.
   */
  useEffect(() => {
    if (!enabled || resolvedTheme !== "dark") return;

    let raf = 0;
    const force = (frame: HTMLIFrameElement) => {
      frame.style.colorScheme = "light";
      raf = window.requestAnimationFrame(() => {
        frame.style.colorScheme = "dark";
      });
    };

    const frame = document.getElementById(WIDGET_IFRAME_ID);
    if (frame instanceof HTMLIFrameElement) {
      force(frame);
      return () => window.cancelAnimationFrame(raf);
    }

    // embed.js appends the launcher to <body> whenever its bundle finishes, so
    // there is no event to await — watch for the node instead of polling.
    const observer = new MutationObserver(() => {
      const added = document.getElementById(WIDGET_IFRAME_ID);
      if (added instanceof HTMLIFrameElement) {
        observer.disconnect();
        force(added);
      }
    });
    observer.observe(document.body, { childList: true });
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [enabled, resolvedTheme]);

  return null;
}
