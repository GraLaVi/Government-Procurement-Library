"use client";

import { Header } from "@/components/layout/Header";
import { AppFooter } from "@/components/layout/AppFooter";

// Authenticated responders (and any logged-in customer) get the normal app
// chrome on the "RFQs received" pages. The public token-based respond page
// (`/rfq/respond/[token]`) is intentionally NOT under this layout — that
// vendor may not be logged in, so it stays a bare, focused page.
export default function RfqReceivedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted-light flex flex-col">
      <Header showAccountLink={true} />
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
