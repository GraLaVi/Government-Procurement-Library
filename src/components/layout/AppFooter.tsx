"use client";

import Link from "next/link";
import { CookiePreferencesLink } from "@/components/layout/CookiePreferencesLink";
import { SupportWidget } from "@/components/support/SupportWidget";

/**
 * Slim footer for authenticated app shells (account, library, dashboard,
 * etc.). The full marketing Footer lives on public pages — this is the
 * compact equivalent: copyright + the legal links a signed-in user
 * might still need.
 *
 * Also the single mount point for <SupportWidget>: AppFooter is rendered by
 * exactly the authenticated app layouts, so mounting here scopes the JSM help
 * widget to signed-in pages without touching each layout individually.
 */
export function AppFooter() {
  return (
    <>
    <footer className="border-t border-border bg-card-bg/60 mt-auto">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted">
          <p>&copy; {new Date().getFullYear()} GPH. All rights reserved.</p>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/legal/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/legal/cookies"
              className="hover:text-foreground transition-colors"
            >
              Cookies
            </Link>
            <CookiePreferencesLink className="hover:text-foreground transition-colors text-left" />
            <Link
              href="/contact"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </Link>
            <a
              href="mailto:support@gphusa.com"
              className="hover:text-foreground transition-colors"
            >
              support@gphusa.com
            </a>
          </nav>
        </div>
      </div>
    </footer>
    <SupportWidget />
    </>
  );
}
