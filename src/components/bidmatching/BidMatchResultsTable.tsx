"use client";

import { Fragment, useState } from "react";
import { MatchStrengthBadge } from "@/components/ui/MatchStrengthBadge";
import { Modal } from "@/components/ui/Modal";
import { AmendmentTimelineModal } from "@/components/bidmatching/AmendmentTimelineModal";
import { BidMatchLineItems } from "@/components/bidmatching/BidMatchLineItems";
import { PartIdentityLink } from "@/components/bidmatching/PartIdentityLink";
import { SolicitationRowBadges, SolStatusBadge } from "@/components/library/SolicitationRowBadges";
import { RowBadge, rowBadgeClass, ROW_BADGE_BASE } from "@/components/library/RowBadge";
import { FirstArticleBadge, WinHistoryBadge } from "@/components/library/WinAndFirstArticleBadges";
import { BidTermsPanel } from "@/components/library/BidTermsPanel";
import type { BidTermDefinitions, SolicitationBidTerms } from "@/lib/library/bidTerms";
import { formatCurrency } from "@/lib/library/types";
import {
  SortHeader, rowClass, tableClass, tableHeadRowClass, tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";

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

interface BidMatchAward {
  contract_number: string;
  contract_date: string;
  quantity?: number | null;
  unit_price?: number | null;
}

/**
 * One reason a solicitation matched: a profile, its strength, and the
 * conditions that fired. A row carries several when the customer matched the
 * same solicitation through more than one profile, on more than one line item,
 * or again on a later run the same day — the server deduplicates those to
 * distinct reasons.
 */
interface BidMatchDetail {
  profile_id: number;
  profile_name: string;
  match_strength: "HARD" | "SOFT" | null;
  match_reason: string | null;
  matched_conditions: MatchedCondition[];
}

/**
 * A part the match fired on, deduplicated BY PART — one NSN listed against
 * several purchase requests is one entry, not several. Largest quantity first;
 * the first entry is what the NSN column shows inline.
 */
interface BidMatchPart {
  nsn?: string | null;
  niin?: string | null;
  fsc?: string | null;
  mfg_cage?: string | null;
  mfg_part_number?: string | null;
  part_description?: string | null;
  quantity?: number | null;
  unit_of_issue?: string | null;
}

// A row is one SOLICITATION, never one match row — see BidMatchDetail.
interface BidMatchResult {
  result_id: number;
  run_id: string;
  source: "dibbs" | "sam";
  solicitation_id: number | null;
  sam_opportunity_id?: number | null;
  profile_id: number;
  profile_name: string;
  matched_conditions: MatchedCondition[];
  matches?: BidMatchDetail[];
  matched_parts?: BidMatchPart[];
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
  // Bid-qualification terms off the joined solicitation — the approved-source
  // and quality gates, freight, inspection, and the AIDC contract terms.
  // Codes are unresolved; the page's bid_term_definitions map carries the
  // labels. NULL when the solicitation states none, and always NULL on
  // SAM-source rows. Rendered in the expanded row by BidTermsPanel.
  bid_terms?: SolicitationBidTerms | null;
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
  // Solicitation carries a contractor-tested First Article CLIN.
  first_article?: boolean;
  // Customer-scoped "come back to this" flag — shared by every user on the
  // account, not per-user.
  interested?: boolean;
  // Prior awards to the customer's own CAGE for the row's primary part.
  // win_count is 0 rather than null when there is no history.
  win_count?: number;
  last_won_on?: string | null;
  recent_awards?: BidMatchAward[];
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
    <span className={`${ROW_BADGE_BASE} ${c.cls}`}>{c.label}</span>
  );
}

/** Columns the server can sort on. "" = the default newest-first ordering. */
export type BidSortKey = "" | "interested" | "solicitation" | "quantity" | "estimated_value" | "close_date";

interface BidMatchResultsTableProps {
  results: BidMatchResult[];
  // Vocabulary for the codes in results[].bid_terms, sent once per page
  // rather than repeated on every row.
  bidTermDefinitions?: BidTermDefinitions;
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy: BidSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: BidSortKey) => void;
  onToggleInterest: (result: BidMatchResult, interested: boolean) => void;
}

/**
 * The "come back to this" star.
 *
 * A star, not a checkbox: a checkbox in a table reads as "select for a bulk
 * action, then clear" (which is what the RFQ worklist's checkboxes do). This
 * state is persistent and shared across the account, and a star says so.
 */
