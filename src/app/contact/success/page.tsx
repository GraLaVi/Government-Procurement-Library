"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

export default function ContactSuccessPage() {
  const { user } = useAuth();

  return (
    <>
      {/* Match /contact: Header for signed-in, Navbar for visitors. */}
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 ${
          user ? "" : "pt-28"
        }`}
      >
        <div className="bg-card-bg border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Message received</h1>
          <p className="text-muted mt-3 leading-relaxed">
            Thanks for reaching out. We&rsquo;ve sent a confirmation to your email
            and our team will reply as soon as we can.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button href="/" variant="outline">
              Back to homepage
            </Button>
            <Link
              href="/contact"
              className="text-primary text-sm font-medium hover:underline self-center"
            >
              Send another message
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
