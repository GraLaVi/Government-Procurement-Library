"use client";

import Link from "next/link";
import { useDashboardMilestones } from "@/lib/hooks/useDashboardMilestones";

// Onboarding checklist for the Basic-tier dashboard. Auto-completes as the
// user does each action (derived from recent_actions). Returns null once
// all milestones are checked, so it cleanly disappears for returning users.
export function OnboardingChecklist() {
  const { milestones, allComplete, isLoading } = useDashboardMilestones();

  if (isLoading || allComplete) return null;

  const completedCount = milestones.filter((m) => m.completed).length;

  return (
    <div className="bg-card-bg border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-foreground">Get started</h2>
        <span className="text-xs text-muted">
          {completedCount} of {milestones.length} complete
        </span>
      </div>
      <ul className="space-y-2">
        {milestones.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span
                aria-hidden="true"
                className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center ${
                  m.completed
                    ? "bg-success/10 border-success text-success"
                    : "border-border text-transparent"
                }`}
              >
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
              </span>
              <span
                className={
                  m.completed ? "text-muted line-through" : "text-foreground"
                }
              >
                {m.label}
              </span>
            </span>
            {!m.completed && (
              <Link
                href={m.href}
                className="text-primary text-xs font-medium hover:underline shrink-0"
              >
                Try it →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