function InterestStar({
  result, onToggle,
}: {
  result: BidMatchResult;
  onToggle: (result: BidMatchResult, interested: boolean) => void;
}) {
  const on = Boolean(result.interested);
  return (
    <button
      type="button"
      onClick={() => onToggle(result, !on)}
      aria-pressed={on}
      title={
        on
          ? "Flagged — everyone on your account sees this. Click to remove."
          : "Flag this solicitation to come back to it"
      }
      aria-label={on ? "Remove flag" : "Flag this solicitation"}
      className={`text-sm leading-none cursor-pointer transition-colors ${
        on ? "text-amber-500 hover:text-amber-600" : "text-muted/30 hover:text-amber-500"
      }`}
    >
      {on ? "★" : "☆"}
    </button>
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
  bidTermDefinitions,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
  sortBy,
  sortDir,
  onSort,
  onToggleInterest,
}: BidMatchResultsTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [amendmentSolId, setAmendmentSolId] = useState<number | null>(null);
  const [amendmentSolNumber, setAmendmentSolNumber] = useState<string | null>(null);
  const [pdfModal, setPdfModal] = useState<{ id: number; number: string } | null>(null);
  const pdfUrl = pdfModal ? `/api/library/solicitations/${pdfModal.id}/pdf` : null;

  // Keyed on the solicitation/opportunity rather than result_id: result_id is
  // only representative of a grouped row, so it can change between fetches
  // (a later run wins MAX) and would silently collapse an open row.
  const rowKey = (r: BidMatchResult) =>
    `${r.source}-${r.solicitation_id ?? r.sam_opportunity_id ?? r.result_id}`;

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr className={tableHeadRowClass}>
              <SortHeader label="★" sortKey="interested" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" className="w-8" />
              <th className="w-6 px-1.5 py-1.5" aria-label="Expand"></th>
              <SortHeader label="Solicitation" sortKey="solicitation" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th className={thClass}>NSN</th>
              <th className={thClass}>Description</th>
              <SortHeader label="Qty" sortKey="quantity" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" className="whitespace-nowrap" />
              <th className={thClass}>UOM</th>
              <SortHeader label="Est. Value" sortKey="estimated_value" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" className="whitespace-nowrap" />
              <th className={`${thClass} whitespace-nowrap`}>Posted</th>
              <SortHeader label="Close Date" sortKey="close_date" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="whitespace-nowrap" />
              <th className={thClass}>Set-Aside</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const key = rowKey(result);
              const isOpen = expanded.has(key);
              // Line items beyond the one shown inline.
              const extraItems = Math.max(0, (result.line_item_count ?? 0) - 1);
              // Parts this solicitation actually matched on. One is already in
              // the NSN column, so only list them when there is more than one.
              const matchedParts = result.matched_parts ?? [];
              return (
                <Fragment key={key}>
                  <tr className={rowClass}>
                    <td className="px-1.5 py-1.5 text-center">
                      <InterestStar result={result} onToggle={onToggleInterest} />
                    </td>
                    <td className="px-1.5 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(key)}
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
                    <td className={tdClass}>
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
                            className={rowBadgeClass("indigo")}
                            title="Pure-SAM opportunity — no linked DIBBS solicitation"
                          >
                            SAM
                          </span>
                        )}
                        {/* Amendment pill + fast-award badge, shared with the
                            Send RFQs work queue (SolicitationRowBadges) so the
                            two pages read identically. One pill: the component
                            merges the pre- and post-match signals. */}
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
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <div className="flex items-center gap-1.5">
                        <PartIdentityLink part={result} className="data-field font-medium" />
                        <FirstArticleBadge firstArticle={result.first_article} />
                        <WinHistoryBadge
                          count={result.win_count ?? 0}
                          lastWonOn={result.last_won_on}
                          awards={result.recent_awards ?? []}
                          mode="part"
                        />
                        {extraItems > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(key)}
                            title={`${result.line_item_count} line items on this solicitation`}
                            className="text-[10px] font-semibold text-muted hover:text-primary border border-border rounded px-1 py-0.5 cursor-pointer"
                          >
                            +{extraItems} more
                          </button>
                        )}
                      </div>
                    </td>
                    <td className={`${tdClass} text-foreground`}>
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
                    <td className={`${tdClass} text-right text-muted data-field whitespace-nowrap`}>
                      {result.quantity != null ? result.quantity.toLocaleString() : "—"}
                    </td>
                    <td className={`${tdClass} text-muted whitespace-nowrap`}>
                      {result.unit_of_issue || "—"}
                    </td>
                    <td className={`${tdClass} text-right text-muted data-field whitespace-nowrap`}>
                      {result.estimated_value != null ? formatCurrency(result.estimated_value) : "—"}
                    </td>
                    {/* Posted date. DIBBS rows carry it as issue_date; SAM rows
                        as posted_date. Neither source populates both. */}
                    <td className={`${tdClass} text-muted whitespace-nowrap`}>
                      {formatDate(result.posted_date ?? result.issue_date)}
                    </td>
                    <td className={`${tdClass} text-muted whitespace-nowrap`}>
                      {formatDate(result.close_date)}
                    </td>
                    {/* The short code carries the column; the readable label
                        moves to the tooltip, matching the vendor Open
                        Solicitations tab. Falls back to the label, then the raw
                        string, so an unmapped row still shows something. */}
                    <td className={`${tdClass} text-muted whitespace-nowrap`}>
                      {result.set_aside_code ? (
                        <RowBadge title={result.set_aside_label || result.set_aside || undefined}>
                          {result.set_aside_code}
                        </RowBadge>
                      ) : (
                        result.set_aside_label || result.set_aside || "—"
                      )}
                    </td>
                    <td className={tdClass}>
                      <SolStatusBadge status={result.status} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-border last:border-0 bg-muted-light/30">
                      {/* Set-aside has its own column now. This row carries the
                          full line-item list plus the match detail that used to
                          sit in the dropped Profile and Match columns. */}
                      <td colSpan={12} className="px-3 py-3">
                        <div className="space-y-4">
                          {/* Can I bid on this at all, and what does bidding
                              cost me — ahead of the line items, because it
                              decides whether the line items matter. Renders
                              nothing when the solicitation states no terms. */}
                          <BidTermsPanel
                            terms={result.bid_terms}
                            definitions={bidTermDefinitions}
                          />

                          {/* The parts that put this solicitation in the list.
                              Ahead of the full line-item list because they are
                              the reason the row is here at all. Skipped at one
                              part — the NSN column already shows it. */}
                          {matchedParts.length > 1 && (
                            <div>
                              <div className="text-xs text-muted mb-2">
                                Matched parts ({matchedParts.length.toLocaleString()})
                              </div>
                              <div className={`${tableWrapClass} bg-card-bg`}>
                                <table className={tableClass}>
                                  <thead>
                                    <tr className={tableHeadRowClass}>
                                      <th className={thClass}>NSN</th>
                                      <th className={thClass}>Description</th>
                                      <th className={`${thClass} !text-right whitespace-nowrap`}>Qty</th>
                                      <th className={thClass}>UOM</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {matchedParts.map((part, idx) => (
                                      <tr key={`${part.nsn ?? part.mfg_part_number ?? idx}`} className="border-b border-border/60 last:border-0">
                                        <td className={`${tdClass} whitespace-nowrap`}>
                                          <PartIdentityLink part={part} className="data-field font-semibold" />
                                        </td>
                                        <td
                                          className={`${tdClass} text-foreground max-w-[420px] truncate`}
                                          title={part.part_description || undefined}
                                        >
                                          {part.part_description || "—"}
                                        </td>
                                        <td className={`${tdClass} text-right text-muted data-field whitespace-nowrap`}>
                                          {part.quantity != null ? part.quantity.toLocaleString() : "—"}
                                        </td>
                                        <td className={`${tdClass} text-muted whitespace-nowrap`}>
                                          {part.unit_of_issue || "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

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
                            {/* One block per distinct reason. A solicitation
                                can match through several profiles at once, and
                                showing only the strongest would hide the rest.
                                Falls back to the row-level scalars for any
                                response that predates `matches`. */}
                            {(result.matches?.length
                              ? result.matches
                              : [{
                                  profile_id: result.profile_id,
                                  profile_name: result.profile_name,
                                  match_strength: result.match_strength,
                                  match_reason: result.match_reason,
                                  matched_conditions: result.matched_conditions,
                                }]
                            ).map((match, mIdx) => (
                              <div key={`${match.profile_id}-${mIdx}`} className="mb-3 last:mb-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <MatchStrengthBadge strength={match.match_strength} />
                                  <span className="text-xs text-muted">
                                    Profile:{" "}
                                    <span className="text-foreground">{match.profile_name}</span>
                                  </span>
                                  {match.match_reason && (
                                    <span className="text-xs text-foreground">{match.match_reason}</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {match.matched_conditions.map((cond, idx) => (
                                    <ConditionBadge key={idx} condition={cond} />
                                  ))}
                                </div>
                              </div>
                            ))}
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
        <div className="no-print flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={`${tdClass} rounded-lg border border-border text-sm font-medium transition-colors
              enabled:hover:bg-muted-light disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Previous
          </button>
          <span className="text-sm text-muted px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className={`${tdClass} rounded-lg border border-border text-sm font-medium transition-colors
              enabled:hover:bg-muted-light disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
