"use client";

import { SolicitationVersion } from "@/lib/library/types";
import {
  SolicitationHistoryCard,
  SolicitationHistoryList,
  SolicitationHistoryModal,
} from "@/components/ui/SolicitationHistoryModal";

interface Props {
  // null hides the modal.
  solicitation: { number: string; versions: SolicitationVersion[] } | null;
  onClose: () => void;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  // Dates arrive as ISO "YYYY-MM-DD"; parse as UTC so the day never shifts.
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

// Posting history for a SAM.gov solicitation that was amended by repost.
//
// Some contracting offices publish every amendment as a brand-new notice rather
// than revising the existing one, so a single solicitation number arrives as
// several sam_opportunities rows with different notice ids, deadlines,
// quantities and attachments. The Recent Solicitations tab renders only the
// operative posting; this is how the superseded ones stay reachable —
// including their documents, which are not always re-uploaded to the newest
// notice, so each entry keeps its own link.
//
// Chrome is shared with the DIBBS amendment history via
// SolicitationHistoryModal; only the per-entry body differs, because a repost
// is a whole notice rather than a field-level diff.
//
// Everything shown here is already on the row, so opening this fetches nothing.
export function SolicitationVersionsModal({ solicitation, onClose }: Props) {
  const versions = solicitation?.versions ?? [];
  const amendedCount = Math.max(versions.length - 1, 0);

  return (
    <SolicitationHistoryModal
      title={solicitation ? "Posting history" : null}
      subtitle={
        solicitation
          ? `${solicitation.number} · amended ${amendedCount} time${amendedCount === 1 ? "" : "s"} on SAM.gov`
          : null
      }
      intro="Each amendment was posted as a separate notice. The one in force is shown in the table; earlier postings and their documents are listed here."
      onClose={onClose}
    >
      <SolicitationHistoryList>
        {versions.map((v) => (
          <SolicitationHistoryCard
            key={v.solicitation_id}
            headline={`Posted ${formatDate(v.posted_date)}`}
            meta={v.status || "—"}
            isCurrent={v.is_current}
            facts={[
              `Closes ${formatDate(v.close_date)}`,
              v.notice_type,
              v.quantity != null ? `Qty ${v.quantity.toLocaleString()}` : null,
            ]}
          >
            <div className="flex items-center gap-3 pt-1">
              {v.sam_url && (
                <a
                  href={v.sam_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View on SAM.gov
                </a>
              )}
              <span className="text-xs text-muted">
                {v.document_count} document{v.document_count === 1 ? "" : "s"}
              </span>
            </div>
          </SolicitationHistoryCard>
        ))}
      </SolicitationHistoryList>
    </SolicitationHistoryModal>
  );
}
