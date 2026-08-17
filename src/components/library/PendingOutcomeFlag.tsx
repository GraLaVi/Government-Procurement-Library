"use client";

import { createPortal } from "react-dom";
import { useAnchoredPopover } from "@/components/library/WinAndFirstArticleBadges";
import { formatContractDate } from "@/lib/library/types";
import { timeAgo } from "@/lib/amendments";

/**
 * "Closed by its deadline, but DIBBS says the outcome is still pending."
 *
 * The row reads Closed and that is correct — DIBBS stops accepting quotes at
 * the close date. But update_solicitation_statuses resolved this solicitation
 * on DIBBS within the last day and DIBBS still listed it as open, which there
 * means only that it has not been awarded or cancelled yet.
 *
 * That distinction is the whole point of the flag, and the copy has to carry
 * it: a buyer who reads "still open on DIBBS" as "I can still quote" would go
 * to DIBBS and find they cannot. So the popover leads with quoting being
 * closed, and explains what DIBBS's "Open" actually means. Do not reword it to
 * lead with the listing.
 *
 * Shared by the parts Recent Solicitations tab and the bid-matching results
 * table, which reach it from opposite directions — the parts tab already
 * derived a status and this adds the nuance; bid matching used to render
 * `solicitations.status` raw, so there the derivation is the fix and this is
 * the explanation for why ~13.8k rows changed.
 *
 * Takes primitives rather than a row object: the two tables have different row
 * shapes and neither should have to grow the other's fields.
 *
 * Click, not hover, matching the win/First Article badges — this is several
 * sentences of consequential copy, not a label expansion.
 */
export function PendingOutcomeFlag({
  dibbsListedOpen,
  closeDate,
  lastStatusCheckAt,
}: {
  /** Server-derived. False whenever we have no fresh DIBBS reading. */
  dibbsListedOpen?: boolean;
  closeDate: string | null;
  lastStatusCheckAt?: string | null;
}) {
  const { open, coords, btnRef, panelRef, toggle } = useAnchoredPopover();

  if (!dibbsListedOpen) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="DIBBS still lists this solicitation as open — what that means"
        className="inline-flex items-center text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer shrink-0"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-80 rounded-md border border-border bg-background shadow-lg p-3"
        >
          <div className="text-xs font-semibold text-foreground mb-1">
            Award still pending
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            Quoting closed on {formatContractDate(closeDate)}. DIBBS still
            lists this solicitation as Open
            {lastStatusCheckAt ? ` (checked ${timeAgo(lastStatusCheckAt)})` : ""}
            {" "}— on DIBBS that means it has not been awarded or cancelled yet,
            not that it is still accepting quotes.
          </p>
        </div>,
        document.body
      )}
    </>
  );
}
