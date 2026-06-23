"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { BidMatchDatePanel, type DateSelection } from "@/components/bidmatching/BidMatchDatePanel";
import { BidMatchResultsTable } from "@/components/bidmatching/BidMatchResultsTable";

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
  solicitation_number: string | null;
  agency_code: string | null;
  issue_date: string | null;
  posted_date?: string | null;
  close_date: string | null;
  status: string | null;
  buyer_name: string | null;
  set_aside: string | null;
  set_aside_code?: string | null;
  set_aside_label?: string | null;
  sam_url?: string | null;
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

  const [dateTree, setDateTree] = useState<RunDateGroup[]>([]);
  const [selectedRunDate, setSelectedRunDate] = useState<string | null>(null);
  const [selectedIssueDate, setSelectedIssueDate] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<"dibbs" | "sam">("dibbs");
  const [results, setResults] = useState<BidMatchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfiles, setHasProfiles] = useState<boolean | null>(null);
  const [hardOnly, setHardOnly] = useState(false);
  // Debounced reason filter — pushes to `appliedReason` after typing pauses
  // so we don't refetch on every keystroke.
  const [reasonInput, setReasonInput] = useState("");
  const [appliedReason, setAppliedReason] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setAppliedReason(reasonInput.trim()), 300);
    return () => clearTimeout(t);
  }, [reasonInput]);

  useEffect(() => {
    // Reset to page 1 whenever the filters change so we don't land on
    // an empty out-of-range page after narrowing results.
    setPage(1);
  }, [hardOnly, appliedReason]);

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
      reason: string,
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
        if (reason) params.set("reason_search", reason);
        const res = await fetch(`/api/bid-matching/results?${params}`);
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
    },
    [],
  );

  useEffect(() => {
    if (!selectedRunDate) return;
    if (selectedSource === "dibbs" && !selectedIssueDate) return;
    fetchResults(selectedSource, selectedRunDate, selectedIssueDate, page, hardOnly, appliedReason);
  }, [selectedSource, selectedRunDate, selectedIssueDate, page, hardOnly, appliedReason, fetchResults]);

  const handleDateSelect = (selection: DateSelection) => {
    setSelectedRunDate(selection.runDate);
    setSelectedSource(selection.source);
    setSelectedIssueDate(selection.source === "dibbs" ? selection.issueDate : null);
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bid-Matching</h1>
          <p className="mt-1 text-muted-foreground">
            Solicitations matched to your bid-matching profiles.
          </p>
        </div>
        <Link
          href="/account/bidmatching"
          className="flex-shrink-0 inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          Manage profiles →
        </Link>
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
      ) : dateTree.length === 0 ? (
        /* Empty state — branch on whether the user has any profile yet so the
           CTA points to the right next step (set one up vs. wait for the engine). */
        <div className="text-center py-16 bg-card-bg rounded-lg border border-border">
          <svg className="mx-auto h-16 w-16 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {hasProfiles === false ? (
            <>
              <h2 className="mt-4 text-lg font-semibold text-foreground">No bid-matching profile yet</h2>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
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
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
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
        /* Two-column layout: date panel + results */
        <div className="flex gap-6 items-start">
          {/* Date panel */}
          <div className="w-72 flex-shrink-0 bg-card-bg rounded-lg border border-border overflow-hidden">
            <BidMatchDatePanel
              dateTree={dateTree}
              selectedRunDate={selectedRunDate}
              selectedIssueDate={selectedIssueDate}
              selectedSource={selectedSource}
              onSelect={handleDateSelect}
            />
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0 bg-card-bg rounded-lg border border-border p-4">
            {selectedRunDate && (selectedSource === "sam" || selectedIssueDate) ? (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-border">
                  <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hardOnly}
                      onChange={(e) => setHardOnly(e.target.checked)}
                      className="rounded border-border"
                    />
                    Hard hits only
                  </label>
                  <div className="flex-1 min-w-[200px] max-w-md">
                    <input
                      type="text"
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      placeholder="Search match reason…"
                      className="w-full text-sm border border-border bg-card-bg text-foreground rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  {(hardOnly || appliedReason) && (
                    <button
                      type="button"
                      onClick={() => { setHardOnly(false); setReasonInput(""); setAppliedReason(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <BidMatchResultsTable
                  results={results}
                  isLoading={isLoadingResults}
                  total={total}
                  page={page}
                  pageSize={PAGE_SIZE}
                  onPageChange={handlePageChange}
                />
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Select a date from the panel to view results.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
