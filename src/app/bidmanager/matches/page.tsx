"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { SolicitationRowBadges, SolStatusBadge } from "@/components/library/SolicitationRowBadges";
import { ROW_BADGE_BASE } from "@/components/library/RowBadge";
import { WinHistoryBadge } from "@/components/library/WinAndFirstArticleBadges";
import { AmendmentTimelineModal } from "@/components/bidmatching/AmendmentTimelineModal";
import { BidTermsPanel } from "@/components/library/BidTermsPanel";
import { StartBidButton } from "@/components/bidding/StartBidButton";
import {
  SortHeader, TableCard, filterSelectClass, rowClass, tableClass, tableHeadRowClass,
  tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BIDDING_PRODUCT_KEY } from "@/lib/bidding/access";
import { bidFetch } from "@/lib/bidding/api";
import {
  BID_STATUS_LABELS,
  type MatchPage,
  type MatchRow,
  type MatchView,
} from "@/lib/bidding/types";
import {
  formatCurrency,
  formatPartIdentity,
  type PartSearchResponse,
  type PartSearchResult,
} from "@/lib/library/types";

// Bid on matches (plan 4.3, decision 29): the team's bid-matching results
// as a bidding queue, shaped like Send RFQs but needing no RFQ product. A row
// is a matched DIBBS solicitation; its Bid column starts the bid or opens the
// one the team already has.

const PAGE_SIZE = 50;
const ALL = "all";
const VIEW_STORAGE_KEY = "bidmanager-matches-view";
const SOL_STATUS_STORAGE_KEY = "bidmanager-matches-sol-status";

const SOL_STATUS_OPTIONS = ["open", "awarded", "closed", "cancelled", "removed", "unavailable", "all"] as const;
type SolStatusFilter = (typeof SOL_STATUS_OPTIONS)[number];

/** Same search control and fields as Send RFQs and the bid-matching page. */
const SEARCH_FIELDS = [
  { value: "solicitation", label: "Solicitation #", placeholder: "Search solicitation #…" },
  { value: "nsn", label: "NSN / part #", placeholder: "Search NSN, NIIN or part #…" },
  { value: "description", label: "Description", placeholder: "Search item description…" },
  { value: "pr", label: "PR #", placeholder: "Search PR number…" },
] as const;
type SearchField = (typeof SEARCH_FIELDS)[number]["value"];

type SortKey = "posted" | "close_date" | "solicitation_number" | "sol_status" | "set_aside" | "bid_status";

const VIEWS: { id: MatchView; label: string }[] = [
  { id: "to_bid", label: "To bid" },
  { id: "started", label: "Bid started" },
  { id: "all", label: "All" },
];

/** DIBBS First Article placeholder lines (pseudo-CAGE 0001S, no NSN) are not
 *  parts; the bid editor leaves them out too. */
const DIBBS_PLACEHOLDER_CAGE = "0001S";
function isQuotableLine(p: PartSearchResult): boolean {
  return !(p.mfg_cage === DIBBS_PLACEHOLDER_CAGE && !p.nsn?.trim());
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString();
}

/** Days until close (floored at 0); null when undated. */
function daysToClose(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const close = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((close.getTime() - today.getTime()) / 86400000));
}

/** The Bid column: start a bid, or the bid the team already has. */
function BidCell({ item }: { item: MatchRow }) {
  if (item.bid_id == null || item.bid_status == null) {
    return (
      <StartBidButton
        solicitationId={item.solicitation_id}
        fromRfq={item.rfq_priced}
        label={item.rfq_priced ? "Bid from RFQ price" : "Bid"}
        title={
          item.rfq_priced
            ? "Start the DIBBS quote with the prices your RFQ team set"
            : "Start a DIBBS quote for this solicitation"
        }
      />
    );
  }
  const tone =
    item.bid_status === "rejected"
      ? "text-error"
      : item.bid_status === "submitted" || item.bid_status === "verified"
      ? "text-success"
      : item.bid_status === "draft"
      ? "text-amber-700 dark:text-amber-300"
      : "text-muted";
  return (
    <div className="min-w-0">
      <Link href={`/bidmanager/${item.bid_id}`} className="text-primary hover:underline font-medium whitespace-nowrap">
        BID-{item.bid_reference_number}
      </Link>
      <span className={`ml-1.5 ${tone}`}>{BID_STATUS_LABELS[item.bid_status]}</span>
      {item.bid_created_by_name && (
        <div className="text-[11px] text-muted whitespace-nowrap">by {item.bid_created_by_name}</div>
      )}
    </div>
  );
}

