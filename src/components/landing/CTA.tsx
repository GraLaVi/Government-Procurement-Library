"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ShieldIcon, ZapIcon } from "@/components/icons";

export function CTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("gph_waitlist_submitted")) {
      setSubmitted(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // TODO: Replace with API call when backend endpoint is ready
    const existing = JSON.parse(localStorage.getItem("gph_waitlist") || "[]");
    existing.push({ email, timestamp: new Date().toISOString() });
    localStorage.setItem("gph_waitlist", JSON.stringify(existing));
    localStorage.setItem("gph_waitlist_submitted", "true");
    setSubmitted(true);
    setEmail("");
  };

  return (
    <section className="py-20 lg:py-32 bg-secondary dark:bg-[#1C2C54]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-primary to-primary-hover p-8 lg:p-16 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

          <div className="relative grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Ready to Win More DoD Bids?
              </h2>
              <p className="mt-6 text-lg text-white/80 leading-relaxed">
                GPH is launching soon with live DLA solicitation feeds, NSN/NIIN search, and CAGE code intelligence. Join the waitlist to get early access.
              </p>

              {submitted ? (
                <div className="mt-8 flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-6 py-4">
                  <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white font-medium">You&apos;re on the list! We&apos;ll notify you when GPH launches.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    placeholder="Enter your work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="lg"
                    className="!bg-white !text-primary hover:!bg-white/90"
                  >
                    Join Waitlist
                  </Button>
                </form>
              )}
            </div>

            {/* Stats/Trust */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <ZapIcon className="w-8 h-8 text-white/80 mb-4" />
                <div className="text-3xl font-bold text-white">15K+</div>
                <div className="text-white/70 mt-1">DoD Solicitations Indexed Monthly</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <ShieldIcon className="w-8 h-8 text-white/80 mb-4" />
                <div className="text-3xl font-bold text-white">$4.2B+</div>
                <div className="text-white/70 mt-1">DoD Contract Value Tracked</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:col-span-2">
                <div className="text-white/70 text-sm mb-3">Covering solicitations from:</div>
                <div className="flex flex-wrap gap-4 text-white font-medium">
                  <span>DLA</span>
                  <span>Army</span>
                  <span>Navy</span>
                  <span>Air Force</span>
                  <span>Marines</span>
                  <span>Space Force</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
