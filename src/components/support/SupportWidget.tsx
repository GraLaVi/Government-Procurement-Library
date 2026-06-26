"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConsent } from "@/contexts/ConsentContext";

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
 */
export function SupportWidget() {
  const { isAuthenticated } = useAuth();
  const { consent } = useConsent();

  const enabled = isAuthenticated && consent.functional;

  useEffect(() => {
    if (enabled) {
      // Idempotent: the script (and its widget) persist across in-app
      // navigation, so don't re-inject if it's already there.
      if (document.getElementById(SCRIPT_ID)) return;

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `${JSD_BASE_URL}/assets/embed.js`;
      script.async = true;
      script.setAttribute("data-jsd-embedded", "");
      script.setAttribute("data-key", JSD_KEY);
      script.setAttribute("data-base-url", JSD_BASE_URL);

      // embed.js only initialises on DOMContentLoaded; re-fire it after the
      // script executes so the listener it just registered actually runs.
      script.addEventListener("load", () => {
        document.dispatchEvent(new Event("DOMContentLoaded"));
      });

      document.body.appendChild(script);
      return;
    }

    // Disabled (signed out, or functional consent withdrawn): tear down the
    // script and the launcher/iframe it injected. A fresh page load is still
    // needed for a fully clean slate — the embed has no public unload API —
    // but this removes the visible widget immediately.
    document.getElementById(SCRIPT_ID)?.remove();
    document
      .querySelectorAll(`#${WIDGET_IFRAME_ID}, iframe#${WIDGET_IFRAME_ID}`)
      .forEach((el) => el.remove());
  }, [enabled]);

  return null;
}
