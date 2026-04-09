import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SessionExpiredProvider } from "@/contexts/SessionExpiredContext";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GPH - DoD Solicitation Intelligence Platform",
  description:
    "Track and win Department of Defense solicitations. Search DLA, DIBBS, and military branch opportunities with NSN/NIIN lookup, CAGE code intelligence, and real-time bid alerts.",
  keywords: [
    "DoD solicitations",
    "DLA contracts",
    "DIBBS",
    "defense logistics agency",
    "military procurement",
    "NSN search",
    "NIIN lookup",
    "CAGE codes",
    "DoDAAC",
    "defense contracting",
    "DoD procurement",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SessionExpiredProvider>
            <AuthProvider>
              {children}
              <SessionExpiredModal />
            </AuthProvider>
          </SessionExpiredProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
