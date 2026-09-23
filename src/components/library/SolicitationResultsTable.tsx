"use client";

import { RowBadge } from "@/components/library/RowBadge";
import {
  NoticeTypeBadge, isBiddableNoticeType, numberKindLabel,
} from "@/components/library/NoticeTypeBadge";
import { SamDocumentsButton } from "@/components/library/SamDocumentsButton";
import {
  SortHeader, rowClass, tableClass, tableHeadRowClass, tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";
import {
  SolicitationResult,
  SolicitationSort,
  closeDateTone,
  describeCloseDate,
  displayNumber,
} from "@/lib/library/solicitationSearch";
import { formatContractDate } from "@/lib/library/types";

// ============================================================================
// SolicitationResultsTable — SAM.gov notices that have no part behind them.
// ============================================================================
// Deliberately the same visual language as BidMatchResultsTable (same header,
// row and cell classes from TableCard), because a customer moving between the
// two is looking at the same kind of object. What differs is what a row can
// say: there is no NSN, quantity, unit of issue or estimated value here, since
// every one of those comes from a part link these notices do not have. Columns
// that would be permanently empty are not rendered as empty columns — the
// space goes to title and agency, which are what actually identifies one of
// these notices.
// ============================================================================

/** Sort keys the table offers; must match the API's `sort` values. */
export type SolicitationSortKey = SolicitationSort;

export function SolicitationResultsTable({
  results,
  total,
  page,
  pageSize,
  sort,
  onSort,
  onSelect,
  onPageChange,
  isLoading,
  hasKeyword,
  sortable = true,
}: {
  results: SolicitationResult[];
  total: number;
  page: number;
  pageSize: number;
  sort: SolicitationSort;
  onSort: (key: SolicitationSortKey) => void;
  onSelect: (result: SolicitationResult) => void;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  /** Relevance is only offered with a keyword to rank against. */
  hasKeyword: boolean;
  /**
   * False for a fixed result set that the caller is not going to re-query —
   * the solicitation-number fallback shows every version of one number and has
   * nothing to sort by. The headers then render plain, because a header that
   * shows a sort arrow and does nothing when clicked is worse than one that
   * never offered.
   */
  sortable?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (isLoading) {
    return (
      <div className="bg-card-bg rounded-lg border border-border p-8 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted mt-3">Searching solicitations…</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-card-bg rounded-lg border border-border p-8 text-center">
        <svg className="mx-auto h-10 w-10 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <h3 className="text-sm font-medium text-foreground mt-3 mb-1">No solicitations found</h3>
        <p className="text-xs text-muted max-w-sm mx-auto">
          Try a broader keyword, or widen the filters — the status filter defaults
          to open solicitations only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
          {total.toLocaleString()} solicitations
        </p>
        {/* Relevance is hidden rather than disabled without a keyword: a sort
            option that silently does nothing is worse than one that is absent,
            and the API falls back to closing date anyway. */}
        {sortable && hasKeyword && (
          <label className="text-xs text-muted flex items-center gap-1.5">
            Sort
            <select
              value={sort}
              onChange={(e) => onSort(e.target.value as SolicitationSortKey)}
              className="text-xs border border-border rounded px-1.5 py-1 bg-card-bg text-foreground"
            >
              <option value="closing">Closing soonest</option>
              <option value="posted">Recently posted</option>
              <option value="relevance">Best match</option>
            </select>
          </label>
        )}
      </div>

      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr className={tableHeadRowClass}>
              {/* "Number", not "Solicitation": this column also carries award
                  numbers, reached through the contract-number lookup. The kind
                  is named per row rather than in the header, because a header
                  cannot be right for a mixed column and an award row labelled
                  "Solicitation" is simply wrong.

                  Not sortable: the API offers closing, posted and relevance,
                  and there is no sort-by-number. A header that looked sortable
                  and did nothing is the exact bug the bid-matching proxy's
                  comment describes. */}
              <th className={`${thClass} whitespace-nowrap`}>Number</th>
              <th className={thClass}>Title</th>
              <th className={thClass}>Agency</th>
              <th className={thClass}>Set-aside</th>
              <th className={`${thClass} whitespace-nowrap`}>NAICS / PSC</th>
              <th className={thClass}>Place</th>
              {sortable ? (
                <>
                  <SortHeader<SolicitationSortKey>
                    label="Posted" sortKey="posted" sortBy={sort} sortDir="desc"
                    onSort={onSort} className="whitespace-nowrap"
                  />
                  <SortHeader<SolicitationSortKey>
                    label="Closes" sortKey="closing" sortBy={sort} sortDir="asc"
                    onSort={onSort} className="whitespace-nowrap"
                  />
                </>
              ) : (
                <>
                  <th className={`${thClass} whitespace-nowrap`}>Posted</th>
                  <th className={`${thClass} whitespace-nowrap`}>Closes</th>
                </>
              )}
              <th className={thClass}>Documents</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const tone = closeDateTone(r.close_date);
              return (
                <tr
                  key={r.opp_id}
                  className={`${rowClass} cursor-pointer`}
                  onClick={() => onSelect(r)}
                >
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelect(r); }}
                      className="font-mono text-primary hover:underline cursor-pointer"
                    >
                      {displayNumber(r)}
                    </button>
                    {/* Only rendered for the exception — an ordinary
                        solicitation says nothing, so the word "Award" carries
                        weight instead of being one label among identical ones. */}
                    {numberKindLabel(r.notice_type) && (
                      <span className="block text-[11px] text-muted">
                        {numberKindLabel(r.notice_type)}
                      </span>
                    )}
                  </td>
                  <td className={`${tdClass} max-w-md`}>
                    <span className="line-clamp-2">{r.title || "—"}</span>
                    {/* Only ever renders for a non-biddable stage, and this
                        surface filters to biddable types — kept so the badge
                        still appears if that filter is ever widened. */}
                    <NoticeTypeBadge noticeType={r.notice_type} />
                  </td>
                  <td className={`${tdClass} text-muted whitespace-nowrap`}>
                    {r.agency || "—"}
                    {r.office && (
                      <span className="block text-[11px] text-muted/70 truncate max-w-[14rem]" title={r.office}>
                        {r.office}
                      </span>
                    )}
                  </td>
                  <td className={`${tdClass} text-muted whitespace-nowrap`}>
                    {r.set_aside_code ? (
                      <RowBadge title={r.set_aside_description || undefined}>
                        {r.set_aside_code}
                      </RowBadge>
                    ) : "—"}
                  </td>
                  <td className={`${tdClass} text-muted whitespace-nowrap font-mono text-[11px]`}>
                    {r.naics_code || "—"}
                    {r.psc_code && <span className="block">{r.psc_code}</span>}
                  </td>
                  <td className={`${tdClass} text-muted whitespace-nowrap`}>
                    {r.place_of_performance_state
                      ? `${r.place_of_performance_city ? `${r.place_of_performance_city}, ` : ""}${r.place_of_performance_state}`
                      : "—"}
                  </td>
                  <td className={`${tdClass} text-muted whitespace-nowrap`}>
                    {formatContractDate(r.posted_date)}
                  </td>
                  {/* The countdown is a quoting deadline, so it is only
                      rendered for notices you could quote. The by-number
                      lookup can return award notices, and "No deadline posted"
                      under an already-awarded contract reads as though a
                      deadline is still coming. */}
                  <td className={`${tdClass} whitespace-nowrap ${tone || "text-muted"}`}>
                    {r.close_date ? formatContractDate(r.close_date) : "—"}
                    {isBiddableNoticeType(r.notice_type) && (
                      <span className="block text-[11px]">
                        {describeCloseDate(r.close_date, r.is_open)}
                      </span>
                    )}
                  </td>
                  {/* The whole reason these notices are worth surfacing: the
                      scope of work lives in the attachments, not in the title.
                      Where we have not harvested them yet, SAM's own page is
                      the honest fallback rather than a button that opens an
                      empty dropdown. */}
                  <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                    {r.document_count > 0 ? (
                      <SamDocumentsButton
                        oppId={r.opp_id}
                        count={r.document_count}
                        label={displayNumber(r)}
                      />
                    ) : r.ui_link ? (
                      <a
                        href={r.ui_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                        title="We have not harvested this notice's attachments; open it on SAM.gov"
                      >
                        SAM.gov
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7m0-7L10 14m-7 7h7" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="text-xs px-2.5 py-1 rounded border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted-light cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-muted">Page {page} of {totalPages.toLocaleString()}</span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="text-xs px-2.5 py-1 rounded border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted-light cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
