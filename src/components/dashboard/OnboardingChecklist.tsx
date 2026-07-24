"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboardMilestones } from "@/lib/hooks/useDashboardMilestones";

// localStorage key for the per-browser dismiss preference. Versioning the
// key (`.v1`) lets us re-show the card to everyone in the future if the
// set of onboarding steps changes meaningfully — bump to `.v2`.
const DISMISS_KEY = "dashboard.onboardingChecklist.dismissed.v1";

// Onboarding checklist shown on every tier's dashboard (BasicDashboard and
// FullDashboard both render this). Auto-completes as the user does each
// action (derived from recent_actions). Returns null once all milestones
// are checked, so it cleanly disappears for returning users.
//
// Visual model: horizontal stepper spanning the full card width. Each
// milestone owns a column — node, label, and action all stacked directly
// underneath each other — so the label and its CTA never drift apart the
// way a stretched full-width row would. The first uncompleted step is
// highlighted as the "current" node (primary color, pill "Start →" button);
// later steps stay muted to imply order without shouting. Completed steps
// show a green check + "Done" pill.
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
    <div className="bg-card-bg border border-border rounded-xl p-5">
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

      <ol className="flex items-start">
        {milestones.map((m, idx) => {
          const isFirst = idx === 0;
          const isNext = idx === firstUndoneIdx;
          // The hook joins a trial-countdown to the payment-method label
          // with " — "; split it back out so the stepper can render the
          // urgency as a subdued subtitle rather than burying it in the
          // headline.
          const [mainLabel, ...rest] = m.label.split(" — ");
          const subtitle = rest.length > 0 ? rest.join(" — ") : null;

          const nodeClasses = m.completed
            ? "bg-success border-success text-white"
            : isNext
              ? "bg-primary border-primary text-white ring-4 ring-primary-light"
              : "bg-card-bg border-border text-muted";

          const labelClasses = m.completed
            ? "text-muted"
            : isNext
              ? "text-foreground font-medium"
              : "text-foreground";

          // Connector between this node and the previous one — colored when
          // the step to the left is done, muted otherwise. Rendered on every
          // step but the first; positioned to span from the previous node's
          // center to this one's (top-3 = half the 24px node height).
          const prevCompleted = idx > 0 && milestones[idx - 1].completed;

          return (
            <li
              key={m.id}
              className="relative flex-1 min-w-0 flex flex-col items-center text-center px-2"
            >
              {!isFirst && (
                <span
                  aria-hidden="true"
                  className={`absolute top-3 left-[-50%] w-full h-px ${
                    prevCompleted ? "bg-success/50" : "bg-border"
                  }`}
                />
              )}

              <span
                aria-hidden="true"
                className={`relative z-10 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold ${nodeClasses}`}
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

              <div className={`text-sm mt-2 leading-snug ${labelClasses}`}>{mainLabel}</div>
              {subtitle && !m.completed && (
                <div className="text-xs text-muted mt-0.5">{subtitle}</div>
              )}
              {/* Contextual help: deep-link to the article for this step.
                  Opens in a new tab so the user keeps their place in setup.
                  Hidden once the step is done to keep the card uncluttered
                  for returning users. */}
              {!m.completed && m.learnMoreSlug && (
                <Link
                  href={`/help/${m.learnMoreSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted hover:text-primary hover:underline mt-1"
                >
                  Learn more
                </Link>
              )}

              <div className="mt-2 text-xs">
                {m.completed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success font-medium px-2 py-0.5">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Done
                  </span>
                ) : isNext ? (
                  <Link
                    href={m.href}
                    className="inline-block rounded-full bg-primary text-white font-semibold px-3 py-1 hover:bg-primary-hover transition-colors"
                  >
                    Start →
                  </Link>
                ) : (
                  <Link
                    href={m.href}
                    className="text-muted font-medium hover:text-primary hover:underline"
                  >
                    Try →
                  </Link>
                )}
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
