"use client";

import { AmendmentTimeline } from "@/components/bidmatching/AmendmentTimeline";
import { SolicitationHistoryModal } from "@/components/ui/SolicitationHistoryModal";

interface Props {
  // null/undefined hides the modal. When a number is provided, the modal
  // opens and fetches that sol's amendment timeline.
  solicitationId: number | null;
  solicitationNumber?: string | null;
  onClose: () => void;
}

// Amendment history for a DIBBS solicitation. Used from BidMatchResultsTable,
// the RFQ worklist, and the parts/vendor solicitation tables.
//
// Shares its chrome with the SAM.gov posting history via
// SolicitationHistoryModal, so "what changed on this solicitation" looks the
// same wherever it is opened from. What differs is the body of each entry, and
// only because the sources record different things: DIBBS revises the
// solicitation in place and we store a field-level diff per amendment, while
// SAM offices amend by reposting the whole notice, so there each entry is a
// posting with its own deadline, link and attachments.
export function AmendmentTimelineModal({ solicitationId, solicitationNumber, onClose }: Props) {
  return (
    <SolicitationHistoryModal
      title={solicitationId === null ? null : "Amendment history"}
      subtitle={solicitationNumber}
      onClose={onClose}
    >
      {solicitationId !== null && <AmendmentTimeline solicitationId={solicitationId} />}
    </SolicitationHistoryModal>
  );
}
