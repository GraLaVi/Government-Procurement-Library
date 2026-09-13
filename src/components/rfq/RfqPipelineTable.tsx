"use client";

import Link from "next/link";
import { RowBadge } from "@/components/library/RowBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  SortHeader, rowClass, tableClass, tableHeadRowClass, tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";
import { WorkStatusSelect } from "@/components/rfq/WorkStatusSelect";
import {
  rfqStatusLabel,
  rfqStatusTone,
  type RfqListItem,
  type RfqWorkStatus,
} from "@/lib/rfq/types";
import { formatDateMmDdYyyy } from "@/lib/dates";

/**
 * The RFQ Pipeline table: one row per RFQ sent, where it stands, and whether
 * it is priced and ready to bid.
 *
 * Presentation only. The page (/rfq) owns loading, the created-by filter and
 * the server-side sort; this renders whatever rows it is handed and reports
 * clicks back. Split out so the public product page can show the real table
 * on sample rows rather than a screenshot of it.
 */

/** Columns the server can sort on. "" = the default newest-first ordering. */
export type PipelineSortKey = "" | "vendor" | "updated_by" | "progress" | "bid_due" | "sent";

/**
 * Long text cell: caps the width and moves the full value to a hover tooltip.
 *
 * Vendor names and RFQ titles are both unbounded — a legal name like
 * "PRECISION AEROSPACE COMPONENTS MANUFACTURING, INCORPORATED" would otherwise
 * set the column width for every row on the page. Short values skip the
 * tooltip entirely so row hover stays quiet.
 */
const TOOLTIP_AT_CHARS = 28;

function Truncated({ value, className = "" }: { value: string; className?: string }) {
  if (value.length <= TOOLTIP_AT_CHARS) return <span className={className}>{value}</span>;
  return (
    <Tooltip content={value}>
      <span className={`block truncate ${className}`}>{value}</span>
    </Tooltip>
  );
}

export function RfqPipelineTable({
  rfqs,
  sortBy,
  sortDir,
  onSort,
  onProgressChange,
}: {
  rfqs: RfqListItem[];
  sortBy: PipelineSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: PipelineSortKey) => void;
  onProgressChange: (row: RfqListItem, next: RfqWorkStatus) => void;
}) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead>
          <tr className={tableHeadRowClass}>
            <th className={thClass}>RFQ</th>
            <th className={thClass}>Solicitation</th>
            <SortHeader label="Vendor" sortKey="vendor" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            <SortHeader
              label="Updated by" sortKey="updated_by" sortBy={sortBy} sortDir={sortDir} onSort={onSort}
              title="Who last moved the progress or edited the pricing"
            />
            <SortHeader label="RFQ progress" sortKey="progress" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            <th className={thClass}>Responses</th>
            <SortHeader
              label="Bid due" sortKey="bid_due" sortBy={sortBy} sortDir={sortDir} onSort={onSort}
              title="When the government's bid is due (solicitation close date)"
            />
            <th className={thClass} title="When the vendor's quote is due back to you">
              Quote due
            </th>
            <SortHeader label="Sent" sortKey="sent" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {rfqs.map((rfq) => (
            <tr key={rfq.id} className={rowClass}>
              <td className={tdClass}>
                <div className="flex items-center gap-1.5">
                  {/* The reference carries identity, the title carries
                      content. Two lines rather than one long string: the
                      reference is what a buyer says out loud and what they
                      scan for, and it stays a fixed width whatever the part
                      is called. */}
                  <div className="min-w-0">
                    <Link
                      href={`/rfq/${rfq.id}`}
                      className="text-primary hover:underline font-semibold data-field whitespace-nowrap"
                    >
                      RFQ-{rfq.reference_number}
                    </Link>
                    <div className="text-[11px] text-muted leading-tight">
                      <Truncated value={rfq.title} className="max-w-[16rem]" />
                    </div>
                  </div>
                  {/* Every quoted line that came back is priced — the
                      "is this ready to go" question, answered in the row. */}
                  {rfq.ready_to_bid && (
                    <Tooltip content="Every quoted line has a price to government">
                      <RowBadge tone="green">Ready</RowBadge>
                    </Tooltip>
                  )}
                </div>
              </td>
              <td className={tdClass}>
                {rfq.solicitation_number ? (
                  <Link
                    href={`/rfq/worklist?q=${encodeURIComponent(rfq.solicitation_number)}`}
                    className="font-mono text-primary hover:underline whitespace-nowrap"
                  >
                    {rfq.solicitation_number}
                  </Link>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className={`${tdClass} text-foreground`}>
                <Truncated
                  value={rfq.primary_vendor_name || rfq.primary_cage_code || "—"}
                  className="max-w-[12rem]"
                />
              </td>
              <td className={`${tdClass} text-muted`}>
                {rfq.updated_by_name || "—"}
                {rfq.updated_at && (
                  <div className="text-[11px] text-muted/70 leading-tight">
                    {formatDateMmDdYyyy(rfq.updated_at)}
                  </div>
                )}
              </td>
              <td className={tdClass}>
                {/* Stored per solicitation, so this control moves every RFQ
                    sent for it. RFQs with no solicitation behind them have
                    nowhere to keep a status. */}
                {rfq.source_solicitation_id ? (
                  <WorkStatusSelect
                    value={rfq.work_status}
                    sharedCount={rfq.shared_progress_rfq_count}
                    onChange={(next) => onProgressChange(rfq, next)}
                  />
                ) : (
                  <Tooltip content="Progress is tracked per solicitation. This RFQ was created outside the Send RFQs queue, so it has none.">
                    <span className="text-muted">—</span>
                  </Tooltip>
                )}
              </td>
              <td className={tdClass}>
                <RowBadge tone={rfqStatusTone(rfq.aggregate_status)}>
                  {rfqStatusLabel(rfq.aggregate_status)}
                </RowBadge>
                <span className="ml-1.5 text-muted">
                  {rfq.response_count}/{rfq.recipient_count}
                </span>
              </td>
              <td className={`${tdClass} text-muted whitespace-nowrap`}>
                {formatDateMmDdYyyy(rfq.bid_due_date)}
              </td>
              <td className={`${tdClass} text-muted whitespace-nowrap`}>
                {formatDateMmDdYyyy(rfq.response_due_date)}
              </td>
              <td className={`${tdClass} text-muted whitespace-nowrap`}>
                {formatDateMmDdYyyy(rfq.sent_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
