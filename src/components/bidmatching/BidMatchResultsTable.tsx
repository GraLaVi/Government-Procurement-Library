"use client";

import { Fragment, useState } from "react";
import { MatchStrengthBadge } from "@/components/ui/MatchStrengthBadge";
import { Modal } from "@/components/ui/Modal";
import { AmendmentTimelineModal } from "@/components/bidmatching/AmendmentTimelineModal";
import { BidMatchLineItems } from "@/components/bidmatching/BidMatchLineItems";
import { PartIdentityLink } from "@/components/bidmatching/PartIdentityLink";
import { SolicitationRowBadges, SolStatusBadge } from "@/components/library/SolicitationRowBadges";
import { formatCurrency } from "@/lib/library/types";

interface MatchedCondition {
  condition_type: string;
  match_value: string;
  condition_id?: number | null;
  match_operator?: string | null;
  is_negated?: boolean | null;
  // Server-resolved display label, populated for SET_ASIDE_CODE conditions
  // where match_value is a canonical short code. NULL for other types.
  match_label?: string | null;
}

interface BidMatchResult {
  result_id: number;
  run_id: string;
  source: "dibbs" | "sam";
  solicitation_id: number | null;
  sam_opportunity_id?: number | null;
  profile_id: number;
  profile_name: string;
  matched_conditions: MatchedCondition[];
  created_at: string;
  match_reason: string | null;
  match_strength: "HARD" | "SOFT" | null;
  has_amendment_indicator?: boolean;
  has_post_match_amendment?: boolean;
  latest_post_match_amendment_at?: string | null;
  // True when this DIBBS solicitation has a PDF on disk (always false for SAM).
  has_pdf?: boolean;
  solicitation_number: string | null;
  agency_code: string | null;
  issue_date: string | null;
  posted_date?: string | null;
  close_date: string | null;
  status: string | null;
  buyer_name: string | null;
  // Legacy raw set-aside string. Kept for one release; prefer set_aside_label.
  set_aside: string | null;
  set_aside_code?: string | null;
  set_aside_label?: string | null;
  // DLA Solicitation Type Indicator: "F" (Fast Auto Evaluation), "P" (Auto
  // Evaluation), "I" (Automated IDC). Null/absent means UNKNOWN, not "no" —
  // never render a negative for it. Always null on SAM-source rows.
  solicitation_type?: string | null;
  // Label resolved from code_definitions (code_type='SOLICITATION_TYPE').
  solicitation_type_label?: string | null;
  sam_url?: string | null;
  // Maximum-tier DLA demand signal — strongest across the opportunity's NIINs
  // ('on_backorder' | 'below_reorder_point' | 'recurring'). Null/absent when no
  // signal or the customer lacks the Maximum parts tier.
  demand_signal?: string | null;

  // Primary line item — the item that triggered the match where the worker
  // recorded it, else the largest by quantity. A solicitation can carry more;
  // line_item_count drives the "+N more" affordance and the expanded row
  // lists them all.
  nsn?: string | null;
  niin?: string | null;
  fsc?: string | null;
  mfg_cage?: string | null;
  mfg_part_number?: string | null;
  part_description?: string | null;
  quantity?: number | null;
  unit_of_issue?: string | null;
  line_item_count?: number;
  // SUM(requested_quantity * parts.gac) over the solicitation's line items —
  // GAC, not unit_price, matching the RFQ worklist's "Est. value".
  estimated_value?: number | null;
}

// Small demand chip for the results table. Neutral, descriptive labels.
const DEMAND_SIGNAL_CHIP: Record<string, { label: string; cls: string }> = {
  on_backorder: {
    label: "On backorder",
    cls: "border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-500/5",
  },
  below_reorder_point: {
    label: "Below reorder point",
    cls: "border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-500/5",
  },
  recurring: {
    label: "Recurring demand",
    cls: "border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-500/5",
  },
};

function DemandSignalChip({ signal }: { signal?: string | null }) {
  if (!signal) return null;
  const c = DEMAND_SIGNAL_CHIP[signal];
  if (!c) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}