export default function BidOnMatchesPage() {
  const { isLoading: authLoading, hasProductAccess } = useAuth();
  const hasAccess = hasProductAccess(BIDDING_PRODUCT_KEY);

  const [view, setView] = useState<MatchView>("to_bid");
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [solStatus, setSolStatus] = useState<SolStatusFilter>("open");
  const [startedBy, setStartedBy] = useState<string>(ALL);
  const [searchField, setSearchField] = useState<SearchField>("solicitation");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("close_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MatchPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amendmentSol, setAmendmentSol] = useState<{ id: number; number: string | null } | null>(null);
  const [pdfFor, setPdfFor] = useState<{ id: number; number: string | null } | null>(null);

  // Inline row expansion: bid terms and the solicited parts, fetched once.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [partsBySol, setPartsBySol] = useState<
    Record<number, { loading: boolean; error: string | null; parts: PartSearchResult[] }>
  >({});

  // Remembered view and status filter: a per-viewer convenience only.
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_STORAGE_KEY);
      if (v && VIEWS.some((x) => x.id === v)) setView(v as MatchView);
      const st = localStorage.getItem(SOL_STATUS_STORAGE_KEY);
      if (st && (SOL_STATUS_OPTIONS as readonly string[]).includes(st)) setSolStatus(st as SolStatusFilter);
    } catch { /* storage unavailable */ }
    setPrefsLoaded(true);
  }, []);
  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
      localStorage.setItem(SOL_STATUS_STORAGE_KEY, solStatus);
    } catch { /* storage unavailable */ }
  }, [view, solStatus, prefsLoaded]);

  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [view, solStatus, startedBy, sortBy, sortDir, appliedSearch, searchField]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  // "Started by" narrows to bids, so it does nothing on the To bid view.
  const startedByActive = view !== "to_bid" && startedBy !== ALL;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({
      view, page: String(page), page_size: String(PAGE_SIZE),
      sort_by: sortBy, sort_dir: sortDir, sol_status: solStatus,
    });
    if (startedByActive) qs.set("started_by_user_id", startedBy);
    if (appliedSearch) {
      qs.set("search_field", searchField);
      qs.set("search", appliedSearch);
    }
    try {
      setData(await bidFetch<MatchPage>(`/api/bidding/matches?${qs}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [view, page, sortBy, sortDir, solStatus, startedBy, startedByActive, appliedSearch, searchField]);

  useEffect(() => {
    if (prefsLoaded && !authLoading && hasAccess) load();
  }, [prefsLoaded, authLoading, hasAccess, load]);

  const toggleExpanded = (item: MatchRow) => {
    const id = item.solicitation_id;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (partsBySol[id] || !item.solicitation_number) return;
    setPartsBySol((prev) => ({ ...prev, [id]: { loading: true, error: null, parts: [] } }));
    (async () => {
      try {
        const params = new URLSearchParams({ solicitation: item.solicitation_number as string, limit: "50", offset: "0" });
        const res = await fetch(`/api/library/parts/search?${params}`);
        const body = await res.json();
        if (!res.ok) {
          setPartsBySol((prev) => ({ ...prev, [id]: { loading: false, error: body.error || "Failed to load parts.", parts: [] } }));
          return;
        }
        const parts = (body as PartSearchResponse).results.filter(isQuotableLine);
        setPartsBySol((prev) => ({ ...prev, [id]: { loading: false, error: null, parts } }));
      } catch {
        setPartsBySol((prev) => ({ ...prev, [id]: { loading: false, error: "Network error loading parts.", parts: [] } }));
      }
    })();
  };

  const items = useMemo(() => data?.items ?? [], [data]);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  // Nothing matched at all (not merely filtered away): Bid Matching feeds this page.
  const noMatchesAtAll =
    data != null && data.to_bid_count + data.started_count === 0 && !appliedSearch && solStatus === "open";

  if (authLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;

  if (!hasAccess) {
    return (
      <AccessDeniedPage
        featureName="Bid Manager"
        featureKey={BIDDING_PRODUCT_KEY}
        description="Bid on your matched DLA solicitations and send the quotes to DIBBS."
        benefits={[
          "Your bid-matching results, ready to bid",
          "Bid type worked out for you, with the reasons",
          "Saved answers for every part you quote",
        ]}
      />
    );
  }

  const counts: Partial<Record<MatchView, number>> = {
    to_bid: data?.to_bid_count,
    started: data?.started_count,
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bid on matches</h1>
          <p className="text-muted mt-1 text-sm max-w-3xl">
            Your team&apos;s matched DIBBS solicitations. Open a row to see its parts and terms, then Bid to
            start the quote. Finished bids are sent from{" "}
            <Link href="/bidmanager" className="text-primary hover:underline">Send bids</Link>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center px-3 py-1 rounded border border-primary text-primary text-xs font-medium transition-colors hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 flex items-center gap-1 border-b border-border overflow-x-auto">
        {VIEWS.map((v) => {
          const count = counts[v.id];
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                view === v.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {v.label}
              {count != null && count > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted/10 text-foreground text-[10px] font-semibold px-1.5 py-0.5">
                  {count.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/5 px-4 py-2.5 text-sm text-error">{error}</div>
      )}

      {noMatchesAtAll ? (
        <div className="bg-card-bg rounded-xl border border-border p-8 text-center max-w-2xl mx-auto">
          <p className="text-sm font-medium text-card-foreground">No matched solicitations yet</p>
          <p className="text-sm text-muted mt-2">
            This page lists the open DIBBS solicitations your Bid Matching profiles find. Once a profile
            matches, the solicitations appear here ready to bid.
          </p>
          <Link href="/bidmatching" className="inline-block mt-4 text-sm text-primary hover:underline">
            Go to Bid Matching
          </Link>
        </div>
      ) : (
        <TableCard
          header={
            <>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-muted whitespace-nowrap">
                Sol. status
                <select
                  className={filterSelectClass}
                  value={solStatus}
                  onChange={(e) => setSolStatus(e.target.value as SolStatusFilter)}
                  title="Picking a status other than Open also includes solicitations past their close date."
                >
                  <option value="open">Open</option>
                  <option value="awarded">Awarded</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="removed">Removed</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="all">All</option>
                </select>
              </label>
              {view !== "to_bid" && (
                <label className="inline-flex items-center gap-1.5 text-[11px] text-muted whitespace-nowrap">
                  Started by
                  <select className={filterSelectClass} value={startedBy} onChange={(e) => setStartedBy(e.target.value)}>
                    <option value={ALL}>Everyone</option>
                    {(data?.bidders ?? []).map((b) => (
                      <option key={b.user_id} value={String(b.user_id)}>
                        {b.name} ({b.count})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex-1 min-w-[240px] max-w-md flex items-stretch rounded-lg border border-border overflow-hidden focus-within:border-primary">
                <div className="relative flex items-stretch">
                  <select
                    value={searchField}
                    onChange={(e) => setSearchField(e.target.value as SearchField)}
                    aria-label="Field to search"
                    className="appearance-none border-0 bg-muted-light text-foreground text-xs pl-2 pr-6 py-1 focus:outline-none cursor-pointer"
                  >
                    {SEARCH_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <span className="w-px bg-border shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={SEARCH_FIELDS.find((f) => f.value === searchField)?.placeholder}
                  aria-label="Search term"
                  className="flex-1 min-w-0 border-0 bg-card-bg text-foreground text-xs px-2.5 py-1 focus:outline-none"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="px-2 text-muted hover:text-foreground"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              <span className="ml-auto text-xs text-muted">
                {data ? `${data.total.toLocaleString()} solicitation${data.total !== 1 ? "s" : ""}` : ""}
              </span>
            </>
          }
        >
          {loading && !data ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              {view === "to_bid" && (data?.started_count ?? 0) > 0 && !appliedSearch
                ? "Every matched solicitation has a bid. See Bid started."
                : "No solicitations match these filters."}
            </div>
          ) : (
            <div className={`${tableWrapClass} ${loading ? "opacity-60" : ""}`}>
              <table className={tableClass}>
                <thead>
                  <tr className={tableHeadRowClass}>
                    <th className="px-2 py-2 w-8" aria-label="Expand" />
                    <SortHeader label="Solicitation" sortKey="solicitation_number" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <th className={`${thClass} whitespace-nowrap`}>PR #</th>
                    <SortHeader label="Posted" sortKey="posted" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="whitespace-nowrap" />
                    <SortHeader label="Close date" sortKey="close_date" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="whitespace-nowrap" />
                    <SortHeader label="Set-aside" sortKey="set_aside" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <th className={`${thClass} whitespace-nowrap !text-right`}>Est. value</th>
                    <SortHeader label="Sol. Status" sortKey="sol_status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortHeader label="Bid" sortKey="bid_status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const dtc = daysToClose(item.close_date);
                    const isOpen = expanded.has(item.solicitation_id);
                    const partsState = partsBySol[item.solicitation_id];
                    return (
                      <Fragment key={item.solicitation_id}>
                        <tr className={rowClass}>
                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(item)}
                              className="text-muted hover:text-foreground"
                              aria-label={isOpen ? "Collapse parts" : "Show parts"}
                              aria-expanded={isOpen}
                            >
                              <svg
                                className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </td>
                          <td className={tdClass}>
                            <div className="flex flex-wrap items-center gap-1.5 font-medium">
                              <button
                                type="button"
                                onClick={() => toggleExpanded(item)}
                                className="text-primary font-medium hover:underline cursor-pointer"
                                title="Show the solicited parts"
                              >
                                {item.solicitation_number || "-"}
                              </button>
                              {item.has_pdf && (
                                <button
                                  type="button"
                                  onClick={() => setPdfFor({ id: item.solicitation_id, number: item.solicitation_number })}
                                  className="text-primary/70 hover:text-primary cursor-pointer"
                                  title={`Open solicitation ${item.solicitation_number} (PDF)`}
                                  aria-label={`Open solicitation ${item.solicitation_number} (PDF)`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                  </svg>
                                </button>
                              )}
                              <SolicitationRowBadges
                                hasAmendmentIndicator={item.has_amendment_indicator}
                                hasPostMatchAmendment={item.has_post_match_amendment}
                                latestPostMatchAmendmentAt={item.latest_post_match_amendment_at}
                                onShowAmendments={() => setAmendmentSol({ id: item.solicitation_id, number: item.solicitation_number })}
                                solicitationType={item.solicitation_type}
                                solicitationTypeLabel={item.solicitation_type_label}
                                idcBadge={false}
                              />
                              <WinHistoryBadge
                                count={item.won_part_count ?? 0}
                                lastWonOn={item.last_won_on}
                                awards={item.won_parts ?? []}
                                mode="solicitation"
                              />
                              {item.rfq_priced && (
                                <span
                                  className={`${ROW_BADGE_BASE} border-success/40 text-success`}
                                  title="Your RFQ team has priced this solicitation from vendor quotes"
                                >
                                  RFQ priced
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`${tdClass} font-mono whitespace-nowrap`}>
                            {item.pr_numbers.length === 0 ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <span title={item.pr_numbers.length > 1 ? item.pr_numbers.join(", ") : undefined}>
                                {item.pr_numbers[0]}
                                {item.pr_numbers.length > 1 && <span className="text-muted"> +{item.pr_numbers.length - 1}</span>}
                              </span>
                            )}
                          </td>
                          <td className={`${tdClass} whitespace-nowrap text-muted`}>{formatDate(item.issue_date)}</td>
                          <td className={`${tdClass} whitespace-nowrap`}>
                            <span className={dtc != null && dtc <= 3 ? "text-error font-semibold" : "text-foreground"}>
                              {formatDate(item.close_date)}
                            </span>
                            {dtc != null && (
                              <div className="text-[11px] text-muted">{dtc === 0 ? "closes today" : `${dtc}d left`}</div>
                            )}
                          </td>
                          <td className={tdClass}>{item.set_aside_label || item.set_aside || "—"}</td>
                          <td className={`${tdClass} text-right font-mono tabular-nums whitespace-nowrap`}>
                            {formatCurrency(item.estimated_value)}
                          </td>
                          <td className={`${tdClass} whitespace-nowrap`}>
                            <SolStatusBadge status={item.status} />
                          </td>
                          <td className={tdClass}>
                            <BidCell item={item} />
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-muted-light/30">
                            <td colSpan={9} className="px-6 py-3">
                              <div className="space-y-4">
                                <BidTermsPanel
                                  terms={item.bid_terms}
                                  definitions={data?.bid_term_definitions}
                                  firstArticle={item.first_article}
                                  solicitationType={item.solicitation_type}
                                />
                                {!partsState || partsState.loading ? (
                                  <div className="flex items-center gap-2 py-2 text-xs text-muted">
                                    <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    Loading parts…
                                  </div>
                                ) : partsState.error ? (
                                  <p className="text-xs text-error py-1">{partsState.error}</p>
                                ) : partsState.parts.length === 0 ? (
                                  <p className="text-xs text-muted italic py-1">No quotable line items on this solicitation.</p>
                                ) : (
                                  <div className={tableWrapClass}>
                                    <table className={tableClass}>
                                      <thead>
                                        <tr className={tableHeadRowClass}>
                                          <th className={thClass}>NSN</th>
                                          <th className={thClass}>Description</th>
                                          <th className={`${thClass} !text-right whitespace-nowrap`}>Qty / Unit</th>
                                          <th className={`${thClass} !text-right`}>Unit Price</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {partsState.parts.map((p) => (
                                          <tr key={p.id} className={rowClass}>
                                            <td className={`${tdClass} font-mono font-semibold whitespace-nowrap`}>
                                              {p.nsn?.trim() ? (
                                                <a
                                                  href={`/library/parts?search_type=nsn_niin&q=${encodeURIComponent(p.nsn)}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-primary hover:underline"
                                                  title="Open in Parts Search (new tab)"
                                                >
                                                  {formatPartIdentity(p)}
                                                </a>
                                              ) : (
                                                <span className="text-foreground">{formatPartIdentity(p)}</span>
                                              )}
                                            </td>
                                            <td className={`${tdClass} text-foreground truncate max-w-[380px]`} title={p.description || undefined}>
                                              {p.description || "—"}
                                            </td>
                                            <td className={`${tdClass} text-right whitespace-nowrap font-mono tabular-nums`}>
                                              {p.quantity != null
                                                ? `${p.quantity.toLocaleString()}${p.unit_of_issue ? `/${p.unit_of_issue}` : ""}`
                                                : p.unit_of_issue || "—"}
                                            </td>
                                            <td className={`${tdClass} text-right whitespace-nowrap font-mono tabular-nums`}>
                                              {formatCurrency(p.unit_price)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
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
          )}
        </TableCard>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            {data.total.toLocaleString()} solicitation{data.total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-muted">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {pdfFor && (
        <Modal isOpen={true} onClose={() => setPdfFor(null)} title={`Solicitation ${pdfFor.number ?? ""}`} size="full">
          <div className="flex flex-col gap-2">
            <a
              href={`/api/library/solicitations/${pdfFor.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Open in new tab
            </a>
            <iframe
              src={`/api/library/solicitations/${pdfFor.id}/pdf`}
              title={`Solicitation ${pdfFor.number ?? ""}`}
              className="w-full border border-border rounded min-h-[70vh]"
            />
          </div>
        </Modal>
      )}

      <AmendmentTimelineModal
        solicitationId={amendmentSol?.id ?? null}
        solicitationNumber={amendmentSol?.number ?? null}
        onClose={() => setAmendmentSol(null)}
      />
    </div>
  );
}
