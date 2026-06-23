"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

export function SupportLanding() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`flex-1 w-full max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 ${
          user ? "" : "pt-28"
        }`}
      >
        <h1 className="text-3xl font-bold text-foreground">Support</h1>
        <p className="text-muted mt-2">
          We&rsquo;re here to help you get the most out of Government Procurement Hub.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/help"
            className="block rounded-lg border border-border bg-card-bg px-5 py-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="font-medium text-foreground">Help Center</span>
            <span className="block text-sm text-muted mt-1">
              Step-by-step guides for bid matching, searches, and account management.
            </span>
          </Link>
          <Link
            href="/help/faq"
            className="block rounded-lg border border-border bg-card-bg px-5 py-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="font-medium text-foreground">FAQ</span>
            <span className="block text-sm text-muted mt-1">
              Quick answers to common questions about using the platform.
            </span>
          </Link>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card-bg px-6 py-5">
          <h2 className="text-lg font-semibold text-foreground">Still need help?</h2>
          <p className="text-sm text-muted mt-2">
            Reach our team and we&rsquo;ll respond directly. You can also email{" "}
            <a href="mailto:support@gphusa.com" className="text-primary hover:underline">
              support@gphusa.com
            </a>{" "}
            or call (507) 246-1551.
          </p>
          <Link
            href="/contact"
            className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
          >
            Contact support →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
