"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BIDDING_PRODUCT_KEY } from "@/lib/bidding/access";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import {
  BidMatchDateMenu,
  dateSelectionHref,
  parseDateSelection,
  type DateSelection,
} from "@/components/bidmatching/BidMatchDateMenu";
import { BidMatchResultsTable, type BidSortKey } from "@/components/bidmatching/BidMatchResultsTable";
import {
  BidMatchFilterBar,
  parseFilterParams,
  serializeFilters,
  type FilterRow,
} from "@/components/bidmatching/BidMatchFilterBar";
import { formatDateMmDdYyyy } from "@/lib/dates";
import { quickFindRows } from "@/lib/bidmatching/quickFind";
import { clearWorklistReturn, readWorklistReturn, takeWorklistFlash } from "@/lib/bidding/worklistReturn";
import type { BidTermDefinitions, SolicitationBidTerms } from "@/lib/library/bidTerms";
import { HighlightBar } from "@/components/bidmatching/HighlightBar";
import { ManageHighlightsDialog, type HighlightDraft } from "@/components/bidmatching/ManageHighlightsDialog";
import {
  highlightFilterParam,
  matchesHighlightFilter,
  parseHighlightFilter,
  type HighlightBrush,
  type HighlightFilter,
  type HighlightLabel,
} from "@/lib/bidmatching/highlights";


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
  // DIBBS rows: solicitations.status as stored — a past close date does not
  // close a stored 'open'. SAM rows close at the response deadline.
  status: string | null;
  // Stored open, return-by date passed: `status` still reads "open" and
  // PendingOutcomeFlag warns. Not gated on a recent check. False on SAM rows.
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
  // The account's highlight color on this solicitation (a HighlightLabel id).
  highlight_id?: number | null;
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
  // Rows per highlight color id (as a string) and "none", under every filter
  // but the highlight one. Empty when the account has no colors.
  highlight_counts?: Record<string, number>;
}

// 200 is the server's ceiling (page_size is Query(le=200) on the results
// endpoint), so the widest choice here is the widest one the API will serve.
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const DEFAULT_PAGE_SIZE = 50;
// The original key, deliberately. It holds a "50" for most visitors — the
// size used to be persisted by an effect that also ran on mount, so simply
// opening the page wrote the default back as though it had been chosen — and
// with the default at 50 that stored value is harmless, while reading the key
// still honours anyone who genuinely picked 25, 100 or 200. Only a real
// choice is written now (see handlePageSizeChange), so a future change to
// DEFAULT_PAGE_SIZE will reach everyone who never picked one.
const PAGE_SIZE_STORAGE_KEY = "bidmatching-page-size";

// Soonest close date first. Without a sort the API falls back to newest match
// first, which is not a column — no header could reproduce it, so one click on
// any other column lost that order until a reload. Close date ascending is the
// urgent end of the list and IS a column, so the default is now somewhere the
// user can get back to. NULLs sink in both directions server-side, so
// solicitations with no stated close date never lead the page.
const DEFAULT_SORT_BY: BidSortKey = "close_date";
const DEFAULT_SORT_DIR: "asc" | "desc" = "asc";

