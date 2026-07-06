"use client";

import { Fragment, useState } from "react";
import { SolicitationNumberLink } from "@/components/library/SolicitationNumberLink";
import { MatchStrengthBadge } from "@/components/ui/MatchStrengthBadge";
import { Modal } from "@/components/ui/Modal";
import { AmendmentTimelineModal } from "@/components/bidmatching/AmendmentTimelineModal";
import { timeAgo } from "@/lib/amendments";

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
  sam_url?: string | null;
}

interface BidMatchResultsTableProps {
  results: BidMatchResult[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusBadgeClass(status: string | null): string {
  switch ((status || "").toLowerCase()) {
    case "open":
      return "bg-green-100 text-green-800";
    case "awarded":
      return "bg-blue-100 text-blue-800";
    case "closed":
      return "bg-red-100 text-red-800";
    case "unavailable":
    case "removed":
    case "canceled":
    case "cancelled":
    default:
      return "bg-gray-100 text-gray-800";
  }
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
          : "bg-accent/10 text-accent-foreground border-accent/20"
      }`}
    >
      {negated && <span className="font-bold text-[10px]">NOT</span>}
      <span className="font-semibold text-muted-foreground">{condition.condition_type}:</span>
      <span className={negated ? "line-through" : ""}>{displayValue}</span>
      {condition.match_operator && condition.match_operator !== "eq" && (
        <span className="text-[10px] uppercase text-muted-foreground/70">({condition.match_operator})</span>
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
        <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <p className="mt-4 text-muted-foreground">No matches found for this date.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total.toLocaleString()} matches
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted-light border-b border-border">
              <th className="w-8 px-2 py-3" aria-label="Expand"></th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Solicitation</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Close Date</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Profile</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Match</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const isOpen = expanded.has(result.result_id);
              return (
                <Fragment key={result.result_id}>
                  <tr
                    className="border-b border-border last:border-0 hover:bg-muted-light/50 transition-colors"
                  >
                    <td className="px-2 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(result.result_id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5 font-medium">
                        {result.solicitation_number ? (
                          // Both DIBBS and SAM open the same parts modal, which lists
                          // the matching parts and links through to the solicitation on
                          // our site. SAM opportunities are now resolvable by
                          // solicitation number through the parts search API, so they
                          // use the identical link/modal as DIBBS. (The original
                          // SAM.gov posting is still reachable via the icon below.)
                          <SolicitationNumberLink
                            solicitationNumber={result.solicitation_number}
                            className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
                          />
                        ) : (
                          <span className="text-foreground">-</span>
                        )}
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
                        {/* Pre-match amendment: this match was triggered by
                            an existing amendment on the sol. */}
                        {result.has_amendment_indicator && (
                          <button
                            type="button"
                            onClick={() => {
                              setAmendmentSolId(result.solicitation_id);
                              setAmendmentSolNumber(result.solicitation_number);
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200"
                            title="This solicitation was updated before this match was generated. Click to see what changed."
                          >
                            Amended
                          </button>
                        )}
                        {/* Post-match amendment: sol changed AFTER the
                            customer was notified. Distinct color so the
                            two pills are visually separable. */}
                        {result.has_post_match_amendment && (
                          <button
                            type="button"
                            onClick={() => {
                              setAmendmentSolId(result.solicitation_id);
                              setAmendmentSolNumber(result.solicitation_number);
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 hover:bg-sky-200 border border-sky-200"
                            title={result.latest_post_match_amendment_at ? `This solicitation was updated after your match was generated. Latest change: ${new Date(result.latest_post_match_amendment_at).toLocaleString()}` : "This solicitation was updated after your match was generated."}
                          >
                            Updated{result.latest_post_match_amendment_at ? ` ${timeAgo(result.latest_post_match_amendment_at)}` : " since"}
                          </button>
                        )}
                      </div>
                      {result.agency_code && (
                        <div className="text-xs text-muted-foreground mt-0.5">{result.agency_code}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(result.status)}`}>
                        {result.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(result.close_date)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {result.profile_name}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-2">
                        <MatchStrengthBadge strength={result.match_strength} />
                        {result.match_reason ? (
                          <span
                            className="text-xs text-foreground truncate max-w-[280px]"
                            title={result.match_reason}
                          >
                            {result.match_reason}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {result.matched_conditions.length} condition
                            {result.matched_conditions.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-border last:border-0 bg-muted-light/30">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="text-xs text-muted-foreground mb-2">Matched conditions</div>
                        <div className="flex flex-wrap gap-1">
                          {result.matched_conditions.map((cond, idx) => (
                            <ConditionBadge key={idx} condition={cond} />
                          ))}
                        </div>
                        {result.set_aside_label && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            Set-aside: <span className="text-foreground">{result.set_aside_label}</span>
                          </div>
                        )}
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
          <span className="text-sm text-muted-foreground px-3">
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
