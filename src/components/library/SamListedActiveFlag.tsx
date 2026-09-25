"use client";

import { createPortal } from "react-dom";
import { useAnchoredPopover } from "@/components/library/WinAndFirstArticleBadges";
import { formatContractDate } from "@/lib/library/types";

/**
 * "Closed by its deadline, but SAM.gov's page still says Active."
 *
 * The SAM sibling of PendingOutcomeFlag, and it answers a complaint rather
 * than a nuance: the row links straight out to SAM.gov, the customer clicks
 * through, reads "Active", and concludes our Closed badge is broken. It isn't.
 * SAM keeps a notice listed until its archive_date — an administrative display
 * setting, normally ~15 days past the deadline, with no legal weight — so the
 * listing routinely outlives the solicitation's ability to take an offer.
 * Server-side this is the overwhelmingly common case, not a corner: 95% of the
 * part-linked notices reading active past their deadline are past their own
 * archive date too.
 *
 * Copy rules, both load-bearing:
 *
 *   - Lead with the deadline, not the listing. Same rule as PendingOutcomeFlag:
 *     a buyer who reads "still active on SAM.gov" as "I can still bid" goes to
 *     SAM.gov and finds they cannot.
 *   - Do not flatly assert the solicitation can no longer be bid. When an
 *     office EXTENDS a deadline we typically don't ingest the new one until a
 *     day or more after the old date passed, and in that window this row is
 *     showing Closed on a live solicitation. That window is also exactly when
 *     the customer could still act on it. So the second paragraph sends them
 *     to check the date rather than closing the question — otherwise the note
 *     converts a visible discrepancy into an invisible one.
 *
 * No "as of" timestamp, deliberately, unlike the DIBBS flag: sam_opportunities
 * .last_updated is unread anywhere in the API and its maintenance by the
 * harvester is unconfirmed, so there is no freshness claim we can stand behind.
 *
 * Click, not hover — several sentences of consequential copy, matching the
 * win/First Article badges and PendingOutcomeFlag.
 */
export function SamListedActiveFlag({
  samListedActive,
  closeDate,
}: {
  /** Server-derived. False on DLA rows and whenever SAM agrees with us. */
  samListedActive?: boolean;
  closeDate: string | null;
}) {
  const { open, coords, btnRef, panelRef, toggle } = useAnchoredPopover();

  if (!samListedActive) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="SAM.gov still lists this solicitation as active — what that means"
        className="inline-flex items-center text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer shrink-0"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-80 rounded-md border border-border bg-background shadow-lg p-3"
        >
          <div className="text-xs font-semibold text-foreground mb-1">
            Still listed on SAM.gov
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            Offers were due {formatContractDate(closeDate)}. SAM.gov keeps a
            notice listed as Active until it is archived — normally about 15
            days after the deadline — so its page can still read Active even
            though the contracting office will reject a late offer.
          </p>
          <p className="text-xs text-muted leading-relaxed mt-2">
            If that deadline only just passed, check the date on SAM.gov: an
            extension posted in the last day or two may not have reached us yet.
          </p>
        </div>,
        document.body
      )}
    </>
  );
}
