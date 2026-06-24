"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboardMilestones } from "@/lib/hooks/useDashboardMilestones";

// localStorage key for the per-browser dismiss preference. Versioning the
// key (`.v1`) lets us re-show the card to everyone in the future if the
// set of onboarding steps changes meaningfully — bump to `.v2`.
const DISMISS_KEY = "dashboard.onboardingChecklist.dismissed.v1";

// Onboarding timeline for the Basic-tier dashboard. Auto-completes as the
// user does each action (derived from recent_actions). Returns null once
// all milestones are checked, so it cleanly disappears for returning users.
//
// Visual model: vertical journey with numbered nodes connected by a line.
// The first uncompleted step is highlighted as the "current" node (primary
// color, "Start →" CTA); later steps stay muted to imply order without
// shouting. Each completed step shows a green check + "Done" pill.
export function OnboardingChecklist() {
  const { milestones, allComplete, isLoading } = useDashboardMilestones();
  // null = "haven't checked localStorage yet" so SSR + initial client render
  // both produce nothing, avoiding a hydration mismatch.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // Storage may be unavailable (private mode, quota); session-only dismiss
      // is still better than nothing — silently fall through.
    }
  };

  if (isLoading || allComplete || dismissed !== false) return null;

  const completedCount = milestones.filter((m) => m.completed).length;
  const total = milestones.length;
  const progressPct = total === 0 ? 0 : (completedCount / total) * 100;
  const firstUndoneIdx = milestones.findIndex((m) => !m.completed);

  return (
    <div className="bg-card-bg border border-border rounded-xl p-5 max-w-lg">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-foreground">
          Getting started
        </h2>
        <div className="flex items-center gap-3">
          <div
            className="w-32 h-1.5 rounded-full bg-border/60 overflow-hidden"
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full bg-primary transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-muted whitespace-nowrap">
            {completedCount} of {total}
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss getting started"
            title="Dismiss"
            className="-mr-1 inline-flex items-center justify-center w-6 h-6 rounded text-muted hover:text-foreground hover:bg-border/40 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.25}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <ol className="space-y-4">
        {milestones.map((m, idx) => {
          const isLast = idx === milestones.length - 1;
          const isNext = idx === firstUndoneIdx;
          // The hook joins a trial-countdown to the payment-method label
          // with " — "; split it back out so the timeline can render the
          // urgency as a subdued subtitle rather than burying it in the
          // headline.
          const [mainLabel, ...rest] = m.label.split(" — ");
          const subtitle = rest.length > 0 ? rest.join(" — ") : null;

          const nodeClasses = m.completed
            ? "bg-success border-success text-white"
            : isNext
              ? "bg-primary border-primary text-white"
              : "bg-card-bg border-border text-muted";

          const labelClasses = m.completed
            ? "text-muted"
            : isNext
              ? "text-foreground font-medium"
              : "text-foreground";

          return (
            <li key={m.id} className="relative flex gap-3">
              {/* Connector to the next node. left-3 centers it on the 24px
                  circle; the negative bottom extends past the li so it
                  meets the top of the next li's node (which is space-y-4
                  = 1rem below). The color hints at completion: green when
                  the step above is done, muted otherwise. */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-3 top-6 -bottom-4 w-px ${
                    m.completed ? "bg-success/50" : "bg-border"
                  }`}
                />
              )}

              <span
                aria-hidden="true"
                className={`shrink-0 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold ${nodeClasses}`}
              >
                {m.completed ? (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}
              </span>

              <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`text-sm ${labelClasses}`}>{mainLabel}</div>
                  {subtitle && !m.completed && (
                    <div className="text-xs text-muted mt-0.5">{subtitle}</div>
                  )}
                  {/* Contextual help: deep-link to the article for this step.
                      Opens in a new tab so the user keeps their place in
                      setup. Hidden once the step is done to keep the card
                      uncluttered for returning users. */}
                  {!m.completed && m.learnMoreSlug && (
                    <Link
                      href={`/help/${m.learnMoreSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs text-muted hover:text-primary hover:underline mt-1"
                    >
                      Learn more
                    </Link>
                  )}
                </div>
                <div className="shrink-0 text-xs">
                  {m.completed ? (
                    <span className="text-success font-medium">Done</span>
                  ) : isNext ? (
                    <Link
                      href={m.href}
                      className="text-primary font-medium hover:underline"
                    >
                      Start →
                    </Link>
                  ) : (
                    <Link
                      href={m.href}
                      className="text-muted hover:text-primary hover:underline"
                    >
                      Try →
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Catch-all docs link — not a step, just a low-key way out to the
          full Help Center for anything the checklist doesn't cover. */}
      <div className="mt-5 pt-4 border-t border-border/60">
        <Link
          href="/help"
          className="text-xs text-muted hover:text-primary hover:underline"
        >
          Need a hand? Browse the Help Center →
        </Link>
      </div>
    </div>
  );
}
