"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { VendorSearchForm, VendorSearchFormRef } from "@/components/library/VendorSearchForm";
import { VendorResultsList } from "@/components/library/VendorResultsList";
import { VendorDetail } from "@/components/library/VendorDetail";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import {
  VendorSearchType,
  VendorSearchResult,
  VendorSearchResponse,
  VendorDetail as VendorDetailType,
  buildSearchParams,
  getSearchTypeConfig,
} from "@/lib/library/types";

export default function VendorSearchPage() {
  const { isLoading: authLoading, hasProductAccess } = useAuth();

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VendorSearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Track last search for collapsed display
  const [lastSearchType, setLastSearchType] = useState<VendorSearchType | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

  // Vendor detail state
  const [selectedCageCode, setSelectedCageCode] = useState<string | null>(null);
  const [vendorDetail, setVendorDetail] = useState<VendorDetailType | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Ref for search form to control focus
  const searchFormRef = useRef<VendorSearchFormRef>(null);

  // Focus search input on mount
  useEffect(() => {
    searchFormRef.current?.focusInput();
  }, []);

  // Handle search
  const handleSearch = useCallback(async (type: VendorSearchType, query: string) => {
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setSelectedCageCode(null);
    setVendorDetail(null);
    setLastSearchType(type);
    setLastSearchQuery(query);

    try {
      const params = buildSearchParams(type, query);
      const response = await fetch(`/api/library/vendor/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      const searchResponse = data as VendorSearchResponse;
      setSearchResults(searchResponse.results);
      setTotalResults(searchResponse.total);

      // Collapse search form after successful search with results
      if (searchResponse.results.length > 0) {
        setIsSearchExpanded(false);
      }

      // If only one result and it's an exact match search (CAGE, UEI), auto-select it
      if (searchResponse.results.length === 1 && (type === "cage" || type === "uei")) {
        handleSelectVendor(searchResponse.results[0].cage_code);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError(error instanceof Error ? error.message : "An unexpected error occurred");
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle vendor selection
  const handleSelectVendor = useCallback(async (cageCode: string) => {
    if (cageCode === selectedCageCode) return;

    setSelectedCageCode(cageCode);
    setIsLoadingDetail(true);
    setDetailError(null);
    setVendorDetail(null);

    try {
      const response = await fetch(`/api/library/vendor/${encodeURIComponent(cageCode)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load vendor details");
      }

      setVendorDetail(data as VendorDetailType);
    } catch (error) {
      console.error("Detail error:", error);
      setDetailError(error instanceof Error ? error.message : "Failed to load vendor details");
    } finally {
      setIsLoadingDetail(false);
    }
  }, [selectedCageCode]);

  // Handle back to results
  const handleBackToResults = useCallback(() => {
    setSelectedCageCode(null);
    setVendorDetail(null);
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
    const config = getSearchTypeConfig(lastSearchType);
    return config.label;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Check if user has access to vendor search
  if (!hasProductAccess("library_vendor_search")) {
    return (
      <AccessDeniedPage
        featureName="Vendor Search"
        featureKey="library_vendor_search"
        description="Search and explore government vendor information including CAGE codes, UEI, business details, recent awards, contracts, and open solicitations."
        benefits={[
          "Find vendors by CAGE code, UEI, DUNS, or business name",
          "View detailed vendor profiles with contact information",
          "Track vendor contract awards and bookings",
          "Discover open solicitations from specific vendors",
        ]}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Section - Collapsible */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {/* Collapsed State - Compact Summary Bar */}
        {hasSearched && !isSearchExpanded && !searchError && (
          <div
            className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
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
        )}

        {/* Expanded State - Full Search Form */}
        {(isSearchExpanded || !hasSearched || searchError) && (
          <div className="p-4">
            {/* Header with collapse button when has results */}
            {hasSearched && !searchError && totalResults > 0 && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">Search Vendors</h2>
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
            <VendorSearchForm ref={searchFormRef} onSearch={handleSearch} isSearching={isSearching} />
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
          {/* Show vendor detail when selected */}
          {selectedCageCode ? (
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

              {/* Vendor Detail - Full Width */}
              {isLoadingDetail ? (
                <div className="bg-white rounded-lg border border-border p-6">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm text-muted">Loading details...</span>
                  </div>
                </div>
              ) : detailError ? (
                <div className="bg-white rounded-lg border border-border p-6">
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
              ) : vendorDetail ? (
                <VendorDetail vendor={vendorDetail} />
              ) : null}
            </div>
          ) : (
            /* Show results list when no vendor selected - Full Width */
            <VendorResultsList
              results={searchResults}
              total={totalResults}
              onSelect={handleSelectVendor}
              selectedCageCode={undefined}
              isLoading={isSearching}
            />
          )}
        </>
      )}

      {/* Initial State (no search yet) */}
      {!hasSearched && !searchError && (
        <div className="bg-white rounded-lg border border-border p-8 text-center">
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
            Search for Vendors
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Search by CAGE code, UEI, DUNS number, company name, or contact email
          </p>
        </div>
      )}
    </div>
  );
}
