"use client";

import { rowBadgeClass, type RowBadgeTone } from "@/components/library/RowBadge";
import { WORK_STATUS_LABELS, WORK_STATUS_ORDER, type RfqWorkStatus } from "@/lib/rfq/types";

/**
 * RFQ progress as an editable pill — a <select> wearing the row-badge styling,
 * so the value reads as a status rather than a form control until you click it.
 *
 * Shared by the Send RFQs work queue and the RFQ Pipeline. The two pages set
 * the same field on the same row: progress is stored per SOLICITATION
 * (rfq_solicitation_work), not per RFQ, so the queue's one row and the
 * pipeline's one-row-per-vendor are editing a single value.
 */

export const WORK_STATUS_TONES: Record<RfqWorkStatus, RowBadgeTone> = {
  unworked: "neutral",
  rfq_sent: "sky",
  quotes_in: "indigo",
  priced: "amber",
  bid: "green",
  no_bid: "red",
  passed: "slate",
};

const BASE_HINT =
  "Your RFQ progress on this solicitation. RFQ Sent and Quotes In advance automatically; set the rest as you work.";

export function WorkStatusSelect({
  value,
  onChange,
  sharedCount = 1,
  disabled = false,
}: {
  /** Null is treated as `unworked` — the same default the API applies when no
   *  work row exists yet. */
  value: RfqWorkStatus | null;
  onChange: (next: RfqWorkStatus) => void;
  /** How many RFQs share this solicitation's progress. Above 1, the control
   *  says so: a buyer changing it from one vendor's row is moving all of them,
   *  and silently doing that would read as a bug. */
  sharedCount?: number;
  disabled?: boolean;
}) {
  const current: RfqWorkStatus = value ?? "unworked";
  const shared = sharedCount > 1;
  return (
    <select
      className={rowBadgeClass(WORK_STATUS_TONES[current], {
        className: disabled ? "opacity-60" : "cursor-pointer",
      })}
      title={
        shared
          ? `${BASE_HINT} Shared by ${sharedCount.toLocaleString()} RFQs on this solicitation — changing it here moves all of them.`
          : BASE_HINT
      }
      value={current}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as RfqWorkStatus)}
      aria-label="RFQ progress"
    >
      {WORK_STATUS_ORDER.map((s) => (
        <option key={s} value={s}>{WORK_STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}
