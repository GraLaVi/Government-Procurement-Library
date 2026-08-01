"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSeatCapSuspensions } from "@/lib/hooks/useSeatCapSuspensions";

// How long a suspension counts as "news". After this the full banner stands
// down to a one-line note (where the host page asks for it) — a downgrade is
// often a deliberate, permanent choice, and a banner that never goes away stops
// being read. The quiet version keeps the state discoverable without nagging.
const RECENT_WINDOW_DAYS = 7;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return (Date.now() - then) / 86_400_000;
}

/**
 * Tells an account admin that team members lost access because the plan's user
 * limit shrank.
 *
 * Without this the failure mode is silent: /account/users hides inactive users
 * by default, so after a downgrade people simply vanish from the list with no
 * explanation, which reads as data loss. The affected users get an email; the
 * admin who caused it got nothing until this.
 *
 * Admin-only, matching PaymentMethodAlert — the CTA leads to billing and user
 * management, both of which are admin-gated anyway, and a regular member can't
 * act on it.
 *
 * Fetches its own data rather than taking a prop: /account/users only loads
 * inactive users when the "include inactive" toggle is on, and the dashboard
 * doesn't load users at all, so there is no existing list to reuse.
 */
export function SeatCapSuspensionAlert({
  showStale = false,
}: {
  /** Render the quiet one-liner once the suspension is no longer recent.
   *  On by default nowhere — the dashboard should stay clean, while
   *  /account/users wants the state visible permanently. */
  showStale?: boolean;
}) {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;
  // Gated on isAdmin so non-admins never fire the request — /api/users is
  // admin-only and would just 403.
  const { suspended } = useSeatCapSuspensions(isAdmin);

  if (!isAdmin || !suspended || suspended.length === 0) return null;

  const count = suspended.length;
  const noun = count === 1 ? "team member" : "team members";
  const recent = suspended.some((u) => {
    const age = daysSince(u.deactivated_at);
    return age !== null && age <= RECENT_WINDOW_DAYS;
  });

  if (!recent) {
    if (!showStale) return null;
    return (
      <p className="text-xs text-muted">
        {count} inactive {noun} over your plan&apos;s user limit.{" "}
        <Link href="/account/billing" className="underline hover:text-foreground">
          Add seats
        </Link>{" "}
        to restore access.
      </p>
    );
  }

  return (
    <div className="bg-warning/10 border border-warning/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <svg
          className="w-5 h-5 text-warning shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {count} {noun} lost access when your plan changed
          </p>
          <p className="text-sm text-muted mt-0.5">
            Your plan now includes fewer users than you had active, so the
            newest {noun} {count === 1 ? "was" : "were"} deactivated. Nothing has
            been deleted — add seats or upgrade to restore access.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/account/users?include_inactive=true"
          className="text-sm font-medium text-foreground underline hover:no-underline whitespace-nowrap"
        >
          Review users
        </Link>
        <Link
          href="/account/billing?action=add-seat"
          className="text-sm font-medium bg-warning/20 text-foreground rounded-lg px-3 py-1.5 hover:bg-warning/30 whitespace-nowrap"
        >
          Add seats
        </Link>
      </div>
    </div>
  );
}
