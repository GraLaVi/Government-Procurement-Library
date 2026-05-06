"use client";

import { useConsent } from "@/contexts/ConsentContext";

/**
 * Footer link that re-opens the cookie consent settings modal at any
 * time. Lives in a separate file so the Footer can stay a server
 * component for everything else.
 */
export function CookiePreferencesLink({ className }: { className?: string }) {
  const { openSettings } = useConsent();
  return (
    <button
      type="button"
      onClick={openSettings}
      className={
        className ??
        "text-white/70 hover:text-white transition-colors duration-200 text-sm text-left"
      }
    >
      Cookie preferences
    </button>
  );
}
