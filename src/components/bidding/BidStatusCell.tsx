"use client";

import Link from "next/link";
import { StartBidButton } from "@/components/bidding/StartBidButton";
import { BID_STATUS_LABELS, type BidStatus } from "@/lib/bidding/types";
import { FROM_WORKLIST, saveWorklistReturn } from "@/lib/bidding/worklistReturn";

const SHORT_STATUS: Record<string, string> = {
  draft: "Draft",
  queued: "Sent",
  exported: "Sent",
  verified: "Checked",
  submitted: "Submitted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

/**
 * The Bid Worklist's Bid column: start a bid, or the bid the team already
 * has. The Bid Worklist is /bidmatching as a Bid Manager add-on holder sees
 * it, so this renders inside BidMatchResultsTable.
 */
export function BidStatusCell({
  solicitationId,
  bidId,
  bidReferenceNumber,
  bidStatus,
  rfqPriced,
}: {
  solicitationId: number;
  bidId?: number | null;
  bidReferenceNumber?: number | null;
  bidStatus?: string | null;
  rfqPriced?: boolean | null;
}) {
  if (bidId == null || bidStatus == null) {
    return (
      <StartBidButton
        solicitationId={solicitationId}
        fromRfq={Boolean(rfqPriced)}
        label={rfqPriced ? "Bid from RFQ price" : "Bid"}
        title={
          rfqPriced
            ? "Start the DIBBS quote with the prices your RFQ team set"
            : "Start a DIBBS quote for this solicitation"
        }
        beforeNavigate={() => saveWorklistReturn(solicitationId)}
        editorQuery={FROM_WORKLIST}
      />
    );
  }
  const tone =
    bidStatus === "rejected"
      ? "text-error"
      : bidStatus === "submitted" || bidStatus === "verified"
      ? "text-success"
      : bidStatus === "draft"
      ? "text-amber-700 dark:text-amber-300"
      : "text-muted";
  // The status word alone, as the link to the bid: the bid number is in the
  // tooltip. Full wording on hover too — the long labels ("Sent — waiting for
  // DIBBS upload") would set the width of the whole column otherwise.
  const full = BID_STATUS_LABELS[bidStatus as BidStatus] ?? bidStatus;
  return (
    <Link
      href={`/bidmanager/${bidId}?${FROM_WORKLIST}`}
      onClick={() => saveWorklistReturn(solicitationId)}
      title={`BID-${bidReferenceNumber}: ${full}`}
      className={`font-medium whitespace-nowrap hover:underline ${tone}`}
    >
      {SHORT_STATUS[bidStatus] ?? full}
    </Link>
  );
}
