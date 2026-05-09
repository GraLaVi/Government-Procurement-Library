"use client";

import { Header } from "@/components/layout/Header";
import { AppFooter } from "@/components/layout/AppFooter";

interface BidMatchingLayoutProps {
  children: React.ReactNode;
}

export default function BidMatchingLayout({ children }: BidMatchingLayoutProps) {
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
