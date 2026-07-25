import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

// ============================================================================
// Types
// ============================================================================

export interface MonthCount {
  month: string;
  count: number;
}

export interface MonthValue {
  month: string;
  total_value: number;
  count: number;
}

export interface PartValue {
  niin: string | null;
  fsc: string | null;
  description: string | null;
  total_value: number;
  award_count: number;
}

export interface UpcomingSolicitation {
  solicitation_number: string | null;
  close_date: string | null;
  niin: string | null;
  fsc: string | null;
  description: string | null;
}

export interface BookingMonth {
  month_ending: string | null;
  month_label: string | null;
  dscp_booked: number;
  dscr_booked: number;
  dscc_booked: number;
  other_booked: number;
  month_total: number;
}

export interface SetAsideMarketRow {
  code: string | null;
  description: string | null;
  open_count: number;
  trend_12mo: number[];
  yoy_pct: number | null;
}

export interface MarketOverview {
  dibbs_open_solicitations_count: number;
  dibbs_recent_awards_total: number | null;
  sam_dod_open_solicitations_count: number;
  sam_recent_awards_total: number | null;
  sam_opportunities_trend: MonthCount[];
  set_aside_market: SetAsideMarketRow[];
  generated_at: string;
}

// New widget types — A, B, C, D, E
export interface PartPriceBenchmark {
  part_id: number | null;
  niin: string | null;
  fsc: string | null;
  description: string | null;
  award_count: number;
  min_unit_price: number | null;
  p25_unit_price: number | null;
  median_unit_price: number | null;
  p75_unit_price: number | null;
  max_unit_price: number | null;
  // 'recurring' | 'one_off' | 'unknown' | null — DLA demand-forecast based tag
  demand_type: string | null;
}

export interface CompetitorRow {
  cage_code: string | null;
  company_name: string | null;
  parts_won_count: number;
  total_value: number;
  last_award_date: string | null;
}

export interface SetAsideWinRateRow {
  // Display string — canonical label from code_definitions, or 'No Set-Aside'
  // when set_aside_code is NULL. Backend resolves the label server-side.
  set_aside: string | null;
  set_aside_code?: string | null;
  matched_count: number;
  won_count: number;
  win_rate_pct: number | null;
}

export interface HotPartRow {
  part_id: number | null;
  niin: string | null;
  fsc: string | null;
  description: string | null;
  last_30d_count: number;
  baseline_monthly_avg: number;
  surge: number;
}

export interface ResponseWindowBucket {
  bucket: string;
  label: string;
  count: number;
}

export interface BuySignalRow {
  niin: string;
  fsc: string | null;
  description: string | null;
  // 'on_backorder' | 'below_reorder_point'
  signal_type: string;
  total_stock: number | null;
  reorder_point: number | null;
  backorder_qty: number | null;
  rop_gap: number | null;
  est_buy_value: number | null;
}

export interface CustomerAnalytics {
  cage_code: string;
  company_name: string | null;
  procurement_history_total: number | null;
  open_solicitations_count: number;
  competitor_count: number;
  bookings_trend: BookingMonth[];
  awards_over_time: MonthValue[];
  top_awarded_parts: PartValue[];
  upcoming_solicitations: UpcomingSolicitation[];
  winning_price_benchmarks: PartPriceBenchmark[];
  competitor_leaderboard: CompetitorRow[];
  set_aside_win_rate: SetAsideWinRateRow[];
  hot_parts: HotPartRow[];
  response_window: ResponseWindowBucket[];
  buy_signals: BuySignalRow[];
  generated_at: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useMarketAnalytics() {
  const [data, setData] = useState<MarketOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchWithAuth('/api/library/analytics/market', {
        credentials: 'include',
      });

      if (response.status === 401) {
        setData(null);
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch market analytics');
      }

      const result: MarketOverview = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Failed to fetch market analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    intervalRef.current = setInterval(fetchData, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// Effective library tier returned alongside a 403 from the analytics endpoint.
// "advanced" / "basic" / "free" → render the search-launcher dashboard.
// null                          → no library product at all (subscription
//                                 expired) — render the resubscribe prompt.
export type LibraryTier = "advanced" | "basic" | "free" | null;

export function useMyBusinessAnalytics() {
  const [data, setData] = useState<CustomerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [tier, setTier] = useState<LibraryTier>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchWithAuth('/api/library/analytics/my-business', {
        credentials: 'include',
      });

      if (response.status === 401) {
        setData(null);
        return;
      }

      // 403 = user lacks the Maximum library tier. Body carries `tier` so the
      // dashboard can branch (advanced/basic/free → launcher; null → resubscribe).
      if (response.status === 403) {
        const errData = await response.json().catch(() => ({}));
        setForbidden(true);
        const t = errData.tier;
        setTier(t === "advanced" || t === "basic" || t === "free" ? t : null);
        setData(null);
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch business analytics');
      }

      const result: CustomerAnalytics = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Failed to fetch business analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 1 minute
    intervalRef.current = setInterval(fetchData, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, isLoading, error, forbidden, tier, refetch: fetchData };
}

// ============================================================================
// Market Prioritization — its own lightweight, Maximum-gated endpoint
// ============================================================================

export interface ProspectRow {
  niin: string;
  fsc: string | null;
  description: string | null;
  // 'on_backorder' | 'below_reorder_point' | 'low_coverage'
  signal_type: string;
  forecast_next_12mo: number | null;
  est_value: number | null;
}

export interface MarketPrioritization {
  cage_code: string;
  market_prioritization: ProspectRow[];
  generated_at: string;
}

// Kept off useMyBusinessAnalytics (like useOpenSolicitationsAndCompetitors) —
// a distinct, heavier query. Same Maximum-tier gate/403 shape as /my-business.
export function useMarketPrioritization() {
  const [data, setData] = useState<MarketPrioritization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchWithAuth('/api/library/analytics/my-business/market-prioritization', {
        credentials: 'include',
      });

      if (response.status === 401) {
        setData(null);
        return;
      }

      if (response.status === 403) {
        setForbidden(true);
        setData(null);
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch market prioritization');
      }

      const result: MarketPrioritization = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Failed to fetch market prioritization:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, isLoading, error, forbidden, refetch: fetchData };
}

// ============================================================================
// Dashboard summary — cheap subset of useMyBusinessAnalytics
// ============================================================================

export interface CustomerAnalyticsSummary {
  cage_code: string;
  company_name: string | null;
  procurement_history_total: number | null;
  open_solicitations_count: number;
  competitor_count: number;
  upcoming_solicitations: UpcomingSolicitation[];
  generated_at: string;
}

export function useMyBusinessSummary() {
  const [data, setData] = useState<CustomerAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [tier, setTier] = useState<LibraryTier>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchWithAuth('/api/library/analytics/my-business-summary', {
        credentials: 'include',
      });

      if (response.status === 401) {
        setData(null);
        return;
      }

      if (response.status === 403) {
        const errData = await response.json().catch(() => ({}));
        setForbidden(true);
        const t = errData.tier;
        setTier(t === "advanced" || t === "basic" || t === "free" ? t : null);
        setData(null);
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch business summary');
      }

      const result: CustomerAnalyticsSummary = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Failed to fetch business summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, isLoading, error, forbidden, tier, refetch: fetchData };
}

// ============================================================================
// Upcoming solicitations (parts-based) — available to any library tier
// ============================================================================

// Standalone fetch of just the parts-based "closing soonest" list. Unlike
// useMyBusinessSummary (Maximum-only, 403s advanced/basic/free), this endpoint
// is open to any library tier, so basic/free dashboards can render the table too.
export function useUpcomingSolicitations() {
  const [data, setData] = useState<UpcomingSolicitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchWithAuth('/api/library/analytics/my-business/upcoming-solicitations', {
        credentials: 'include',
      });

      // 401 (unauthenticated) / 403 (no library access) / 404 (no CAGE) → no
      // table, not an error worth surfacing on the dashboard.
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        setData([]);
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch upcoming solicitations');
      }

