"use client";

import { createPortal } from "react-dom";
import { useAnchoredPopover } from "@/components/library/WinAndFirstArticleBadges";
import { formatContractDate } from "@/lib/library/types";
import { timeAgo } from "@/lib/amendments";

/**
 * "The return-by date has passed, but DIBBS still lists this as open."
 *
 * DIBBS rows show their stored status (decided 2026-10-01), so a solicitation
 * stored 'open' keeps reading Open after its return-by date. This flag is the
 * warning that goes with it: the date has passed, DIBBS still lists it as
 * open, so it may not have been awarded yet and may still be accepting quotes.
 *
 * The server sets `dibbs_listed_open` on every such row, whether or not
 * update_solicitation_statuses has re-checked it. "(checked …)" appears only
 * when it has; with no check, the copy says nothing about one.
 *
 * Shared by the parts Recent Solicitations tab and the bid-matching results
 * table. Takes primitives rather than a row object: the two tables have
 * different row shapes and neither should have to grow the other's fields.
 *
 * Click, not hover, matching the win/First Article badges — this is several
 * sentences of consequential copy, not a label expansion.
 */
export function PendingOutcomeFlag({
  dibbsListedOpen,
  closeDate,
  lastStatusCheckAt,
}: {
  /** Server-derived: stored open, return-by date passed. */
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
        aria-label="Return-by date passed, still open on DIBBS — what that means"
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
            Return-by date passed
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            The return-by date ({formatContractDate(closeDate)}) has passed, but
            DIBBS still lists this solicitation as Open
            {lastStatusCheckAt ? ` (checked ${timeAgo(lastStatusCheckAt)})` : ""}.
            It may not have been awarded yet and may still be accepting quotes.
          </p>
        </div>,
        document.body
      )}
    </>
  );
}
