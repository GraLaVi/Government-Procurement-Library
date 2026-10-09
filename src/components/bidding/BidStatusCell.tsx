"use client";

import Link from "next/link";
import { StartBidButton } from "@/components/bidding/StartBidButton";
import { BID_STATUS_LABELS, type BidStatus } from "@/lib/bidding/types";

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
  // Short word in the cell, full wording on hover: the long labels ("Sent —
  // waiting for DIBBS upload") set the width of the whole column otherwise.
  const full = BID_STATUS_LABELS[bidStatus as BidStatus] ?? bidStatus;
  return (
    <div className="whitespace-nowrap" title={full}>
      <Link href={`/bidmanager/${bidId}`} className="text-primary hover:underline font-medium">
        BID-{bidReferenceNumber}
      </Link>
      <span className={`ml-1.5 ${tone}`}>{SHORT_STATUS[bidStatus] ?? full}</span>
    </div>
  );
}
