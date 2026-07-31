"use client";

import { Header } from "@/components/layout/Header";
import { AppFooter } from "@/components/layout/AppFooter";
import { RequireNotResponder } from "@/components/auth/RequireNotResponder";

// Buyer-side RFQ pages (compose, batch, contacts, settings, detail). Same
// chrome + responder guard as the dashboard; lives in a route group so the
// vendor-facing /rfq/received and /rfq/respond trees keep their own layouts
// (responders must be able to reach those, so the guard stays here, not at
// the /rfq root).
export default function RfqBuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted-light flex flex-col">
      <Header showAccountLink={true} />
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RequireNotResponder>{children}</RequireNotResponder>
      </main>
      <AppFooter />
    </div>
  );
}