      const result: UpcomingSolicitation[] = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Failed to fetch upcoming solicitations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ============================================================================
// Open Solicitations + Competitors — Advanced tier and up (not Maximum-only)
// ============================================================================

export interface OpenSolicitationsCompetitors {
  cage_code: string;
  open_solicitations_count: number;
  competitor_count: number;
  generated_at: string;
}

// The two KPI cards Advanced tier had before Maximum split off the full
// analytics bundle. Unlike useMyBusinessSummary (Maximum-only), this hits a
// lightweight endpoint open to Advanced tier and up — same two indexed
// queries, without the other premium widgets.
export function useOpenSolicitationsAndCompetitors() {
  const [data, setData] = useState<OpenSolicitationsCompetitors | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchWithAuth('/api/library/analytics/my-business/open-solicitations-competitors', {
        credentials: 'include',
      });

      // 401 (unauthenticated) / 403 (below Advanced) / 404 (no CAGE) → no
      // cards, not an error worth surfacing on the dashboard.
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        setData(null);
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch open solicitations and competitors');
      }

      const result: OpenSolicitationsCompetitors = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Failed to fetch open solicitations and competitors:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ============================================================================
// Bid-Matching Analytics
// ============================================================================

export interface DayCount {
  day: string;
  count: number;
}

export interface ConditionTypeCount {
  condition_type: string;
  count: number;
}

export interface RecentMatch {
  solicitation_number: string | null;
  close_date: string | null;
  profile_name: string | null;
  condition_types: string[];
  matched_at: string | null;
}

export interface MatchStrengthDay {
  day: string;
  hard: number;
  soft: number;
}

export interface AmendmentAlertRow {
  solicitation_number: string | null;
  close_date: string | null;
  profile_name: string | null;
  matched_at: string | null;
  latest_amendment_at: string | null;
  change_reason: string | null;
}

export interface ProfileHealthRow {
  profile_id: number;
  profile_name: string;
  last_match_date: string | null;
  matches_30d: number;
  status: string;
}

export interface TimeToCloseBucket {
  bucket: string;
  label: string;
  count: number;
}

export interface BidMatchAnalytics {
  active_profiles_count: number;
  total_matches: number;
  latest_run_matches: number;
  match_trend: DayCount[];
  condition_type_distribution: ConditionTypeCount[];
  recent_matches: RecentMatch[];
  upcoming_matches: RecentMatch[];
  match_strength_split: MatchStrengthDay[];
  amendment_alerts: AmendmentAlertRow[];
  profile_health: ProfileHealthRow[];
  time_to_close: TimeToCloseBucket[];
  generated_at: string;
}

export function useBidMatchAnalytics() {
  const [data, setData] = useState<BidMatchAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchWithAuth('/api/library/analytics/bid-matching', {
        credentials: 'include',
      });

      if (response.status === 401) {
        setData(null);
        return;
      }

      // 403 = customer doesn't have bid_matching product — not an error, just hide the section
      if (response.status === 403) {
        setForbidden(true);
        setData(null);
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch bid-matching analytics');
      }

      const result: BidMatchAnalytics = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Failed to fetch bid-matching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, isLoading, error, forbidden, refetch: fetchData };
}
