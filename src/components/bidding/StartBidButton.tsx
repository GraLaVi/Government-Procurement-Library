"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BIDDING_PRODUCT_KEY, showBiddingNav } from "@/lib/bidding/access";
import { bidFetch } from "@/lib/bidding/api";
import type { BidCreateResponse } from "@/lib/bidding/types";

interface StartBidButtonProps {
  solicitationId: number;
  /** The RFQ path (decision 26): prefill prices from the priced vendor quotes. */
  fromRfq?: boolean;
  label?: string;
  className?: string;
  title?: string;
  /** Runs just before going to the editor, and is added to its URL — the
   *  Bid Worklist uses it to bring the bidder back to their place. */
  beforeNavigate?: () => void;
  editorQuery?: string;
}

/**
 * Starts a bid on a solicitation — or opens the one that already exists — and
 * goes to the editor. Rendered only where Bidding is offered: to seat holders,
 * and to everyone once the add-on is public, when non-holders are sent to
 * /pricing instead (plan 4.1).
 */
export function StartBidButton({
  solicitationId, fromRfq = false, label, className = "", title, beforeNavigate, editorQuery,
}: StartBidButtonProps) {
  const router = useRouter();
  const { hasProductAccess } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!showBiddingNav(hasProductAccess)) return null;
  const holder = hasProductAccess(BIDDING_PRODUCT_KEY);

  const start = async () => {
    if (!holder) {
      router.push("/pricing");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await bidFetch<BidCreateResponse>("/api/bidding", {
        method: "POST",
        json: { solicitation_id: solicitationId, use_rfq_quotes: fromRfq },
      });
      beforeNavigate?.();
      router.push(`/bidmanager/${data.bid.id}${editorQuery ? `?${editorQuery}` : ""}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        title={title ?? (holder ? "Start a DIBBS quote for this solicitation" : "Requires the Bid Manager add-on")}
        className={
          className ||
          "inline-flex items-center gap-1 rounded-md border border-primary/40 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 disabled:opacity-50 cursor-pointer whitespace-nowrap"
        }
      >
        {busy ? "Opening…" : label ?? (fromRfq ? "Add to bids" : "Bid")}
      </button>
      {error && <span className="mt-1 text-[11px] text-error max-w-[220px]">{error}</span>}
    </span>
  );
}
