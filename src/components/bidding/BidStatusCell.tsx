"use client";

import Link from "next/link";
import { StartBidButton } from "@/components/bidding/StartBidButton";
import { BID_STATUS_LABELS, type BidStatus } from "@/lib/bidding/types";

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
  return (
    <div className="min-w-0">
      <Link href={`/bidmanager/${bidId}`} className="text-primary hover:underline font-medium whitespace-nowrap">
        BID-{bidReferenceNumber}
      </Link>
      <div className={`text-[11px] ${tone}`}>
        {BID_STATUS_LABELS[bidStatus as BidStatus] ?? bidStatus}
      </div>
    </div>
  );
}
