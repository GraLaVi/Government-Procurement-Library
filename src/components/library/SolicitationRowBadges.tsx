"use client";

import { SolicitationTypeBadge } from "@/components/library/SolicitationTypeBadge";
import { timeAgo } from "@/lib/amendments";

/**
 * The solicitation's OWN status (DLA fact: open/awarded/closed…) — the
 * filled badge style the bid-matching page has always used (green open,
 * blue awarded, red closed), shared so every table renders it identically.
 */
export function SolStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted">—</span>;
  const s = status.toLowerCase();
  const tone =
    s === "open"
      ? "bg-green-100 text-green-800"
      : s === "awarded"
      ? "bg-blue-100 text-blue-800"
      : s === "closed"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}

interface SolicitationRowBadgesProps {
  /** Pre-match amendment: the row's match was triggered by an existing
   * amendment on the solicitation. */
  hasAmendmentIndicator?: boolean;
  /** Post-match amendment: the solicitation changed AFTER the match row was
   * generated. */
  hasPostMatchAmendment?: boolean;
  latestPostMatchAmendmentAt?: string | null;
  /** Opens the amendment timeline (both pills route here). Omit to render
   * the pills as non-interactive. */
  onShowAmendments?: () => void;
  /** DLA Solicitation Type Indicator ("F" fast award etc). Null = unknown,
   * renders nothing — never a negative. */
  solicitationType?: string | null;
  solicitationTypeLabel?: string | null;
}

/**
 * The badge cluster shown beside a solicitation number — amendment pills +
 * DLA fast-award type badge — shared by the bid-matching results table and
 * the Send RFQs work queue so the two pages read identically.
 */
export function SolicitationRowBadges({
  hasAmendmentIndicator,
  hasPostMatchAmendment,
  latestPostMatchAmendmentAt,
  onShowAmendments,
  solicitationType,
  solicitationTypeLabel,
}: SolicitationRowBadgesProps) {
  const amendedClasses =
    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200";
  const updatedClasses =
    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200";
  return (
    <>
      {hasAmendmentIndicator && (
        onShowAmendments ? (
          <button
            type="button"
            onClick={onShowAmendments}
            className={`${amendedClasses} hover:bg-amber-200`}
            title="This solicitation was updated before this match was generated. Click to see what changed."
          >
            Amended
          </button>
        ) : (
          <span className={amendedClasses} title="This solicitation was updated before this match was generated.">
            Amended
          </span>
        )
      )}
      {hasPostMatchAmendment && (
        onShowAmendments ? (
          <button
            type="button"
            onClick={onShowAmendments}
            className={`${updatedClasses} hover:bg-sky-200`}
            title={
              latestPostMatchAmendmentAt
                ? `This solicitation was updated after your match was generated. Latest change: ${new Date(latestPostMatchAmendmentAt).toLocaleString()}`
                : "This solicitation was updated after your match was generated."
            }
          >
            Updated{latestPostMatchAmendmentAt ? ` ${timeAgo(latestPostMatchAmendmentAt)}` : " since"}
          </button>
        ) : (
          <span className={updatedClasses}>
            Updated{latestPostMatchAmendmentAt ? ` ${timeAgo(latestPostMatchAmendmentAt)}` : " since"}
          </span>
        )
      )}
      <SolicitationTypeBadge code={solicitationType} label={solicitationTypeLabel} />
    </>
  );
}
