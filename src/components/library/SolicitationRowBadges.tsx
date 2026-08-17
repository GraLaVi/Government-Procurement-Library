"use client";

import { SolicitationTypeBadge } from "@/components/library/SolicitationTypeBadge";
import { RowBadge, rowBadgeClass, type RowBadgeTone } from "@/components/library/RowBadge";
import { timeAgo } from "@/lib/amendments";

/**
 * The solicitation's OWN status (DLA fact: open/awarded/closed…) — the
 * filled badge style the bid-matching page has always used (green open,
 * blue awarded, red closed), shared so every table renders it identically.
 */
export function SolStatusBadge({
  status, muted = false,
}: {
  status: string | null;
  /**
   * Drop the tone to a neutral outline. Set for a solicitation closed only by
   * its deadline with the award still pending (see PendingOutcomeFlag): that
   * is an ordinary lifecycle stage, not a problem, and red beside a warning
   * glyph reads as an alarm the row does not warrant. A genuinely closed or
   * cancelled solicitation keeps the red.
   */
  muted?: boolean;
}) {
  // SAM rows briefly rendered a muted "Inactive" here, on the theory that
  // their close came from SAM deactivating the listing rather than from a
  // deadline. That is no longer how either source works: the response
  // deadline closes a solicitation on SAM exactly as it does on DIBBS
  // ("late is late"), so both say Closed and both look the same.
  if (!status) return <span className="text-muted">—</span>;
  const s = status.toLowerCase();

  const tone: RowBadgeTone =
    muted ? "outline"
    : s === "open" ? "green"
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
   * generated. Raises the same pill as the pre-match flag; the difference
   * between the two shows up in its tooltip, not in the badge. */
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
  // ONE amber "Amended" pill, never two. The separate "Updated 3h ago" badge
  // said much the same thing and made an already-crowded column unreadable,
  // and a merged "Amended 3h ago" just moved the noise into the same pill.
  //
  // Folding the post-match signal in rather than dropping it keeps rows
  // amended ONLY after the match from losing their badge entirely. The
  // distinction between the two — and every timestamp — still lives in the
  // tooltip and in the timeline behind the pill.
  const isAmended = hasAmendmentIndicator || hasPostMatchAmendment;
  const explanation = hasPostMatchAmendment
    ? `This solicitation was updated after your match was generated.${
        latestPostMatchAmendmentAt
          ? ` Latest change: ${new Date(latestPostMatchAmendmentAt).toLocaleString()} (${timeAgo(latestPostMatchAmendmentAt)}).`
          : ""
      }`
    : "This solicitation was updated before this match was generated.";
  const title = onShowAmendments
    ? `${explanation} Click to see what changed.`
    : explanation;

  return (
    <>
      {isAmended && (
        onShowAmendments ? (
          <button
            type="button"
            onClick={onShowAmendments}
            className={rowBadgeClass("amber", { interactive: true })}
            title={title}
          >
            Amended
          </button>
        ) : (
          <span className={rowBadgeClass("amber")} title={title}>
            Amended
          </span>
        )
      )}
      <SolicitationTypeBadge code={solicitationType} label={solicitationTypeLabel} />
    </>
  );
}
