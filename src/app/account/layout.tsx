"use client";

import { Header } from "@/components/layout/Header";
import { AppFooter } from "@/components/layout/AppFooter";
import { RequireNotResponder } from "@/components/auth/RequireNotResponder";
import { usePathname } from "next/navigation";

interface AccountLayoutProps {
  children: React.ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();

  const isMainAccountPage = pathname === "/account";
  // Responders keep basic account access (password, profile) but the
  // bid-matching account view is gated off for them.
  const isBidMatchingView = pathname?.startsWith("/account/bidmatching") ?? false;

  return (
    <div className="min-h-screen bg-muted-light flex flex-col">
      <Header showAccountLink={!isMainAccountPage} />
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isBidMatchingView ? (
          <RequireNotResponder redirectTo="/account">{children}</RequireNotResponder>
        ) : (
          children
        )}
      </main>
      <AppFooter />
    </div>
  );
}
