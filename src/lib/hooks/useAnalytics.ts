import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

// ============================================================================
// Types
// ============================================================================

export interface MonthCount {
  month: string;
  count: number;
}

export interface CodeCount {
  code: string | null;
  description: string | null;
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

export interface MarketOverview {
  dibbs_open_solicitations_count: number;
  dibbs_recent_awards_total: number | null;
  sam_dod_open_solicitations_count: number;
  sam_recent_awards_total: number | null;
  sam_opportunities_trend: MonthCount[];
  set_aside_distribution: CodeCount[];
  generated_at: string;
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

export function useMyBusinessAnalytics() {
  const [data, setData] = useState<CustomerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  return { data, isLoading, error, refetch: fetchData };
}
