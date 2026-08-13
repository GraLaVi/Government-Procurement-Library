"use client";

import { SolicitationTypeBadge } from "@/components/library/SolicitationTypeBadge";
import { RowBadge, rowBadgeClass, type RowBadgeTone } from "@/components/library/RowBadge";
import { timeAgo } from "@/lib/amendments";

/**
 * The solicitation's OWN status (DLA fact: open/awarded/closed…) — the
 * filled badge style the bid-matching page has always used (green open,
 * blue awarded, red closed), shared so every table renders it identically.
 */
export function SolStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted">—</span>;
  const s = status.toLowerCase();
  const tone: RowBadgeTone =
    s === "open" ? "green"
    : s === "awarded" ? "blue"
    : s === "closed" ? "red"
    : "slate";
  // capitalize, because the API returns these lower-cased.
  return <RowBadge tone={tone} className="capitalize">{status}</RowBadge>;
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
  const amendedClasses = rowBadgeClass("amber", { interactive: true });
  const updatedClasses = rowBadgeClass("sky", { interactive: true });
  return (
    <>
      {hasAmendmentIndicator && (
        onShowAmendments ? (
          <button
            type="button"
            onClick={onShowAmendments}
            className={amendedClasses}
            title="This solicitation was updated before this match was generated. Click to see what changed."
          >
            Amended
          </button>
        ) : (
          <span className={rowBadgeClass("amber")} title="This solicitation was updated before this match was generated.">
            Amended
          </span>
        )
      )}
      {hasPostMatchAmendment && (
        onShowAmendments ? (
          <button
            type="button"
            onClick={onShowAmendments}
            className={updatedClasses}
            title={
              latestPostMatchAmendmentAt
                ? `This solicitation was updated after your match was generated. Latest change: ${new Date(latestPostMatchAmendmentAt).toLocaleString()}`
                : "This solicitation was updated after your match was generated."
            }
          >
            Updated{latestPostMatchAmendmentAt ? ` ${timeAgo(latestPostMatchAmendmentAt)}` : " since"}
          </button>
        ) : (
          <span className={rowBadgeClass("sky")}>
            Updated{latestPostMatchAmendmentAt ? ` ${timeAgo(latestPostMatchAmendmentAt)}` : " since"}
          </span>
        )
      )}
      <SolicitationTypeBadge code={solicitationType} label={solicitationTypeLabel} />
    </>
  );
}
