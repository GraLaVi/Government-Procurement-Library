"use client";

import { useMarketAnalytics, useMyBusinessAnalytics } from '@/lib/hooks/useAnalytics';
import {
  KPICard,
  KPICardSkeleton,
  ChartSkeleton,
  OpportunitiesTrendChart,
  SetAsideChart,
  BookingsTrendChart,
  AwardsOverTimeChart,
  TopAwardedPartsChart,
  UpcomingSolicitationsTable,
  formatCurrency,
  formatNumber,
} from '@/components/analytics';

export default function AnalyticsPage() {
  const market = useMarketAnalytics();
  const business = useMyBusinessAnalytics();

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Procurement Analytics</h1>
        <p className="text-muted mt-1">
          Market intelligence and your business performance at a glance.
        </p>
      </div>

      {/* ================================================================ */}
      {/* Section 1: Market Overview                                       */}
      {/* ================================================================ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Market Overview</h2>

        {/* KPI Cards */}
        {market.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
          </div>
        ) : market.error ? (
          <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6 text-error text-sm">
            Failed to load market data: {market.error}
          </div>
        ) : market.data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              label="DIBBS Open Solicitations"
              value={formatNumber(market.data.dibbs_open_solicitations_count)}
              source="Source: DIBBS/DLA"
            />
            <KPICard
              label="SAM.gov DoD Open Solicitations"
              value={formatNumber(market.data.sam_dod_open_solicitations_count)}
              source="Source: SAM.gov (DLA)"
            />
            <KPICard
              label="Recent DIBBS Awards (90d)"
              value={formatCurrency(market.data.dibbs_recent_awards_total)}
              source="Source: DIBBS/DLA"
            />
            <KPICard
              label="Recent SAM Awards (90d)"
              value={formatCurrency(market.data.sam_recent_awards_total)}
              source="Source: SAM.gov"
            />
          </div>
        ) : null}

        {/* Charts row */}
        {market.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : market.data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OpportunitiesTrendChart data={market.data.sam_opportunities_trend} />
            <SetAsideChart data={market.data.set_aside_distribution} />
          </div>
        ) : null}
      </section>

      {/* ================================================================ */}
      {/* Section 2: Your Business                                         */}
      {/* ================================================================ */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Your Business
          {business.data?.company_name && (
            <span className="text-muted font-normal text-base ml-2">
              ({business.data.company_name})
            </span>
          )}
        </h2>

        {/* KPI Cards */}
        {business.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}
          </div>
        ) : business.error ? (
          <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6 text-error text-sm">
            Failed to load business data: {business.error}
          </div>
        ) : business.data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <KPICard
              label="Historical Contract Value"
              value={formatCurrency(business.data.procurement_history_total)}
              subtitle="Lifetime procurement total"
            />
            <KPICard
              label="Open Matched Solicitations"
              value={formatNumber(business.data.open_solicitations_count)}
              subtitle="Matching your manufactured parts"
            />
            <KPICard
              label="Competitors on Your Parts"
              value={formatNumber(business.data.competitor_count)}
              subtitle="Distinct vendors on same parts"
            />
          </div>
        ) : null}

        {/* Charts row 1: Bookings + Awards */}
        {business.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : business.data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <BookingsTrendChart data={business.data.bookings_trend} />
            <AwardsOverTimeChart data={business.data.awards_over_time} />
          </div>
        ) : null}

        {/* Top Awarded Parts */}
        {business.isLoading ? (
          <div className="mb-6"><ChartSkeleton height="h-48" /></div>
        ) : business.data ? (
          <div className="mb-6">
            <TopAwardedPartsChart data={business.data.top_awarded_parts} />
          </div>
        ) : null}

        {/* Upcoming Solicitations Table */}
        {business.isLoading ? (
          <ChartSkeleton height="h-48" />
        ) : business.data ? (
          <UpcomingSolicitationsTable data={business.data.upcoming_solicitations} />
        ) : null}
      </section>
    </>
  );
}
