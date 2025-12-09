"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { usePathname } from "next/navigation";

interface AccountLayoutProps {
  children: React.ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const { isLoading } = useAuth();
  const pathname = usePathname();

  // On the main account page, show Sign Out button instead of Account link
  const isMainAccountPage = pathname === "/account";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted-light">
      <Header showAccountLink={!isMainAccountPage} />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
