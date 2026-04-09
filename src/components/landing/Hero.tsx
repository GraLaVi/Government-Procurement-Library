"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/icons";

const highlights = [
  "Live DLA and DIBBS solicitation feeds updated daily",
  "NSN/NIIN part search with cross-referenced CAGE codes",
  "Automated alerts for new DoD RFQs matching your capabilities",
];

export function Hero() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("gph_waitlist_submitted")) {
      setSubmitted(true);
    }
  }, []);

  const handleJoinWaitlist = () => {
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
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-light via-white to-accent-light opacity-50" />

      {/* Decorative shapes */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary dark:text-foreground leading-tight">
              Win More{" "}
              <span className="text-primary">DoD Bids</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted dark:text-foreground/70 leading-relaxed">
              Your DoD Solicitation Intelligence Platform. Search DLA and DIBBS opportunities, track military branch RFQs, and find contracts matched to your CAGE code — before your competitors do.
            </p>

            {/* Highlights */}
            <ul className="mt-8 space-y-4">
              {highlights.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-success/10 rounded-full flex items-center justify-center mt-0.5">
                    <CheckIcon className="w-4 h-4 text-success" />
                  </span>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            {/* Waitlist signup */}
            <div className="mt-10">
              {submitted ? (
                <div className="flex items-center gap-3 bg-success/10 border border-success/20 rounded-lg px-6 py-4">
                  <CheckIcon className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-foreground font-medium">You&apos;re on the list! We&apos;ll notify you when GPH launches.</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="Enter your work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinWaitlist()}
                    className="flex-1 px-4 py-4 rounded-lg border border-border bg-card-bg text-card-foreground placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleJoinWaitlist}
                  >
                    Get Early Access
                  </Button>
                </div>
              )}
            </div>

            {/* Trust indicator */}
            <p className="mt-6 text-sm text-muted dark:text-foreground/70">
              Launching soon. Be first to know when we go live.
            </p>
          </div>

          {/* Visual */}
          <div className="relative lg:pl-8">
            <div className="relative bg-white dark:bg-card-bg rounded-2xl shadow-2xl shadow-primary/10 border border-border p-6 lg:p-8">
              {/* Mock Dashboard Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-secondary dark:text-card-foreground">Today&apos;s DoD Matches</h3>
                  <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">
                    8 New
                  </span>
                </div>

                {/* Mock opportunity cards */}
                {[
                  { title: "DLA SPE4A6-25-R-0142", value: "$1.8M", agency: "Defense Logistics Agency" },
                  { title: "DIBBS RFQ - NSN 5305-01-587-2318", value: "$420K", agency: "DLA Aviation" },
                  { title: "Repair Parts - TACOM", value: "$2.1M", agency: "U.S. Army" },
                ].map((opp, index) => (
                  <div
                    key={index}
                    className="p-4 bg-muted-light rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground dark:text-card-foreground text-sm">{opp.title}</h4>
                        <p className="text-xs text-muted dark:text-card-foreground/70 mt-1">{opp.agency}</p>
                      </div>
                      <span className="text-primary font-semibold text-sm">{opp.value}</span>
                    </div>
                  </div>
                ))}

                <div className="text-center pt-2">
                  <span className="text-sm text-primary font-medium cursor-pointer hover:underline">
                    View all 23 DoD solicitations →
                  </span>
                </div>
              </div>
            </div>

            {/* Floating stats */}
            <div className="absolute -bottom-4 -left-4 bg-white dark:bg-card-bg rounded-xl shadow-lg border border-border p-4">
              <div className="text-2xl font-bold text-primary">$4.2B+</div>
              <div className="text-xs text-muted dark:text-card-foreground/70">DoD Solicitations Tracked</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
