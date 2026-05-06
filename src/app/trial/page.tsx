"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckIcon } from "@/components/icons";
import { hasConsent } from "@/lib/consent/storage";

const waitlistBenefits = [
  "Early access before public launch",
  "Live DLA and DIBBS solicitation feeds",
  "NSN/NIIN part search and cross-reference",
  "CAGE code and DoDAAC intelligence",
  "Automated DoD solicitation alerts",
  "Free during the beta period",
];

export default function WaitlistPage() {
  const [formData, setFormData] = useState({
    email: "",
    company: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("gph_waitlist_submitted")) {
      setSubmitted(true);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Replace with API call when backend endpoint is ready
    if (hasConsent("functional")) {
      const existing = JSON.parse(localStorage.getItem("gph_waitlist") || "[]");
      existing.push({
        email: formData.email,
        company: formData.company,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("gph_waitlist", JSON.stringify(existing));
      localStorage.setItem("gph_waitlist_submitted", "true");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-muted-light flex">
      {/* Left side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary dark:bg-[#1C2C54] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <span className="text-2xl font-bold text-white">GPH</span>
          </Link>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Be First to Access DoD Solicitation Intelligence
          </h1>
          <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-md">
            GPH launches soon with live DLA and DIBBS feeds, NSN/NIIN search, CAGE code lookup, and automated DoD solicitation alerts.
          </p>

          {/* Features list */}
          <ul className="mt-10 space-y-4">
            {waitlistBenefits.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-success/20 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-success" />
                </span>
                <span className="text-white/90">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Data stat */}
          <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-3xl font-bold text-white">15,000+</div>
            <div className="text-white/70 mt-2">DoD solicitations indexed and ready to search at launch</div>
          </div>
        </div>
      </div>

      {/* Right side - Waitlist Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <span className="text-xl font-bold text-secondary">GPH</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-secondary/5 border border-border p-8">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckIcon className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-secondary">You&apos;re on the list!</h2>
                <p className="mt-3 text-muted leading-relaxed">
                  We&apos;ll email you when GPH launches with full access to DoD solicitation intelligence.
                </p>
                <Button href="/" variant="outline" size="md" className="mt-8">
                  Back to Home
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-secondary">Join the Waitlist</h2>
                  <p className="mt-2 text-muted">
                    We&apos;ll notify you when GPH launches.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    label="Work Email"
                    type="email"
                    name="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />

                  <Input
                    label="Company Name (optional)"
                    name="company"
                    placeholder="Acme Defense Corp"
                    value={formData.company}
                    onChange={handleChange}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Joining..." : "Join Waitlist"}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-muted">
                  We&apos;ll only email you about the GPH launch. No spam.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
