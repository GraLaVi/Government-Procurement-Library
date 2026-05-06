"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

interface LegalPlaceholderProps {
  title: string;
  /** One sentence describing what this document will cover. */
  blurb: string;
}

/**
 * Shared shell for legal pages whose final copy is pending counsel
 * review. Keeps the footer links from 404'ing while clearly signaling
 * to readers that real text is coming.
 */
export function LegalPlaceholder({ title, blurb }: LegalPlaceholderProps) {
  const { user } = useAuth();

  return (
    <>
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 ${
          user ? "" : "pt-28"
        }`}
      >
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <div className="mt-6 p-4 bg-warning/5 border border-warning/20 rounded-lg">
          <p className="text-sm text-warning font-medium">Draft pending legal review</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            We&rsquo;re finalizing the text of this document with counsel.
            Until it&rsquo;s posted, please reach out through the{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact form
            </Link>{" "}
            with any specific questions and we&rsquo;ll respond directly.
          </p>
        </div>
        <p className="text-sm text-muted mt-6 leading-relaxed">{blurb}</p>
        <p className="text-sm text-muted mt-4 leading-relaxed">
          For the cookies and browser storage we use today, see our{" "}
          <Link href="/legal/cookies" className="text-primary hover:underline">
            cookie policy
          </Link>
          .
        </p>
      </main>
      <Footer />
    </>
  );
}