/** Columns the server can sort on. "" = the default newest-first ordering. */
export type BidSortKey = "" | "solicitation" | "quantity" | "estimated_value" | "close_date";

interface BidMatchResultsTableProps {
  results: BidMatchResult[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy: BidSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: BidSortKey) => void;
}

/**
 * Sortable column header for this table.
 *
 * Deliberately not the RFQ SortHeader: that one carries the shared DataTable
 * header styling (px-3 py-2, uppercase, muted), which would clash with the
 * plain <th>s beside it here. Same chevron affordance, this table's type.
 */
function SortTh({
  label, sortKey, sortBy, sortDir, onSort, align = "left", className = "",
}: {
  label: string;
  sortKey: Exclude<BidSortKey, "">;
  sortBy: BidSortKey;
  sortDir: "asc" | "desc";
  onSort: (k: BidSortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sortBy === sortKey;
  return (
    // Written out in full — Tailwind scans for complete class names, so a
    // `text-${align}` template would never be generated.
    <th className={`${align === "right" ? "text-right" : "text-left"} px-2.5 py-1.5 font-semibold text-foreground ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Sort by ${label.toLowerCase()}`}
        className={`inline-flex items-center gap-1 font-semibold cursor-pointer select-none ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-foreground" : "text-foreground/70 hover:text-foreground"}`}
      >
        {label}
        {/* The inactive arrow stays faint rather than absent so the column
            reads as sortable before it is clicked. */}
        <svg
          className={`w-3 h-3 shrink-0 ${active ? "text-primary" : "text-muted/40"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={active && sortDir === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
          />
        </svg>
      </button>
    </th>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  // Tolerate a full timestamp as well as a bare YYYY-MM-DD so the date is read
  // in local time rather than shifting a day across the UTC boundary.
  const d = new Date(dateStr.split("T")[0] + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function ConditionBadge({ condition }: { condition: MatchedCondition }) {
  const negated = !!condition.is_negated;
  // Prefer the server-resolved label for SET_ASIDE_CODE so users see
  // "HUBZone Set-Aside" instead of the raw "HZC".
  const displayValue =
    condition.condition_type === "SET_ASIDE_CODE" && condition.match_label
      ? condition.match_label
      : condition.match_value;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
        negated
          ? "bg-red-50 text-red-700 border-red-200"
          // text-foreground, not an accent tone: the surface is only a 10%
          // accent tint, so teal-on-teal would fail contrast (~2.4:1 in light
          // mode). It also preserves what this rendered before — the previous
          // accent-foreground class was a no-op, globals.css defining no
          // matching --color-* token, so the text fell back to foreground.
          : "bg-accent/10 text-foreground border-accent/20"
      }`}
    >
      {negated && <span className="font-bold text-[10px]">NOT</span>}
      <span className="font-semibold text-muted">{condition.condition_type}:</span>
      <span className={negated ? "line-through" : ""}>{displayValue}</span>
      {condition.match_operator && condition.match_operator !== "eq" && (
        <span className="text-[10px] uppercase text-muted/70">({condition.match_operator})</span>
      )}
    </span>
  );
}

export function BidMatchResultsTable({
  results,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
  sortBy,
  sortDir,
  onSort,
}: BidMatchResultsTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [amendmentSolId, setAmendmentSolId] = useState<number | null>(null);
  const [amendmentSolNumber, setAmendmentSolNumber] = useState<string | null>(null);
  const [pdfModal, setPdfModal] = useState<{ id: number; number: string } | null>(null);
  const pdfUrl = pdfModal ? `/api/library/solicitations/${pdfModal.id}/pdf` : null;

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto h-12 w-12 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <p className="mt-4 text-muted">No matches found for this date.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Results count */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total.toLocaleString()} matches
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted-light border-b border-border">
              <th className="w-6 px-1.5 py-1.5" aria-label="Expand"></th>
              <SortTh label="Solicitation" sortKey="solicitation" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th className="text-left px-2.5 py-1.5 font-semibold text-foreground">NSN</th>
              <th className="text-left px-2.5 py-1.5 font-semibold text-foreground">Description</th>
              <SortTh label="Qty" sortKey="quantity" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" className="whitespace-nowrap" />
              <th className="text-left px-2.5 py-1.5 font-semibold text-foreground">UOM</th>
              <SortTh label="Est. Value" sortKey="estimated_value" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" className="whitespace-nowrap" />
              <th className="text-left px-2.5 py-1.5 font-semibold text-foreground whitespace-nowrap">Posted</th>
              <SortTh label="Close Date" sortKey="close_date" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="whitespace-nowrap" />
              <th className="text-left px-2.5 py-1.5 font-semibold text-foreground">Set-Aside</th>
              <th className="text-left px-2.5 py-1.5 font-semibold text-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const isOpen = expanded.has(result.result_id);
              // Line items beyond the one shown inline.
              const extraItems = Math.max(0, (result.line_item_count ?? 0) - 1);
              return (
                <Fragment key={result.result_id}>
                  <tr
                    className="border-b border-border last:border-0 hover:bg-muted-light/50 transition-colors"
                  >
                    <td className="px-1.5 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(result.result_id)}
                        className="text-muted hover:text-foreground cursor-pointer"
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 font-medium">
                        {/* Plain text — the drill-down lives on the NSN link now.
                            whitespace-nowrap keeps the number on one line when the
                            viewport narrows; the badges beside it still wrap. */}
                        <span className="text-foreground whitespace-nowrap">
                          {result.solicitation_number || "—"}
                        </span>
                        {/* View the solicitation PDF in a modal, mirroring the
                            parts/vendor search lists. Only DIBBS sols with a
                            PDF on disk set has_pdf. */}
                        {result.has_pdf && result.solicitation_id && (
                          <button
                            type="button"
                            title="View solicitation PDF"
                            onClick={() =>
                              setPdfModal({
                                id: result.solicitation_id as number,
                                number: result.solicitation_number || "",
                              })
                            }
                            className="text-primary hover:text-primary/80 cursor-pointer shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                          </button>
                        )}
                        {/* Secondary link out to the original SAM.gov posting.
                            The solicitation number itself now opens our parts
                            modal (mirroring DIBBS); this icon preserves access to
                            the source posting on SAM.gov. */}
                        {result.source === "sam" && result.sam_url && (
                          <a
                            href={result.sam_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open original posting on SAM.gov"
                            className="text-primary hover:text-primary/80 cursor-pointer shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7m0-7L10 14m-7 7h7" />
                            </svg>
                          </a>
                        )}
                        {result.source === "sam" && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200"
                            title="Pure-SAM opportunity — no linked DIBBS solicitation"
                          >
                            SAM
                          </span>
                        )}
                        {/* Amendment pills + fast-award badge, shared with the
                            Send RFQs work queue (SolicitationRowBadges) so the
                            two pages read identically. */}
                        <SolicitationRowBadges
                          hasAmendmentIndicator={result.has_amendment_indicator}
                          hasPostMatchAmendment={result.has_post_match_amendment}
                          latestPostMatchAmendmentAt={result.latest_post_match_amendment_at}
                          onShowAmendments={() => {
                            setAmendmentSolId(result.solicitation_id);
                            setAmendmentSolNumber(result.solicitation_number);
                          }}
                          solicitationType={result.solicitation_type}
                          solicitationTypeLabel={result.solicitation_type_label}
                        />
                        {/* DLA demand signal (Maximum tier) — strongest across
                            the opportunity's NIINs; informs the bid decision. */}
                        <DemandSignalChip signal={result.demand_signal}
                        />
                      </div>
                      {result.agency_code && (
                        <div className="text-[11px] text-muted leading-tight">{result.agency_code}</div>
                      )}
                    </td>
                    {/* Primary line item. "+N more" expands the row rather than
                        opening a modal — the full list renders there. */}
                    <td className="px-2.5 py-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <PartIdentityLink part={result} className="data-field font-medium" />
                        {extraItems > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(result.result_id)}
                            title={`${result.line_item_count} line items on this solicitation`}
                            className="text-[10px] font-semibold text-muted hover:text-primary border border-border rounded px-1 py-0.5 cursor-pointer"
                          >
                            +{extraItems} more
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5 text-foreground">
                      {result.part_description ? (
                        <span
                          className="block max-w-[260px] truncate"
                          title={result.part_description}
                        >
                          {result.part_description}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-2.5 py-1.5 text-right text-muted data-field whitespace-nowrap">
                      {result.quantity != null ? result.quantity.toLocaleString() : "—"}
                    </td>
                    <td className="px-2.5 py-1.5 text-muted whitespace-nowrap">
                      {result.unit_of_issue || "—"}
                    </td>
                    <td className="px-2.5 py-1.5 text-right text-muted data-field whitespace-nowrap">
                      {result.estimated_value != null ? formatCurrency(result.estimated_value) : "—"}
                    </td>
                    {/* Posted date. DIBBS rows carry it as issue_date; SAM rows
                        as posted_date. Neither source populates both. */}
                    <td className="px-2.5 py-1.5 text-muted whitespace-nowrap">
                      {formatDate(result.posted_date ?? result.issue_date)}
                    </td>
                    <td className="px-2.5 py-1.5 text-muted whitespace-nowrap">
                      {formatDate(result.close_date)}
                    </td>
                    {/* The short code carries the column; the readable label
                        moves to the tooltip, matching the vendor Open
                        Solicitations tab. Falls back to the label, then the raw
                        string, so an unmapped row still shows something. */}
                    <td className="px-2.5 py-1.5 text-muted whitespace-nowrap">
                      {result.set_aside_code ? (
                        <span
                          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted/15 text-foreground"
                          title={result.set_aside_label || result.set_aside || undefined}
                        >
                          {result.set_aside_code}
                        </span>
                      ) : (
                        result.set_aside_label || result.set_aside || "—"
                      )}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <SolStatusBadge status={result.status} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-border last:border-0 bg-muted-light/30">
                      {/* Set-aside has its own column now. This row carries the
                          full line-item list plus the match detail that used to
                          sit in the dropped Profile and Match columns. */}
                      <td colSpan={11} className="px-3 py-3">
                        <div className="space-y-4">
                          {/* Only worth listing when there's more than one — a
                              single line item is already shown in the NSN column,
                              and skipping it avoids a pointless fetch. */}
                          {extraItems > 0 && (
                            <BidMatchLineItems
                              solicitationNumber={result.solicitation_number}
                              expectedCount={result.line_item_count ?? 0}
                            />
                          )}

                          <div>
                            <div className="text-xs text-muted mb-2">Why it matched</div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <MatchStrengthBadge strength={result.match_strength} />
                              <span className="text-xs text-muted">
                                Profile:{" "}
                                <span className="text-foreground">{result.profile_name}</span>
                              </span>
                              {result.match_reason && (
                                <span className="text-xs text-foreground">{result.match_reason}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {result.matched_conditions.map((cond, idx) => (
                                <ConditionBadge key={idx} condition={cond} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Amendment timeline modal — opened from the "Amended" pill. */}
      <AmendmentTimelineModal
        solicitationId={amendmentSolId}
        solicitationNumber={amendmentSolNumber}
        onClose={() => setAmendmentSolId(null)}
      />

      {/* Solicitation PDF modal — opened from the PDF icon next to the
          solicitation number. Mirrors the parts/vendor search lists. */}
      {pdfModal && pdfUrl && (
        <Modal
          isOpen={true}
          onClose={() => setPdfModal(null)}
          title={`Solicitation ${pdfModal.number}`}
          size="full"
        >
          <div className="flex flex-col gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Open in new tab
            </a>
            <iframe
              src={pdfUrl}
              title={`Solicitation ${pdfModal.number}`}
              className="w-full border border-border rounded min-h-[70vh]"
            />
          </div>
        </Modal>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium transition-colors
              enabled:hover:bg-muted-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-muted px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium transition-colors
              enabled:hover:bg-muted-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
