import type { Metadata } from "next";
import { Figtree, Roboto_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SessionExpiredProvider } from "@/contexts/SessionExpiredContext";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";
import { ConsentProvider } from "@/contexts/ConsentContext";
import "./globals.css";

// Brand display + body. Figtree handles the wordmark (700 with tight overlap),
// headings (600), and body/UI (400, 500) per docs/plans/branding_guidelines.md.
const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Monospace for structured data fields: NSNs, CAGE codes, contract numbers,
// $ amounts, quantities. Apply via `.data-field` utility class.
// Loading 400/500/600/700 so common Tailwind weight modifiers
// (`font-medium`, `font-semibold`, `font-bold`) render the real cut rather
// than a browser-synthesized "faux bold" that looks blurry/3D.
const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GPH - Federal Procurement Intelligence",
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
        className={`${figtree.variable} ${robotoMono.variable} antialiased`}
      >
        <ConsentProvider>
          <ThemeProvider>
            <SessionExpiredProvider>
              <AuthProvider>
                {children}
                <SessionExpiredModal />
              </AuthProvider>
            </SessionExpiredProvider>
          </ThemeProvider>
        </ConsentProvider>
      </body>
    </html>
  );
}
