"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { AppFooter } from "@/components/layout/AppFooter";
import { RequireNotResponder } from "@/components/auth/RequireNotResponder";

// The Bid Manager pages a bidder moves between. The bid editor
// (/bidmanager/[id]) is reached from these and has its own back link, so it
// shows no tabs.
const SECTIONS = [
  { href: "/bidmanager/matches", label: "Bid on matches" },
  { href: "/bidmanager", label: "Send bids" },
  { href: "/bidmanager/settings", label: "Settings" },
];

// Bid Manager pages (Bid on matches, Send bids, the bid editor, settings).
// Same chrome and responder guard as the RFQ buyer pages.
export default function BiddingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showTabs = SECTIONS.some((s) => s.href === pathname);
  return (
    <div className="min-h-screen bg-muted-light flex flex-col">
      <Header showAccountLink={true} />
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RequireNotResponder>
          {showTabs && (
            <nav aria-label="Bid Manager" className="mb-6 flex items-center gap-1 border-b border-border overflow-x-auto">
              {SECTIONS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  aria-current={s.href === pathname ? "page" : undefined}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    s.href === pathname
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          )}
          {children}
        </RequireNotResponder>
      </main>
      <AppFooter />
    </div>
  );
}
