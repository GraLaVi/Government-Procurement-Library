"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

// The public RFQ respond page is reached by vendors who usually aren't logged
// in. We wrap it in the marketing Navbar + Footer (the same chrome as the
// public home page) so responders can see they're on GPH and click through to
// the home page if curious — without exposing the authenticated app nav.
export default function RfqRespondLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted-light">
      <Navbar />
      {/* Navbar is fixed (h-16); offset the content so it isn't covered. */}
      <main className="flex-1 w-full pt-24 pb-12">{children}</main>
      <Footer />
    </div>
  );
}
