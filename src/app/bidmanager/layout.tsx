"use client";

import { Header } from "@/components/layout/Header";
import { AppFooter } from "@/components/layout/AppFooter";
import { RequireNotResponder } from "@/components/auth/RequireNotResponder";

// Bid Manager pages (Send bids, the bid editor, settings). The Bid Worklist
// is /bidmatching, under its own layout.
// Same chrome and responder guard as the RFQ buyer pages. The pages are
// reached from the Bid Manager dropdown in the header.
export default function BiddingLayout({ children }: { children: React.ReactNode }) {
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
