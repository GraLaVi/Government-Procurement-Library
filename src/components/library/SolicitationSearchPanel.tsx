"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SolicitationFilters } from "@/components/library/SolicitationFilters";
import { SolicitationResultsTable } from "@/components/library/SolicitationResultsTable";
import { SolicitationDetailPanel } from "@/components/library/SolicitationDetailPanel";
import {
  EMPTY_SOLICITATION_FILTERS,
  SolicitationFilters as Filters,
  SolicitationResult,
  SolicitationSearchResponse,
  SolicitationSort,
  buildSolicitationSearchParams,
} from "@/lib/library/solicitationSearch";

// ============================================================================
// SolicitationSearchPanel — the whole no-part-link search surface.
// ============================================================================
// Self-contained on purpose. The parts page it hangs off is built end to end
// around a part: its state is search results -> selected NSN -> part detail,
// with a part-keyed cache and part-shaped recent searches. None of that fits a
// SAM notice, so rather than thread a second shape through all of it, the parts
// page branches once on search type and hands the whole surface over here.
//
// The cost of that choice is that this panel owns its own paging, filters and
// selection state instead of sharing the page's. The benefit is that the parts
// page gains one branch and no new concepts, and this surface can change its
// filters without touching a 557-line component that is already carrying a lot.
// ============================================================================

const PAGE_SIZE = 25;

export function SolicitationSearchPanel({
  keyword,
  onResultsFound,
}: {
  keyword: string;
  /**
   * Called once per keyword that actually returns something, so the page can
   * record it as a recent search. The page cannot do this itself: it hands the
   * keyword over and never learns the outcome, which is why these searches were
   * missing from the recent list entirely.
   */
  onResultsFound?: (keyword: string) => void;
}) {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_SOLICITATION_FILTERS });
  // Separate from `filters` so typing in the rail does not fire a request per
  // keystroke; the rail commits with its Apply button.
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ ...EMPTY_SOLICITATION_FILTERS });
  const [sort, setSort] = useState<SolicitationSort>("closing");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SolicitationResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SolicitationResult | null>(null);

  // Guards against an older, slower response overwriting a newer one — easy to
  // hit here because a keyword query and a filters-only query differ in cost by
  // an order of magnitude.
  const requestSeq = useRef(0);

  // Held in a ref so runSearch does not take it as a dependency. addAction
  // refetches the recent-actions list on every call, so a callback identity
  // that changed would re-run the search effect and could ping-pong.
  const onResultsFoundRef = useRef(onResultsFound);
  useEffect(() => { onResultsFoundRef.current = onResultsFound; }, [onResultsFound]);

  // Recorded once per keyword, not once per request: the same search re-runs on
  // every page flip, sort change and filter apply, and each addAction is a POST
  // plus a list refetch.
  const recordedKeyword = useRef<string | null>(null);

  // A new keyword invalidates the page number: staying on page 7 of a narrower
  // result set renders an empty table that reads as broken. Adjusted during
  // render rather than in an effect, per React's "you might not need an effect"
  // guidance and matching PartsSearchForm — resetting it in an effect would let
  // the search effect fire once against the stale page first, so every new
  // keyword would cost two requests instead of one.
  const [prevKeyword, setPrevKeyword] = useState(keyword);
  if (keyword !== prevKeyword) {
    setPrevKeyword(keyword);
    setPage(1);
  }

  const runSearch = useCallback(async (
    kw: string, f: Filters, s: SolicitationSort, p: number
  ) => {
    const seq = ++requestSeq.current;
    setIsLoading(true);
    setError(null);
    try {
      const params = buildSolicitationSearchParams(kw, f, s, p, PAGE_SIZE);
      const res = await fetch(`/api/library/sam-opportunities/search?${params.toString()}`);
      const data = await res.json();
      if (seq !== requestSeq.current) return;
      if (!res.ok) throw new Error(data.error || "Search failed");
      const payload = data as SolicitationSearchResponse;
      setResults(payload.results);
      setTotal(payload.total);

      // Only a search that found something is worth offering back as a
      // suggestion — the same rule the parts path follows. A filters-only
      // search has no keyword to record, so it is skipped.
      const trimmed = kw.trim();
      if (payload.total > 0 && trimmed && recordedKeyword.current !== trimmed) {
        recordedKeyword.current = trimmed;
        onResultsFoundRef.current?.(trimmed);
      }
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
      setTotal(0);
    } finally {
      if (seq === requestSeq.current) setIsLoading(false);
    }
  }, []);

  // The keyword arrives from the page's search bar, so a new search is a prop
  // change rather than an event here. Applied filters, sort and page are the
  // panel's own and re-run the same way.
  useEffect(() => {
    runSearch(keyword, appliedFilters, sort, page);
  }, [keyword, appliedFilters, sort, page, runSearch]);

  // Any change to what is being searched invalidates the page number: staying
  // on page 7 of a narrower result set shows an empty table that looks broken.
  const applyFilters = useCallback(() => {
    setPage(1);
    setAppliedFilters({ ...filters });
  }, [filters]);

  const handleSort = useCallback((next: SolicitationSort) => {
    setPage(1);
    setSort(next);
  }, []);


  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-60 lg:shrink-0">
        <SolicitationFilters
          filters={filters}
          onChange={setFilters}
          onApply={applyFilters}
          resultCount={isLoading ? null : total}
        />
      </div>

      <div className="flex-1 min-w-0">
        {error ? (
          <div className="bg-card-bg rounded-lg border border-border p-8 text-center">
            <h3 className="text-sm font-medium text-foreground mb-1">Search failed</h3>
            <p className="text-xs text-error">{error}</p>
          </div>
        ) : (
          <SolicitationResultsTable
            results={results}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            sort={sort}
            onSort={handleSort}
            onSelect={setSelected}
            onPageChange={setPage}
            isLoading={isLoading}
            hasKeyword={keyword.trim().length > 0}
          />
        )}
      </div>

      <SolicitationDetailPanel result={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