export default function BidMatchingPage() {
  const { isLoading: authLoading, hasProductAccess, hasProductAccessByPrefix } = useAuth();
  // Bid Manager add-on holders work this page as their Bid Worklist: the same
  // matches, plus a Bid column and a "Not yet bid" filter. Everyone else gets
  // Bid-Matching exactly as before.
  const isWorklist = hasProductAccess(BIDDING_PRODUCT_KEY);

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
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  // Restored from localStorage on mount, never during render: reading storage
  // in the initializer would hand the client a different first render than the
  // server sent, and hydration would tear. Same shape as the RFQ worklist.
  const [pageSizeInitialized, setPageSizeInitialized] = useState(false);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  // Whether any results fetch has finished — the scroll restore waits for it.
  const [resultsLoadedOnce, setResultsLoadedOnce] = useState(false);
  // Stamped when Print is clicked rather than during render — `new Date()` at
  // render time would mismatch between the server and client HTML. Same
  // pattern as the RFQ detail page.
  const [printedOn, setPrintedOn] = useState<string | null>(null);
  const [printRequested, setPrintRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfiles, setHasProfiles] = useState<boolean | null>(null);
  // Condition filters, applied on the Apply button rather than per keystroke:
  // these reach every line item on every solicitation in the bucket, so a
  // request per character is not something the query can afford.
  const [filters, setFilters] = useState<FilterRow[]>([]);
  // The conditions as the API will receive them. Used as the effect's
  // dependency so a new array holding the same conditions does not refetch,
  // and as the only thing the fetch has to be handed.
  const filterParams = useMemo(() => serializeFilters(filters), [filters]);
  const filterKey = filterParams.join("|");
  // Quick-find: narrows the rows already on screen, in the browser. It never
  // reaches the API — the filters are the server-side, whole-bucket search.
  const [quickFind, setQuickFind] = useState("");
  // Sorting is server-side: the page holds one slice of N rows, so sorting
  // here would only reorder the slice already on screen.
  const [sortBy, setSortBy] = useState<BidSortKey>(DEFAULT_SORT_BY);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(DEFAULT_SORT_DIR);
  const [interestedOnly, setInterestedOnly] = useState(false);
  // Bid Worklist only: solicitations the team has no bid on yet. DIBBS
  // buckets only — a SAM posting cannot be bid here.
  const [notBidOnly, setNotBidOnly] = useState(false);
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

  // Row highlights: the account's named colors, the highlighter (which color
  // a row click applies, if any), and the "Show" filter with its counts.
  const [highlightLabels, setHighlightLabels] = useState<HighlightLabel[]>([]);
  const [highlightBrush, setHighlightBrush] = useState<HighlightBrush>(null);
  const [highlightFilter, setHighlightFilter] = useState<HighlightFilter>(null);
  const [highlightCounts, setHighlightCounts] = useState<Record<string, number>>({});
  const [manageHighlightsOpen, setManageHighlightsOpen] = useState(false);
  // Bumped to refetch the same page, for "Refresh list" and after a color is
  // deleted (its rows and counts change server-side).
  const [reloadTick, setReloadTick] = useState(0);
  // A link can name a color that has since been deleted. Treat it as no
  // filter once the colors are known, rather than an empty list under a menu
  // that cannot name what it is showing.
  const effectiveHighlightFilter: HighlightFilter =
    typeof highlightFilter === "number" && highlightLabels.length > 0
    && !highlightLabels.some((l) => l.id === highlightFilter)
      ? null
      : highlightFilter;

  // Validate against the option list rather than trusting the stored number:
  // it is user-editable, and anything above the API's le=200 would 422 every
  // results fetch until the user cleared their storage.
  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
      if ((PAGE_SIZE_OPTIONS as readonly number[]).includes(stored)) setPageSize(stored);
    } catch { /* ignore */ }
    setPageSizeInitialized(true);
  }, []);

  // Every filter and sort change goes back to page 1, so narrowing never
  // lands on an empty out-of-range page. Done in the handlers rather than in
  // an effect on the filters: an effect would also fire when the URL restores
  // them, and throw away the page the URL restored with them.
  const applyFilters = (rows: FilterRow[]) => { setFilters(rows); setPage(1); };
  const toggleInterestedOnly = () => { setInterestedOnly((v) => !v); setPage(1); };
  const toggleNotBidOnly = () => { setNotBidOnly((v) => !v); setPage(1); };
  const toggleBiddableOnly = () => { setBiddableOnly((v) => !v); setPage(1); };
  const applyHighlightFilter = (f: HighlightFilter) => { setHighlightFilter(f); setPage(1); setReloadTick((t) => t + 1); };

  // Everything placeHref (below) writes besides the date. Unknown or stale
  // values fall back to the defaults: the backend is the real check on sort
  // keys and filters, and a bad one shows as its usual error.
  const restoreFromUrl = (search: string, source: "dibbs" | "sam") => {
    const params = new URLSearchParams(search);
    const pg = Number(params.get("page"));
    if (Number.isInteger(pg) && pg > 1) setPage(pg);
    const sort = params.get("sort");
    const dir = params.get("dir");
    if (sort && (dir === "asc" || dir === "desc")) {
      setSortBy(sort as BidSortKey);
      setSortDir(dir);
    }
    setInterestedOnly(params.get("starred") === "1");
    setNotBidOnly(source === "dibbs" && params.get("notbid") === "1");
    setBiddableOnly(source === "sam" && params.get("biddable") === "1");
    setHighlightFilter(parseHighlightFilter(params.get("hl")));
    const f = params.getAll("f").filter(Boolean);
    if (f.length) setFilters(parseFilterParams(f));
  };

  // Back from the bid editor: a note on what happened to the bid, and the
  // scroll position and row the bidder left from (see worklistReturn).
  const [toast, setToast] = useState<string | null>(null);
  const [highlightSolicitationId, setHighlightSolicitationId] = useState<number | null>(null);
  const pendingReturn = useRef<{ scrollY: number; solicitationId: number } | null>(null);
  useEffect(() => {
    setToast(takeWorklistFlash());
    const back = readWorklistReturn();
    if (back && back.href === window.location.pathname + window.location.search) {
      pendingReturn.current = { scrollY: back.scrollY, solicitationId: back.solicitationId };
    }
    clearWorklistReturn();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!highlightSolicitationId) return;
    const t = setTimeout(() => setHighlightSolicitationId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightSolicitationId]);

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
          setError("Could not save the star. Please try again.");
        }
      } catch {
        apply(!interested);
        setError("Could not save the star. Please try again.");
      }
    },
    [],
  );

  // The account's highlight colors. A failure leaves the highlighter showing
  // its set-up prompt rather than breaking the page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bid-matching/highlights");
        if (!res.ok || cancelled) return;
        const data: HighlightLabel[] = await res.json();
        if (!cancelled) setHighlightLabels(data);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Esc puts the highlighter down.
  useEffect(() => {
    if (highlightBrush == null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setHighlightBrush(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [highlightBrush]);

  // A row clicked with the highlighter on. Clicking a row that already has
  // the brush's color clears it, so a misclick undoes with a second click.
  // Optimistic, like the star, and reconciled on the solicitation. The
  // counts move with it; the row stays in view even if it no longer fits the
  // "Show" filter (isRowStale fades it) until the list is refreshed.
  const handlePaintRow = useCallback(
    async (result: BidMatchResult) => {
      if (highlightBrush == null) return;
      const before = result.highlight_id ?? null;
      const after = highlightBrush === "erase" || highlightBrush === before ? null : highlightBrush;
      if (after === before) return;
      const sameTarget = (r: BidMatchResult) =>
        result.solicitation_id != null
          ? r.solicitation_id === result.solicitation_id
          : r.sam_opportunity_id === result.sam_opportunity_id;
      const apply = (from: number | null, to: number | null) => {
        setResults((prev) => prev.map((r) => (sameTarget(r) ? { ...r, highlight_id: to } : r)));
        setHighlightCounts((prev) => {
          if (Object.keys(prev).length === 0) return prev;
          const next = { ...prev };
          const fromKey = from == null ? "none" : String(from);
          const toKey = to == null ? "none" : String(to);
          next[fromKey] = Math.max(0, (next[fromKey] ?? 0) - 1);
          next[toKey] = (next[toKey] ?? 0) + 1;
          return next;
        });
      };
      apply(before, after);
      try {
        const res = await fetch("/api/bid-matching/results/highlight", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            solicitation_id: result.solicitation_id,
            sam_opportunity_id: result.sam_opportunity_id ?? null,
            label_id: after,
          }),
        });
        if (!res.ok) throw new Error();
      } catch {
        apply(after, before);
        setError("Could not save the highlight. Please try again.");
      }
    },
    [highlightBrush],
  );

  const handleSaveHighlights = async (drafts: HighlightDraft[]) => {
    const res = await fetch("/api/bid-matching/highlights", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels: drafts }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Could not save the colors. Please try again.");
    const saved: HighlightLabel[] = data;
    const kept = new Set(saved.map((l) => l.id));
    setHighlightLabels(saved);
    if (typeof highlightBrush === "number" && !kept.has(highlightBrush)) setHighlightBrush(null);
    if (typeof highlightFilter === "number" && !kept.has(highlightFilter)) {
      setHighlightFilter(null);
      setPage(1);
    }
    // Rows and counts change server-side when a color is removed, and the
    // counts appear for the first time when the first color is added.
    setReloadTick((t) => t + 1);
  };

  // First click picks the direction that column is actually useful in: the
  // biggest quantity/value first, but the SOONEST close date (that's the
  // urgent end) and solicitation numbers and NSNs A-Z — an NSN sorts by FSC
  // first, so ascending is what groups the same commodity class together.
  // Clicking again flips.
  const handleSort = (key: BidSortKey) => {
    setPage(1);
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      // Ascending on first click where ascending is the useful read: the
      // date columns because oldest is nearest its deadline (posted dates on
      // a whole-run view can run weeks back), and the identifier columns
      // because their natural order is alphanumeric.
      setSortDir(
        key === "close_date" || key === "posted" || key === "solicitation" || key === "nsn"
          ? "asc"
          : "desc",
      );
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
        // A date named in the URL wins — that is how a menu row opened in a
        // new tab lands on its date. Read once, here, rather than through
        // useSearchParams: the tree is what validates it, and later
        // selections write the URL themselves (handleDateSelect).
        const fromUrl = parseDateSelection(window.location.search, data);
        if (fromUrl) {
          setSelectedRunDate(fromUrl.runDate);
          setSelectedSource(fromUrl.source);
          setSelectedIssueDate(fromUrl.source === "dibbs" ? fromUrl.issueDate : null);
          // The rest of the place the URL names — page, sort and filters —
          // set in the same batch as the date, so the first fetch is the
          // right one. Only with a date: without one the URL is stale.
          restoreFromUrl(window.location.search, fromUrl.source);
        } else if (data.length > 0) {
          // Otherwise the newest run date, whole: a null issue date is the
          // run-wide view, so the page opens on everything that run produced
          // rather than only the slice posted that same day. Same selection
          // the menu's run row makes, so the row reads as selected on arrival.
          // Runs with no DIBBS matches fall back to their SAM bucket.
          const first = data[0];
          if (first.issue_dates.length > 0) {
            setSelectedRunDate(first.run_date);
            setSelectedIssueDate(null);
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
      size: number,
      conditions: string[],
      sort: BidSortKey,
      dir: "asc" | "desc",
      onlyInterested: boolean,
      onlyBiddable: boolean,
      onlyNotBid: boolean,
      highlight: HighlightFilter,
    ) => {
      setIsLoadingResults(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          run_date: runDate,
          page: pg.toString(),
          page_size: size.toString(),
          source,
        });
        if (source === "dibbs" && issueDate) params.set("date", issueDate);
        // Repeated, not comma-joined: a value may legitimately contain a comma
        // (an `is any of` list), so one parameter per condition.
        for (const f of conditions) params.append("f", f);
        if (sort) {
          params.set("sort_by", sort);
          params.set("sort_dir", dir);
        }
        if (onlyInterested) params.set("interested_only", "true");
        if (onlyBiddable) params.set("biddable_only", "true");
        if (onlyNotBid) params.set("not_bid_only", "true");
        const hl = highlightFilterParam(highlight);
        if (hl) params.set("highlight", hl);
        const res = await fetch(`/api/bid-matching/results?${params}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Failed to load match results");
        }
        const data: ResultsResponse = await res.json();
        setResults(data.results);
        setTotal(data.total);
        setNonBiddableCount(data.non_biddable_count ?? null);
        setHighlightCounts(data.highlight_counts ?? {});
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
        setResultsLoadedOnce(true);
      }
    },
    [],
  );

  // A restored page can be past the end by the time the bidder is back — a
  // bid placed under "Not yet bid" takes its row off the list. Step back to
  // the last page that has rows rather than show an empty one.
  useEffect(() => {
    if (!resultsLoadedOnce || isLoadingResults || results.length > 0 || page <= 1 || total === 0) return;
    setPage(Math.max(1, Math.ceil(total / pageSize)));
  }, [resultsLoadedOnce, isLoadingResults, results.length, page, total, pageSize]);

  // Back from the bid editor to the same URL: once its rows are in, scroll to
  // where the bidder was and point out the row they left from. One frame
  // later, so the table has laid out its height first.
  useEffect(() => {
    if (!resultsLoadedOnce || isLoadingResults || !pendingReturn.current) return;
    const back = pendingReturn.current;
    pendingReturn.current = null;
    const id = window.requestAnimationFrame(() => {
      window.scrollTo({ top: back.scrollY });
      setHighlightSolicitationId(back.solicitationId);
    });
    return () => window.cancelAnimationFrame(id);
  }, [resultsLoadedOnce, isLoadingResults]);

  useEffect(() => {
    // Wait for the stored page size, or the first load fetches 50 rows and
    // then immediately refetches at the restored size.
    if (!pageSizeInitialized) return;
    // No issue-date guard: on DIBBS a null issue date is the "All posted
    // dates" selection, which the API answers from run_date alone.
    if (!selectedRunDate) return;
    fetchResults(
      selectedSource, selectedRunDate, selectedIssueDate, page, pageSize,
      filterParams, sortBy, sortDir, interestedOnly, biddableOnly, notBidOnly,
      effectiveHighlightFilter,
    );
    // filterKey, not filterParams: the array is rebuilt on every render and
    // would retrigger the fetch forever; the key only changes with the
    // conditions themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pageSizeInitialized,
    selectedSource, selectedRunDate, selectedIssueDate, page, pageSize,
    filterKey, sortBy, sortDir, interestedOnly, biddableOnly, notBidOnly,
    effectiveHighlightFilter, reloadTick,
    fetchResults,
  ]);

  const shownResults = useMemo(() => quickFindRows(results, quickFind), [results, quickFind]);
  const quickFindActive = quickFind.trim() !== "";

  // Under a "Show" filter, rows marked or cleared since the fetch that no
  // longer fit it. They stay on screen (no jumping under the pointer) until
  // the list refreshes.
  const isRowStale = useCallback(
    (r: BidMatchResult) => !matchesHighlightFilter(r.highlight_id, effectiveHighlightFilter),
    [effectiveHighlightFilter],
  );
  const staleCount = effectiveHighlightFilter == null ? 0 : results.filter(isRowStale).length;

  const handleDateSelect = (selection: DateSelection) => {
    setSelectedRunDate(selection.runDate);
    setSelectedSource(selection.source);
    setSelectedIssueDate(selection.source === "dibbs" ? selection.issueDate : null);
    // The stage filter is SAM-only and its control is hidden on DIBBS buckets.
    // Clearing it on the way out keeps it from silently reapplying when the
    // user comes back to a SAM bucket several selections later.
    if (selection.source !== "sam") setBiddableOnly(false);
    // Likewise "Not yet bid", which is DIBBS-only.
    if (selection.source !== "dibbs") setNotBidOnly(false);
    setPage(1);
  };

  // The URL a page of results lives at: the date, then the page, sort and
  // filters. Kept in the address bar so a reload, a copied link, or coming
  // back from the bid editor reopens the same place. Defaults are left out to
  // keep plain links plain.
  const placeHref = useMemo(() => {
    if (!selectedRunDate) return null;
    const selection: DateSelection = selectedSource === "sam"
      ? { source: "sam", runDate: selectedRunDate }
      : { source: "dibbs", runDate: selectedRunDate, issueDate: selectedIssueDate };
    const url = new URL(dateSelectionHref(selection), "http://x");
    if (page > 1) url.searchParams.set("page", String(page));
    if (sortBy !== DEFAULT_SORT_BY || sortDir !== DEFAULT_SORT_DIR) {
      url.searchParams.set("sort", sortBy);
      url.searchParams.set("dir", sortDir);
    }
    if (interestedOnly) url.searchParams.set("starred", "1");
    if (notBidOnly) url.searchParams.set("notbid", "1");
    if (biddableOnly) url.searchParams.set("biddable", "1");
    const hl = highlightFilterParam(effectiveHighlightFilter);
    if (hl) url.searchParams.set("hl", hl);
    for (const f of filterParams) url.searchParams.append("f", f);
    return url.pathname + url.search;
    // filterKey stands in for filterParams, as in the fetch effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRunDate, selectedSource, selectedIssueDate, page, sortBy, sortDir,
      interestedOnly, notBidOnly, biddableOnly, effectiveHighlightFilter, filterKey]);
  // Replace rather than push: paging and filtering are browsing within the
  // page, not navigation Back should step through.
  useEffect(() => {
    if (placeHref && placeHref !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", placeHref);
    }
  }, [placeHref]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Back to page 1 on a size change: page 7 of 50-row pages doesn't exist once
  // the rows are 200 apiece, and landing past the end shows an empty table.
  // Both setters in one handler so React batches them into a single fetch.
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
    // Written here rather than in an effect on `pageSize`, which also fired on
    // mount and so stored the default as if the user had picked it. Only a
    // deliberate choice is remembered; everyone else follows the default.
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
    } catch { /* ignore */ }
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
          <h1 className="text-2xl font-bold text-foreground">
            {isWorklist ? "Bid Worklist" : "Bid-Matching"}
          </h1>
          <p className="mt-1 text-muted no-print">
            {isWorklist
              ? "Solicitations matched to your bid-matching profiles, ready to bid."
              : "Solicitations matched to your bid-matching profiles."}
          </p>
          {/* On paper the date selector is gone, so the printout has to say
              for itself which run it is. */}
          {selectedRunDate && (
            <p className="print-only mt-1 text-sm text-muted">
              {selectedSource === "sam" ? "SAM.gov" : "DIBBS"} matches — run{" "}
              {formatDateMmDdYyyy(selectedRunDate)}
              {selectedSource === "sam"
                ? ""
                : selectedIssueDate
                  ? `, posted ${formatDateMmDdYyyy(selectedIssueDate)}`
                  : ", all posted dates"}
              {printedOn ? ` · printed ${printedOn}` : ""}
            </p>
          )}
        </div>
        <div className="no-print flex-shrink-0 flex items-center gap-3">
          {/* Print used to sit here. It acts on the results, not the page, so
              it lives in the results toolbar now — this slot is navigation. */}
          <Link
            href="/account/bidmatching"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            Manage profiles →
          </Link>
        </div>
      </div>

      {toast && (
        <div className="no-print rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">{toast}</div>
      )}

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
            {/* Stars are shared across the account, so this is "what the team
                marked", not "what I marked". */}
            <button
              type="button"
              onClick={toggleInterestedOnly}
              aria-pressed={interestedOnly}
              title="Show only solicitations your team starred to come back to"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-colors cursor-pointer ${
                interestedOnly
                  ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              <span className={interestedOnly ? "text-amber-500" : "text-muted/50"}>★</span>
              Starred only
            </button>
            {/* Bid Worklist only, on DIBBS buckets: what still needs a bid.
                Any bid counts, drafts included — those are on the Bid Pipeline. */}
            {isWorklist && selectedSource === "dibbs" && (
              <button
                type="button"
                onClick={toggleNotBidOnly}
                aria-pressed={notBidOnly}
                title="Show only solicitations your team has not started a bid on"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-colors cursor-pointer ${
                  notBidOnly
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                Not yet bid
              </button>
            )}
            {/* Stage filter — SAM buckets only, because every DIBBS row IS a
                solicitation on the street. Hidden when the bucket holds
                nothing early-stage (nothing to hide), but kept visible while
                it is switched on so the filter can never be invisibly active.
                The count is what it hides, so the user can decide whether it
                is worth hiding before clicking. */}
            {selectedSource === "sam" && ((nonBiddableCount ?? 0) > 0 || biddableOnly) && (
              <button
                type="button"
                onClick={toggleBiddableOnly}
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
            {/* Quick-find, then Filters: everything in the bar sits left. The
                box narrows ONLY the rows on screen (this page), instantly and
                without a request; the count beside it says so, so nobody
                reads "no hits" as "not in this run". Filters are the
                whole-bucket search. */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={quickFind}
                  onChange={(e) => setQuickFind(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setQuickFind(""); }}
                  placeholder="Find on this page…"
                  aria-label="Find in the rows on this page"
                  title="Narrows the rows on this page by solicitation #, NSN, part #, description, match reason, set-aside or AMC. Use Filters to search every match."
                  className="w-60 rounded-lg border border-border bg-card-bg text-foreground text-sm pl-8 pr-7 py-1 focus:outline-none focus:border-primary"
                />
                {quickFindActive && (
                  <button
                    type="button"
                    onClick={() => setQuickFind("")}
                    aria-label="Clear find"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-base leading-none px-1 cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
              {quickFindActive && (
                <span className="text-xs text-muted whitespace-nowrap" aria-live="polite">
                  {shownResults.length} of {results.length} on this page
                </span>
              )}
            </div>
            {/* The condition filter. Replaces the single field-scoped search
                box: description, NSN, solicitation # and match reason are all
                fields on it, so nothing the box could ask is lost, and the
                things it could never ask — AMC, quantity, estimated value,
                TDP holdings, prior wins, fast-award — are now sayable in the
                same breath. */}
            <BidMatchFilterBar
              source={selectedSource}
              applied={filters}
              onApply={applyFilters}
              hasOtherFilters={
                interestedOnly || biddableOnly || notBidOnly || effectiveHighlightFilter != null || quickFindActive
                || sortBy !== DEFAULT_SORT_BY || sortDir !== DEFAULT_SORT_DIR
              }
              onClearAll={() => {
                setQuickFind("");
                setSortBy(DEFAULT_SORT_BY);
                setSortDir(DEFAULT_SORT_DIR);
                setInterestedOnly(false);
                setBiddableOnly(false);
                setNotBidOnly(false);
                setHighlightFilter(null);
                setPage(1);
              }}
            />
          </div>

          {/* Results */}
          <div className="bg-card-bg rounded-lg border border-border p-4">
            {selectedRunDate && (
              <HighlightBar
                labels={highlightLabels}
                brush={highlightBrush}
                onBrush={setHighlightBrush}
                filter={effectiveHighlightFilter}
                onFilter={applyHighlightFilter}
                counts={highlightCounts}
                staleCount={staleCount}
                onRefresh={() => setReloadTick((t) => t + 1)}
                onManage={() => setManageHighlightsOpen(true)}
              />
            )}
            {selectedRunDate ? (
              <BidMatchResultsTable
                results={shownResults}
                emptyMessage={quickFindActive ? "No rows on this page match your find." : undefined}
                bidTermDefinitions={bidTermDefinitions}
                isLoading={isLoadingResults}
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={handlePageSizeChange}
                onPrint={handlePrint}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
                onToggleInterest={handleToggleInterest}
                showBidColumn={isWorklist}
                highlightSolicitationId={highlightSolicitationId}
                highlightLabels={highlightLabels}
                highlightBrush={highlightBrush}
                onPaintRow={handlePaintRow}
                isRowStale={effectiveHighlightFilter == null ? undefined : isRowStale}
              />
            ) : (
              <div className="text-center py-16">
                <p className="text-muted">Select a date to view results.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {manageHighlightsOpen && (
        <ManageHighlightsDialog
          labels={highlightLabels}
          onClose={() => setManageHighlightsOpen(false)}
          onSave={handleSaveHighlights}
        />
      )}
    </div>
  );
}
