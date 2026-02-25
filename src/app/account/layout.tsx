"use client";

import { Header } from "@/components/layout/Header";
import { usePathname } from "next/navigation";

interface AccountLayoutProps {
  children: React.ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();

  const isMainAccountPage = pathname === "/account";

  return (
    <div className="min-h-screen bg-muted-light">
      <Header showAccountLink={!isMainAccountPage} />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
