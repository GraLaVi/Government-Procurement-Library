"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

interface ContentPlaceholderProps {
  title: string;
  /** One sentence describing what this page will eventually cover. */
  blurb: string;
}

/**
 * Shared shell for marketing/help pages whose real content is still
 * being written. Keeps inbound links from 404'ing while clearly
 * signaling that copy is coming. The visual treatment matches the
 * legal placeholder, minus the legal/counsel-specific language.
 */
export function ContentPlaceholder({ title, blurb }: ContentPlaceholderProps) {
  const { user } = useAuth();

  return (
    // min-h-screen flex column pins the footer to the bottom of the
    // viewport even when the body has very little content — same
    // sticky-footer pattern AccountLayout uses.
    <div className="min-h-screen flex flex-col">
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`flex-1 w-full max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 ${
          user ? "" : "pt-28"
        }`}
      >
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <div className="mt-6 p-4 bg-warning/5 border border-warning/20 rounded-lg">
          <p className="text-sm text-warning font-medium">Coming soon</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            We&rsquo;re still putting this page together. In the meantime,
            reach out through the{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact form
            </Link>{" "}
            with any questions and we&rsquo;ll respond directly.
          </p>
        </div>
        <p className="text-sm text-muted mt-6 leading-relaxed">{blurb}</p>
      </main>
      <Footer />
    </div>
  );
}
