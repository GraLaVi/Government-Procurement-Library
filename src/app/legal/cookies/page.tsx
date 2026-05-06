"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useConsent } from "@/contexts/ConsentContext";

const LAST_UPDATED = "May 5, 2026";

interface CookieRow {
  name: string;
  storage: string;
  category: string;
  purpose: string;
  expiry: string;
}

const COOKIES: CookieRow[] = [
  {
    name: "govt_proc_hub_access_token",
    storage: "Cookie (httpOnly)",
    category: "Strictly necessary",
    purpose: "Signed-in session token (JWT). Without it you can't stay logged in.",
    expiry: "8 hours",
  },
  {
    name: "govt_proc_hub_refresh_token",
    storage: "Cookie (httpOnly)",
    category: "Strictly necessary",
    purpose: "Refreshes your access token in the background so you don't get logged out mid-task.",
    expiry: "7 days",
  },
  {
    name: "gph_cookie_consent",
    storage: "Cookie",
    category: "Strictly necessary",
    purpose: "Records the cookie-preference choice you made on this banner.",
    expiry: "12 months",
  },
  {
    name: "theme",
    storage: "localStorage",
    category: "Functional",
    purpose: "Remembers your light/dark theme preference across visits.",
    expiry: "Until you clear browser storage",
  },
  {
    name: "gph_pending_signup",
    storage: "sessionStorage",
    category: "Functional",
    purpose: "Holds in-progress signup form data while you move between the signup and pricing pages. Cleared once you complete checkout.",
    expiry: "Closes with the tab",
  },
  {
    name: "gph_waitlist / gph_waitlist_submitted",
    storage: "localStorage",
    category: "Functional",
    purpose: "Tracks that you've joined our trial waitlist so we don't ask again.",
    expiry: "Until you clear browser storage",
  },
];

export default function CookiePolicyPage() {
  const { user } = useAuth();
  const { openSettings } = useConsent();

  return (
    <>
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 ${
          user ? "" : "pt-28"
        }`}
      >
        <h1 className="text-3xl font-bold text-foreground">Cookie policy</h1>
        <p className="text-xs text-muted mt-1">Last updated: {LAST_UPDATED}</p>

        <p className="text-sm text-muted mt-6 leading-relaxed">
          This page lists every cookie and browser-storage entry the
          Government Procurement Hub website uses, what it&rsquo;s for, and how
          long it lives. We don&rsquo;t use Google Analytics, advertising
          pixels, or any third-party tracking tools today. If that
          changes we&rsquo;ll update this page and re-prompt you for consent.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={openSettings}>
            Change my preferences
          </Button>
        </div>

        <h2 className="text-xl font-semibold text-foreground mt-10">
          What we store
        </h2>
        <div className="mt-4 overflow-x-auto bg-card-bg border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-muted-light text-muted">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Storage</th>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-left px-4 py-3 font-semibold">Purpose</th>
                <th className="text-left px-4 py-3 font-semibold">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COOKIES.map((row) => (
                <tr key={row.name} className="align-top">
                  <td className="px-4 py-3 font-mono text-xs">{row.name}</td>
                  <td className="px-4 py-3 text-muted">{row.storage}</td>
                  <td className="px-4 py-3 text-muted">{row.category}</td>
                  <td className="px-4 py-3 text-foreground">{row.purpose}</td>
                  <td className="px-4 py-3 text-muted">{row.expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold text-foreground mt-10">
          Categories
        </h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-semibold text-foreground">Strictly necessary</dt>
            <dd className="text-muted leading-relaxed">
              The site can&rsquo;t function without these. They keep you signed
              in and remember your cookie-preference choice. They&rsquo;re
              always on and aren&rsquo;t affected by the consent banner.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Functional</dt>
            <dd className="text-muted leading-relaxed">
              Remember preferences (like dark mode) and let multi-step
              forms keep their state across pages. Off by default; turn
              them on through the consent banner if you want them.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Analytics</dt>
            <dd className="text-muted leading-relaxed">
              Not used today. Reserved so we can ask permission cleanly
              if we ever add page-view or feature-usage measurement.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Marketing</dt>
            <dd className="text-muted leading-relaxed">
              Not used today. We don&rsquo;t run advertising, pixels, or
              cross-site tracking. Reserved category so the choice
              carries forward if that ever changes.
            </dd>
          </div>
        </dl>

        <h2 className="text-xl font-semibold text-foreground mt-10">
          Third-party services
        </h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          When you check out a paid plan, we redirect you to{" "}
          <a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Stripe
          </a>{" "}
          to handle payment. Stripe may set its own cookies on
          stripe.com (e.g. for fraud prevention). Those are governed by
          Stripe&rsquo;s privacy policy, not ours.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-10">
          Changing your mind
        </h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          You can change your cookie preferences any time from the
          &ldquo;Cookie preferences&rdquo; link in the site footer or by
          clicking the button at the top of this page. Clearing your
          browser cookies will also reset your choice — the banner will
          reappear on your next visit.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-10">
          Questions?
        </h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          Reach us through the{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact form
          </Link>
          .
        </p>
      </main>
      <Footer />
    </>
  );
}
