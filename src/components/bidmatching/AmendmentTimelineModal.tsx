"use client";

import { AmendmentTimeline } from "@/components/bidmatching/AmendmentTimeline";

interface Props {
  // null/undefined hides the modal. When a number is provided, the modal
  // opens and fetches that sol's amendment timeline.
  solicitationId: number | null;
  solicitationNumber?: string | null;
  onClose: () => void;
}

// Shared modal chrome around AmendmentTimeline. Used from BidMatchResultsTable
// and any solicitation list view that wants to surface "what changed on
// this sol".
export function AmendmentTimelineModal({ solicitationId, solicitationNumber, onClose }: Props) {
  if (solicitationId === null) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card-bg rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Amendment history</h3>
            {solicitationNumber && (
              <p className="text-xs text-muted-foreground">{solicitationNumber}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <AmendmentTimeline solicitationId={solicitationId} />
        </div>
      </div>
    </div>
  );
}
