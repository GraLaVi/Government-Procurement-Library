"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { BidMatchDatePicker } from "@/components/bidmatching/BidMatchDatePicker";
import { BidMatchResultsTable } from "@/components/bidmatching/BidMatchResultsTable";

interface DateEntry {
  match_date: string;
  match_count: number;
}

interface MatchedCondition {
  condition_type: string;
  match_value: string;
  condition_id?: number | null;
}

interface BidMatchResult {
  result_id: number;
  run_id: string;
  solicitation_id: number;
  profile_id: number;
  profile_name: string;
  matched_conditions: MatchedCondition[];
  created_at: string;
  solicitation_number: string | null;
  agency_code: string | null;
  issue_date: string | null;
  close_date: string | null;
  status: string | null;
  buyer_name: string | null;
  set_aside: string | null;
}

interface ResultsResponse {
  results: BidMatchResult[];
  total: number;
  page: number;
  page_size: number;
  match_date: string;
}

const PAGE_SIZE = 50;

export default function BidMatchingPage() {
  const { isLoading: authLoading, hasProductAccessByPrefix } = useAuth();

  const [dates, setDates] = useState<DateEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [results, setResults] = useState<BidMatchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available dates on mount
  useEffect(() => {
    async function fetchDates() {
      setIsLoadingDates(true);
      try {
        const res = await fetch("/api/bid-matching/results/dates");
        if (!res.ok) throw new Error("Failed to load match dates");
        const data: DateEntry[] = await res.json();
        setDates(data);
        if (data.length > 0) {
          setSelectedDate(data[0].match_date);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load match dates");
      } finally {
        setIsLoadingDates(false);
      }
    }
    fetchDates();
  }, []);

  // Fetch results when date or page changes
  const fetchResults = useCallback(async (date: string, pg: number) => {
    setIsLoadingResults(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/bid-matching/results?date=${date}&page=${pg}&page_size=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error("Failed to load match results");
      const data: ResultsResponse = await res.json();
      setResults(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load match results");
      setResults([]);
      setTotal(0);
    } finally {
      setIsLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchResults(selectedDate, page);
    }
  }, [selectedDate, page, fetchResults]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

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
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bid-Matching</h1>
        <p className="mt-1 text-muted-foreground">
          Solicitations matched to your bid-matching profiles.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading dates */}
      {isLoadingDates ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : dates.length === 0 ? (
        /* No match history */
        <div className="text-center py-16 bg-card-bg rounded-lg border border-border">
          <svg className="mx-auto h-16 w-16 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-foreground">No match history yet</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Once the bid-matching engine finds solicitations that match your profiles, they will appear here.
            Make sure you have active profiles configured in your account settings.
          </p>
        </div>
      ) : (
        <>
          {/* Date picker */}
          <div className="bg-card-bg rounded-lg border border-border p-4">
            <BidMatchDatePicker
              dates={dates}
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
            />
          </div>

          {/* Results table */}
          <div className="bg-card-bg rounded-lg border border-border p-4">
            <BidMatchResultsTable
              results={results}
              isLoading={isLoadingResults}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
