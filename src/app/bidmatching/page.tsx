"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { BidMatchDateMenu, type DateSelection } from "@/components/bidmatching/BidMatchDateMenu";
import { BidMatchResultsTable, type BidSortKey } from "@/components/bidmatching/BidMatchResultsTable";
import { PrintButton } from "@/components/ui/PrintButton";
import { formatDateMmDdYyyy } from "@/lib/dates";
import type { BidTermDefinitions, SolicitationBidTerms } from "@/lib/library/bidTerms";

/** Fields the results search can target. Values match the API's search_field. */
const SEARCH_FIELDS = [
  { value: "reason", label: "Match reason", placeholder: "Search match reason…" },
  { value: "description", label: "Description", placeholder: "Search item description…" },
  { value: "nsn", label: "NSN / part #", placeholder: "Search NSN, NIIN or part #…" },
  { value: "solicitation", label: "Solicitation #", placeholder: "Search solicitation #…" },
] as const;
type SearchField = (typeof SEARCH_FIELDS)[number]["value"];

interface IssueDateEntry {
  issue_date: string;
  match_count: number;
}

interface SamBucket {
  match_count: number;
}

interface RunDateGroup {
  run_date: string;
  total_count: number;
  issue_dates: IssueDateEntry[];
  sam_bucket?: SamBucket | null;
}

interface MatchedCondition {
  condition_type: string;
  match_value: string;
  condition_id?: number | null;
  match_operator?: string | null;
  is_negated?: boolean | null;
  match_label?: string | null;
}

/** One reason a solicitation matched. A row can carry several. */
interface BidMatchDetail {
  profile_id: number;
  profile_name: string;
  match_strength: "HARD" | "SOFT" | null;
  match_reason: string | null;
  matched_conditions: MatchedCondition[];
}

/** A part the match fired on, deduplicated by part. */
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

// One row is one SOLICITATION. The same solicitation can match several times
// over — two profiles, two line items, a second run the same day — and the
// server groups those into `matches` / `matched_parts` rather than repeating
// the solicitation down the table.
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
  solicitation_number: string | null;
  agency_code: string | null;
  // SAM rows only: stage of the posting. "Presolicitation" / "Sources Sought"
  // are NOT biddable and are badged as such. Null on DIBBS rows.
  notice_type?: string | null;
  issue_date: string | null;
  posted_date?: string | null;
  close_date: string | null;
  // DERIVED server-side, not solicitations.status verbatim — a stored 'open'
  // that nothing has confirmed is overruled by a close date in the past.
  status: string | null;
  // Deadline-closed, but DIBBS still lists it as open on a check inside 24h:
  // the outcome is pending, NOT still quotable. See PendingOutcomeFlag.
  dibbs_listed_open?: boolean;
  last_status_check_at?: string | null;
  buyer_name: string | null;
  set_aside: string | null;
  set_aside_code?: string | null;
  set_aside_label?: string | null;
  // DLA Solicitation Type Indicator: "F" (Fast Auto Evaluation), "P" (Auto
  // Evaluation), "I" (Automated IDC). Null/absent means UNKNOWN, not "no" —
  // never render a negative for it. Always null on SAM-source rows.
  solicitation_type?: string | null;
  // Label resolved from code_definitions (code_type='SOLICITATION_TYPE').
  solicitation_type_label?: string | null;
  // Bid-qualification terms off the solicitation, rendered in the expanded
  // row. Codes are unresolved — labels come from the page-level
  // bid_term_definitions map. Always null on SAM-source rows.
  bid_terms?: SolicitationBidTerms | null;
  sam_url?: string | null;
  // DLA demand signal (analytics add-on; strongest across the opportunity's NIINs).
  demand_signal?: string | null;
  // Primary line item + solicitation-level estimated value. See
  // BidMatchResultsTable for how these render.
  nsn?: string | null;
  niin?: string | null;
  fsc?: string | null;
  mfg_cage?: string | null;
  mfg_part_number?: string | null;
  part_description?: string | null;
  // Solicitation carries a contractor-tested First Article CLIN.
  first_article?: boolean;
  quantity?: number | null;
  unit_of_issue?: string | null;
  line_item_count?: number;
  estimated_value?: number | null;
  // Customer-scoped "come back to this" flag, and prior awards to the
  // customer's own CAGE for the row's primary part. See BidMatchResultsTable.
  interested?: boolean;
  win_count?: number;
  last_won_on?: string | null;
  recent_awards?: { contract_number: string; contract_date: string; quantity?: number | null; unit_price?: number | null }[];
}

