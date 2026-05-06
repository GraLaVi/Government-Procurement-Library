"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface ConsentBannerProps {
  onAcceptAll: () => void;
  onRejectNonEssential: () => void;
  onCustomize: () => void;
}

export function ConsentBanner({
  onAcceptAll,
  onRejectNonEssential,
  onCustomize,
}: ConsentBannerProps) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-40 bg-card-bg border-t border-border shadow-2xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-1">
              We use cookies to keep you signed in and remember your preferences.
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Strictly-necessary cookies (authentication and this consent
              choice) are always on. Functional, analytics, and marketing
              storage is off until you opt in. Read our{" "}
              <Link href="/legal/cookies" className="text-primary hover:underline">
                cookie policy
              </Link>{" "}
              for the full list.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onCustomize}>
              Customize
            </Button>
            <Button variant="outline" size="sm" onClick={onRejectNonEssential}>
              Reject non-essential
            </Button>
            <Button variant="primary" size="sm" onClick={onAcceptAll}>
              Accept all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
