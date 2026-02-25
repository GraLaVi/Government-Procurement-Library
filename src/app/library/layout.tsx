"use client";

import { Header } from "@/components/layout/Header";

interface LibraryLayoutProps {
  children: React.ReactNode;
}

export default function LibraryLayout({ children }: LibraryLayoutProps) {
  return (
    <div className="min-h-screen bg-muted-light">
      <Header showAccountLink={true} />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