interface ResultsResponse {
  results: BidMatchResult[];
  total: number;
  page: number;
  page_size: number;
  match_date: string;
  // code_type -> code -> {label, description} for every code in
  // results[].bid_terms. Page-level so the same ~110 DLA definitions aren't
  // repeated on all 50 rows.
  bid_term_definitions?: BidTermDefinitions;
  // SAM buckets only: how many rows in this bucket cannot be quoted —
  // Presolicitation and Sources Sought, plus the Award / Special Notice tail.
  // Counted BEFORE the biddable_only filter, so it keeps reporting what the
  // toggle is hiding while the toggle is on. Absent on the DIBBS path.
  non_biddable_count?: number | null;
}

const PAGE_SIZE = 50;

export default function BidMatchingPage() {
  const { isLoading: authLoading, hasProductAccessByPrefix } = useAuth();

  const [dateTree, setDateTree] = useState<RunDateGroup[]>([]);
  const [selectedRunDate, setSelectedRunDate] = useState<string | null>(null);
  const [selectedIssueDate, setSelectedIssueDate] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<"dibbs" | "sam">("dibbs");
  const [results, setResults] = useState<BidMatchResult[]>([]);
  // Bid-term vocabulary for the expanded row, refreshed with each page of
  // results. Near-static, so a stale-by-one-request copy is harmless.
  const [bidTermDefinitions, setBidTermDefinitions] = useState<BidTermDefinitions>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  // Stamped when Print is clicked rather than during render — `new Date()` at
  // render time would mismatch between the server and client HTML. Same
  // pattern as the RFQ detail page.
  const [printedOn, setPrintedOn] = useState<string | null>(null);
  const [printRequested, setPrintRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfiles, setHasProfiles] = useState<boolean | null>(null);
  const [hardOnly, setHardOnly] = useState(false);
  // Debounced search — pushes to `appliedSearch` after typing pauses so we
  // don't refetch on every keystroke. The field selector says which column
  // the term applies to; match reason is the historical default.
  const [searchField, setSearchField] = useState<SearchField>("reason");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  // Sorting is server-side: the page holds 50 of N rows, so sorting here
  // would only reorder the slice already on screen.
  const [sortBy, setSortBy] = useState<BidSortKey>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [interestedOnly, setInterestedOnly] = useState(false);
  // Keep only postings that can actually be quoted. SAM buckets only — every
  // DIBBS row is a solicitation on the street, so the backend ignores it there
  // and the control isn't rendered. Defaults OFF: pre-solicitations and
  // market-research notices are genuinely useful to vendors who work them, and
  // silently dropping matches the user was notified about would be worse than
  // showing them clearly badged.
  const [biddableOnly, setBiddableOnly] = useState(false);
  // How many rows the toggle is (or would be) hiding, straight off the last
  // response. Null when the bucket has none, or on the DIBBS path.
  const [nonBiddableCount, setNonBiddableCount] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    // Reset to page 1 whenever the filters or sort change so we don't land on
    // an empty out-of-range page after narrowing results.
    setPage(1);
  }, [hardOnly, appliedSearch, searchField, sortBy, sortDir, interestedOnly, biddableOnly]);

  // Optimistic: the star flips immediately and reverts if the write fails.
  // Flags are customer-scoped, so a teammate's flag can arrive on the next
  // fetch — this only reconciles the row the user actually clicked.
  //
  // Reconciles on the SOLICITATION, not result_id: the flag itself is stored
  // per solicitation (bid_match_interest), so any row for the same
  // solicitation shows the same star and all of them have to move together.
  const handleToggleInterest = useCallback(
    async (result: BidMatchResult, interested: boolean) => {
      const sameTarget = (r: BidMatchResult) =>
        result.solicitation_id != null
          ? r.solicitation_id === result.solicitation_id
          : r.sam_opportunity_id === result.sam_opportunity_id;
      const apply = (value: boolean) =>
        setResults((prev) =>
          prev.map((r) => (sameTarget(r) ? { ...r, interested: value } : r))
        );
      apply(interested);
      try {
        const res = await fetch("/api/bid-matching/results/interest", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            solicitation_id: result.solicitation_id,
            sam_opportunity_id: result.sam_opportunity_id ?? null,
            interested,
          }),
        });
        if (!res.ok) {
          apply(!interested);
          setError("Could not save the flag. Please try again.");
        }
      } catch {
        apply(!interested);
        setError("Could not save the flag. Please try again.");
      }
    },
    [],
  );

  // First click picks the direction that column is actually useful in: the
  // biggest quantity/value first, but the SOONEST close date (that's the
  // urgent end) and solicitation numbers A-Z. Clicking again flips.
  const handleSort = (key: BidSortKey) => {
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "close_date" || key === "solicitation" ? "asc" : "desc");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bid-matching/profiles", {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          setHasProfiles(null);
          return;
        }
        const data = await res.json();
        setHasProfiles(Array.isArray(data) && data.length > 0);
      } catch {
        if (!cancelled) setHasProfiles(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch date tree on mount
  useEffect(() => {
    async function fetchDateTree() {
      setIsLoadingDates(true);
      try {
        const res = await fetch("/api/bid-matching/results/date-tree");
        if (!res.ok) throw new Error("Failed to load match dates");
        const data: RunDateGroup[] = await res.json();
        setDateTree(data);
        // Auto-select first run date — prefer first DIBBS issue date, fall back
        // to the SAM bucket for run dates that have no DIBBS matches.
        if (data.length > 0) {
          const first = data[0];
          if (first.issue_dates.length > 0) {
            setSelectedRunDate(first.run_date);
            setSelectedIssueDate(first.issue_dates[0].issue_date);
            setSelectedSource("dibbs");
          } else if (first.sam_bucket && first.sam_bucket.match_count > 0) {
            setSelectedRunDate(first.run_date);
            setSelectedIssueDate(null);
            setSelectedSource("sam");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load match dates");
      } finally {
        setIsLoadingDates(false);
      }
    }
    fetchDateTree();
  }, []);

  // Fetch results when selection or page changes
  const fetchResults = useCallback(
    async (
      source: "dibbs" | "sam",
      runDate: string,
      issueDate: string | null,
      pg: number,
      strength: boolean,
      search: string,
      field: SearchField,
      sort: BidSortKey,
      dir: "asc" | "desc",
      onlyInterested: boolean,
      onlyBiddable: boolean,
    ) => {
      setIsLoadingResults(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          run_date: runDate,
          page: pg.toString(),
          page_size: PAGE_SIZE.toString(),
          source,
        });
        if (source === "dibbs" && issueDate) params.set("date", issueDate);
        if (strength) params.set("strength", "HARD");
        if (search) {
          params.set("search_field", field);
          params.set("search", search);
        }
        if (sort) {
          params.set("sort_by", sort);
          params.set("sort_dir", dir);
        }
        if (onlyInterested) params.set("interested_only", "true");
        if (onlyBiddable) params.set("biddable_only", "true");
        const res = await fetch(`/api/bid-matching/results?${params}`);
        if (!res.ok) throw new Error("Failed to load match results");
        const data: ResultsResponse = await res.json();
        setResults(data.results);
        setTotal(data.total);
        setNonBiddableCount(data.non_biddable_count ?? null);
        // The SAM path returns an EMPTY map, not a missing one — SAM rows
        // carry no bid terms. Keep whatever we already hold rather than
        // blanking it, so switching back to a DIBBS date doesn't briefly
        // render bare codes while the next response lands.
        const defs = data.bid_term_definitions;
        if (defs && Object.keys(defs).length > 0) setBidTermDefinitions(defs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load match results");
        setResults([]);
        setTotal(0);
        setNonBiddableCount(null);
      } finally {
        setIsLoadingResults(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedRunDate) return;
    if (selectedSource === "dibbs" && !selectedIssueDate) return;
    fetchResults(
      selectedSource, selectedRunDate, selectedIssueDate, page, hardOnly,
      appliedSearch, searchField, sortBy, sortDir, interestedOnly, biddableOnly,
    );
  }, [
    selectedSource, selectedRunDate, selectedIssueDate, page, hardOnly,
    appliedSearch, searchField, sortBy, sortDir, interestedOnly, biddableOnly,
    fetchResults,
  ]);

  const handleDateSelect = (selection: DateSelection) => {
    setSelectedRunDate(selection.runDate);
    setSelectedSource(selection.source);
    setSelectedIssueDate(selection.source === "dibbs" ? selection.issueDate : null);
    // The stage filter is SAM-only and its control is hidden on DIBBS buckets.
    // Clearing it on the way out keeps it from silently reapplying when the
    // user comes back to a SAM bucket several selections later.
    if (selection.source !== "sam") setBiddableOnly(false);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Prints the page of results currently on screen — filters, sort and
  // paging all apply. The browser's print dialog is also the "Save as PDF"
  // path, so one button covers both.
  const handlePrint = () => {
    setPrintedOn(formatDateMmDdYyyy(new Date().toISOString()));
    setPrintRequested(true);
  };

  // Open the print dialog once the printed-on stamp has actually painted.
  useEffect(() => {
    if (!printRequested) return;
    // The reset belongs inside the frame. Done before it, it flips a
    // dependency of this effect, React re-runs the effect, and the cleanup
    // cancels the very frame meant to open the dialog.
    const id = window.requestAnimationFrame(() => {
      setPrintRequested(false);
      window.print();
    });
    return () => window.cancelAnimationFrame(id);
  }, [printRequested]);

  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted-light">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Access check
  if (!hasProductAccessByPrefix("bid_matching")) {
    return (
      <AccessDeniedPage
        featureName="Bid-Matching"
        featureKey="bid_matching"
        description="Get automated solicitation matches based on your custom profiles — NIINs, FSCs, CAGE codes, set-asides, and more."
        benefits={[
          "Automatic daily matching against new DIBBS solicitations",
          "Custom match profiles with multiple condition types",
          "Email alerts when new opportunities match your criteria",
          "Historical match browsing by date",
          "Detailed match breakdowns showing exactly why each solicitation matched",
        ]}
      />
    );
  }

  return (
    /* print-root: everything outside it is hidden when printing (see
       globals.css). Without it this page printed a blank sheet, because the
       hide-everything rule is global while the reveal is scoped to the root.
       print-landscape: the results table is 12 columns wide. */
    <div className="print-root print-landscape space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bid-Matching</h1>
          <p className="mt-1 text-muted no-print">
            Solicitations matched to your bid-matching profiles.
          </p>
          {/* On paper the date selector is gone, so the printout has to say
              for itself which run it is. */}
          {selectedRunDate && (
            <p className="print-only mt-1 text-sm text-muted">
              {selectedSource === "sam" ? "SAM.gov" : "DIBBS"} matches — run{" "}
              {formatDateMmDdYyyy(selectedRunDate)}
              {selectedIssueDate ? `, posted ${formatDateMmDdYyyy(selectedIssueDate)}` : ""}
              {printedOn ? ` · printed ${printedOn}` : ""}
            </p>
          )}
        </div>
        <div className="no-print flex-shrink-0 flex items-center gap-3">
          <PrintButton onClick={handlePrint} title="Print this page of results" />
          <Link
            href="/account/bidmatching"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            Manage profiles →
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-error/20 bg-error/5 p-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Loading dates */}
      {isLoadingDates ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : dateTree.length === 0 ? (
        /* Empty state — branch on whether the user has any profile yet so the
           CTA points to the right next step (set one up vs. wait for the engine). */
        <div className="text-center py-16 bg-card-bg rounded-lg border border-border">
          <svg className="mx-auto h-16 w-16 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {hasProfiles === false ? (
            <>
              <h2 className="mt-4 text-lg font-semibold text-foreground">No bid-matching profile yet</h2>
              <p className="mt-2 text-muted max-w-md mx-auto">
                Create a profile to tell the bid-matching engine which solicitations
                you care about — by NIIN, FSC, CAGE code, set-aside, and more.
              </p>
              <Link
                href="/account/bidmatching"
                className="mt-6 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                Set up a profile →
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-lg font-semibold text-foreground">No match history yet</h2>
              <p className="mt-2 text-muted max-w-md mx-auto">
                Once the bid-matching engine finds solicitations that match your profiles, they will appear here.
                Make sure you have active profiles configured in your account settings.
              </p>
              <Link
                href="/account/bidmatching"
                className="mt-6 inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                Manage profiles →
              </Link>
            </>
          )}
        </div>
      ) : (
        /* Single-column layout. The run-date / posted-date tree lives in the
           BidMatchDateMenu dropdown rather than a fixed left column, so the
           results table gets the full page width. */
        <div className="space-y-4">
          {/* Command bar: date selection + filters on one line */}
          <div className="no-print flex flex-wrap items-center gap-3 bg-card-bg rounded-lg border border-border p-2">
            <BidMatchDateMenu
              dateTree={dateTree}
              selectedRunDate={selectedRunDate}
              selectedIssueDate={selectedIssueDate}
              selectedSource={selectedSource}
              onSelect={handleDateSelect}
            />
            <div className="w-px self-stretch bg-border" aria-hidden="true" />
            <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={hardOnly}
                onChange={(e) => setHardOnly(e.target.checked)}
                className="rounded border-border"
              />
              Hard hits only
            </label>
            {/* Flags are shared across the account, so this is "what the team
                marked", not "what I marked". */}
            <button
              type="button"
              onClick={() => setInterestedOnly((v) => !v)}
              aria-pressed={interestedOnly}
              title="Show only solicitations your team flagged to come back to"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-colors cursor-pointer ${
                interestedOnly
                  ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              <span className={interestedOnly ? "text-amber-500" : "text-muted/50"}>★</span>
              Flagged only
            </button>
            {/* Stage filter — SAM buckets only, because every DIBBS row IS a
                solicitation on the street. Hidden when the bucket holds
                nothing early-stage (nothing to hide), but kept visible while
                it is switched on so the filter can never be invisibly active.
                The count is what it hides, so the user can decide whether it
                is worth hiding before clicking. */}
            {selectedSource === "sam" && ((nonBiddableCount ?? 0) > 0 || biddableOnly) && (
              <button
                type="button"
                onClick={() => setBiddableOnly((v) => !v)}
                aria-pressed={biddableOnly}
                title="Hide postings you cannot quote — Presolicitation and Sources Sought notices, and any award or special notice that matched"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-colors cursor-pointer ${
                  biddableOnly
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                Biddable only
                {(nonBiddableCount ?? 0) > 0 && (
                  <span
                    className={`rounded px-1 text-[11px] font-semibold ${
                      biddableOnly
                        ? "bg-primary/15 text-primary"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                    }`}
                  >
                    {nonBiddableCount}
                  </span>
                )}
              </button>
            )}
            {/* Field selector + term, joined into one control so it reads as a
                single search rather than two unrelated inputs. */}
            {/* ONE border, on the wrapper — the select and input are
                border-0, so there is no second edge to see at the seam or on
                focus. The select also needs appearance-none: a native select
                paints its own frame inside an author border, which is the
                other half of the doubling. Its chevron is drawn back in. */}
            <div className="flex-1 min-w-[280px] max-w-lg flex items-stretch rounded-lg border border-border overflow-hidden focus-within:border-primary">
              <div className="relative flex items-stretch">
                <select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value as SearchField)}
                  aria-label="Field to search"
                  title="Which field the search term applies to"
                  className="appearance-none border-0 bg-muted-light text-foreground text-sm pl-2.5 pr-7 py-1.5 focus:outline-none cursor-pointer"
                >
                  {SEARCH_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {/* The seam: a 1px element, not two adjacent borders. */}
              <span className="w-px bg-border shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={SEARCH_FIELDS.find((f) => f.value === searchField)?.placeholder}
                className="flex-1 min-w-0 border-0 bg-card-bg text-foreground text-sm px-3 py-1.5 focus:outline-none"
              />
            </div>
            {(hardOnly || appliedSearch || sortBy || interestedOnly || biddableOnly) && (
              <button
                type="button"
                onClick={() => {
                  setHardOnly(false);
                  setSearchInput("");
                  setAppliedSearch("");
                  setSortBy("");
                  setSortDir("desc");
                  setInterestedOnly(false);
                  setBiddableOnly(false);
                }}
                className="text-xs text-muted hover:text-foreground cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Results */}
          <div className="bg-card-bg rounded-lg border border-border p-4">
            {selectedRunDate && (selectedSource === "sam" || selectedIssueDate) ? (
              <BidMatchResultsTable
                results={results}
                bidTermDefinitions={bidTermDefinitions}
                isLoading={isLoadingResults}
                total={total}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={handlePageChange}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
                onToggleInterest={handleToggleInterest}
              />
            ) : (
              <div className="text-center py-16">
                <p className="text-muted">Select a date to view results.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
