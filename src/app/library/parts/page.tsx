"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PartsSearchForm, PartsSearchFormRef } from "@/components/library/PartsSearchForm";
import { PartsResultsList } from "@/components/library/PartsResultsList";
import { PartDetail } from "@/components/library/PartDetail";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RecentSearchesChips } from "@/components/library/RecentSearchesChips";
import { useRecentActions, useLastAction } from "@/lib/hooks/useRecentActions";
import {
  PartsSearchType,
  PartSearchResult,
  PartSearchResponse,
  PartDetail as PartDetailType,
  buildPartsSearchParams,
  getPartsSearchTypeConfig,
} from "@/lib/library/types";
import { PartsSearchActionData, RecentActionEntry } from "@/lib/preferences/types";

export default function PartsSearchPage() {
  const { isLoading: authLoading, hasProductAccess } = useAuth();

  // Recent actions hook
  const { actions: recentActions, addAction, deleteAction, isLoading: isLoadingActions } = useRecentActions('parts_search');
  const { lastAction } = useLastAction('parts_search');

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PartSearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Track last search for collapsed display
  const [lastSearchType, setLastSearchType] = useState<PartsSearchType | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

  // Part detail state
  const [selectedNSN, setSelectedNSN] = useState<string | null>(null);
  const [partDetail, setPartDetail] = useState<PartDetailType | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Initial search state from last action
  const [initialSearchType, setInitialSearchType] = useState<PartsSearchType | null>(null);
  const [initialSearchQuery, setInitialSearchQuery] = useState<string>("");

  // Ref for search form to control focus
  const searchFormRef = useRef<PartsSearchFormRef>(null);

  // Load last search on mount
  useEffect(() => {
    if (lastAction && lastAction.action_data) {
      const actionData = lastAction.action_data as PartsSearchActionData;
      setInitialSearchType(actionData.query_type as PartsSearchType);
      setInitialSearchQuery(actionData.query);
    }
  }, [lastAction]);

  // Focus search input on mount
  useEffect(() => {
    searchFormRef.current?.focusInput();
  }, []);

  // Handle part selection
  const handleSelectPart = useCallback(async (nsn: string) => {
    if (nsn === selectedNSN) return;

    setSelectedNSN(nsn);
    setIsLoadingDetail(true);
    setDetailError(null);
    setPartDetail(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(nsn)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load part details");
      }

      const detailResponse = data as { part: PartDetailType };
      setPartDetail(detailResponse.part);
    } catch (error) {
      console.error("Detail error:", error);
      setDetailError(error instanceof Error ? error.message : "Failed to load part details");
    } finally {
      setIsLoadingDetail(false);
    }
  }, [selectedNSN]);

  // Handle search
  const handleSearch = useCallback(async (type: PartsSearchType, query: string) => {
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setSelectedNSN(null);
    setPartDetail(null);
    setLastSearchType(type);
    setLastSearchQuery(query);

    try {
      const params = buildPartsSearchParams(type, query);
      const response = await fetch(`/api/library/parts/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      const searchResponse = data as PartSearchResponse;
      setSearchResults(searchResponse.results);
      setTotalResults(searchResponse.total);

      // Save search to recent actions
      try {
        const actionData: PartsSearchActionData = {
          query_type: type,
          query: query.trim(),
        };
        await addAction(actionData);
      } catch (err) {
        // Don't fail the search if saving to recent actions fails
        console.error('Failed to save search to recent actions:', err);
      }

      // Collapse search form after successful search with results
      if (searchResponse.results.length > 0) {
        setIsSearchExpanded(false);
      }

      // If only one result and it's an exact match search (NSN/NIIN, solicitation, etc.), auto-select it
      if (searchResponse.results.length === 1 && (type === "nsn_niin" || type === "solicitation" || type === "mfg_part_number" || type === "contract_number")) {
        await handleSelectPart(searchResponse.results[0].nsn);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError(error instanceof Error ? error.message : "An unexpected error occurred");
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  }, [addAction, handleSelectPart]);

  // Handle back to results
  const handleBackToResults = useCallback(() => {
    setSelectedNSN(null);
    setPartDetail(null);
    setDetailError(null);
  }, []);

  // Handle new search
  const handleNewSearch = useCallback(() => {
    setIsSearchExpanded(true);
    // Focus the input after expanding (slight delay to allow render)
    setTimeout(() => {
      searchFormRef.current?.focusInput();
    }, 0);
  }, []);

  // Get search type label for display
  const getSearchLabel = () => {
    if (!lastSearchType) return "";
    const config = getPartsSearchTypeConfig(lastSearchType);
    return config.label;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Check if user has access to parts search
  if (!hasProductAccess("library_parts_search")) {
    return (
      <AccessDeniedPage
        featureName="Parts Search"
        featureKey="library_parts_search"
        description="Search the parts library to find National Stock Numbers (NSN), part descriptions, pricing information, and related contract data."
        benefits={[
          "Search parts by NSN/NIIN, solicitation, mfg part number, contract number, description, or keywords",
          "View pricing and availability information",
          "Find related contracts and solicitations",
          "Access comprehensive parts master data",
        ]}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Section - Collapsible */}
      <div className="bg-card-bg rounded-lg border border-border overflow-hidden">
        {/* Collapsed State - Compact Summary Bar */}
        {hasSearched && !isSearchExpanded && !searchError && (
          <>
            <div
              className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-muted-light transition-colors"
              onClick={handleNewSearch}
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-4 h-4 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">{getSearchLabel()}:</span>
                  <span className="font-medium text-foreground">{lastSearchQuery}</span>
                  <span className="text-muted">({totalResults} result{totalResults !== 1 ? 's' : ''})</span>
                </div>
              </div>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 border border-primary/30 rounded hover:bg-primary/5 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNewSearch();
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                New Search
              </button>
            </div>
            {/* Recent Searches Chips - Also shown when collapsed */}
            {recentActions.length > 0 && (
              <div className="px-4 py-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                <RecentSearchesChips
                  actions={recentActions}
                  onSelectSearch={(action: RecentActionEntry) => {
                    const actionData = action.action_data as PartsSearchActionData;
                    const type = actionData.query_type === 'nsn' || actionData.query_type === 'niin' ? 'nsn_niin' : (actionData.query_type as PartsSearchType);
                    handleSearch(type, actionData.query);
                  }}
                  onDelete={deleteAction}
                  isLoading={isLoadingActions}
                />
              </div>
            )}
          </>
        )}

        {/* Expanded State - Full Search Form */}
        {(isSearchExpanded || !hasSearched || searchError) && (
          <div className="p-4">
            {/* Header with collapse button when has results */}
            {hasSearched && !searchError && totalResults > 0 && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">Search Parts</h2>
                <button
                  onClick={() => setIsSearchExpanded(false)}
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                  Collapse
                </button>
              </div>
            )}
            <PartsSearchForm 
              ref={searchFormRef} 
              onSearch={handleSearch} 
              isSearching={isSearching}
              initialSearchType={initialSearchType}
              initialSearchQuery={initialSearchQuery}
            />
            
            {/* Recent Searches Chips - Below search form */}
            {recentActions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <RecentSearchesChips
                  actions={recentActions}
                  onSelectSearch={(action: RecentActionEntry) => {
                    const actionData = action.action_data as PartsSearchActionData;
                    const type = actionData.query_type === 'nsn' || actionData.query_type === 'niin' ? 'nsn_niin' : (actionData.query_type as PartsSearchType);
                    handleSearch(type, actionData.query);
                  }}
                  onDelete={deleteAction}
                  isLoading={isLoadingActions}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {searchError && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-error">Search Error</h3>
              <p className="text-sm text-error/80 mt-1">{searchError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section - Full Width Layout */}
      {hasSearched && !searchError && (
        <>
          {/* Show part detail when selected */}
          {selectedNSN ? (
            <div className="space-y-3">
              {/* Back button */}
              <button
                onClick={handleBackToResults}
                className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to results ({totalResults})
              </button>

              {/* Part Detail - Full Width */}
              {isLoadingDetail ? (
                <div className="bg-card-bg rounded-lg border border-border p-6">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm text-muted">Loading details...</span>
                  </div>
                </div>
              ) : detailError ? (
                <div className="bg-card-bg rounded-lg border border-border p-6">
                  <div className="text-center">
                    <svg
                      className="w-8 h-8 text-error mx-auto mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      Error Loading Details
                    </h3>
                    <p className="text-xs text-muted">{detailError}</p>
                  </div>
                </div>
              ) : partDetail ? (
                <PartDetail part={partDetail} />
              ) : null}
            </div>
          ) : (
            /* Show results list when no part selected - Full Width */
            <PartsResultsList
              results={searchResults}
              total={totalResults}
              onSelect={handleSelectPart}
              selectedNSN={undefined}
              isLoading={isSearching}
            />
          )}
        </>
      )}

      {/* Initial State (no search yet) */}
      {!hasSearched && !searchError && (
        <div className="bg-card-bg rounded-lg border border-border p-8 text-center">
          <svg
            className="w-10 h-10 text-muted/50 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="text-sm font-medium text-foreground mb-1">
            Search for Parts
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Search by NSN/NIIN, solicitation, mfg part number, contract number, description, or keywords
          </p>
        </div>
      )}
    </div>
  );
}
