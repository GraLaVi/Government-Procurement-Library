"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ANALYTICS_PRODUCT_KEY, hasAnalyticsAccess } from "@/lib/analytics/tier";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { useMarketAnalytics, useMyBusinessAnalytics, useBidMatchAnalytics, useMarketPrioritization } from '@/lib/hooks/useAnalytics';
import {
  KPICard,
  KPICardSkeleton,
  ChartSkeleton,
  OpportunitiesTrendChart,
  SetAsideMarketTable,
  BookingsTrendChart,
  AwardsOverTimeChart,
  TopAwardedPartsChart,
  UpcomingSolicitationsTable,
  MatchTrendChart,
  ConditionTypeChart,
  RecentMatchesTable,
  WinningPriceBenchmarkTable,
  CompetitorLeaderboard,
  SetAsideWinRateTable,
  HotPartsTable,
  ResponseWindowChips,
  MatchStrengthChart,
  AmendmentAlertsTable,
  ProfileHealthTable,
  TimeToCloseChips,
  BuySignalsTable,
  MarketPrioritizationTable,
  formatCurrency,
  formatNumber,
} from '@/components/analytics';

export default function AnalyticsPage() {
  const { hasProductAccess, hasAnyProductAccess } = useAuth();
  // Resolved client-side from the product list useAuth() already loaded
  // before this page rendered — no network call, and no doomed-to-403
  // requests fired against the add-on-gated analytics endpoints for users
  // who can't use them.
  const canUseAnalytics = hasAnalyticsAccess(hasProductAccess, hasAnyProductAccess);

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Procurement Analytics</h1>
        <p className="text-muted mt-1">
          Decision-driving intel to help you win your next bid.
        </p>
      </div>

      {canUseAnalytics ? <FullAnalytics /> : <AnalyticsUpsell />}
    </>
  );
}

// Non-holders get the shared add-on upsell — the same surface every RFQ
// sender page uses for customers without that add-on.
function AnalyticsUpsell() {
  return (
    <AccessDeniedPage
      featureName="Procurement Analytics"
      featureKey={ANALYTICS_PRODUCT_KEY}
      description="Competitive intel, opportunity targeting, and bid-readiness alerts across your whole business — plus DLA demand and stock signals on every part you supply. Available as an add-on on the Advanced plan."
      benefits={[
        "Your procurement history, win rate, and competitor leaderboard",
        "Market prioritization — parts worth getting qualified on",
        "DLA demand forecasts and stock levels on every part",
        "Buy-signal alerts when your parts go on backorder",
      ]}
    />
  );
}

function FullAnalytics() {
  const market = useMarketAnalytics();
  const business = useMyBusinessAnalytics();
  const bidMatch = useBidMatchAnalytics();
  const marketPrioritization = useMarketPrioritization();

  const showResponseWindow = business.isLoading || !!business.data;
  const showMatchStrength = bidMatch.isLoading || !!bidMatch.data;
  const soloResponseWindow = showResponseWindow && !showMatchStrength;
  const soloMatchStrength = showMatchStrength && !showResponseWindow;

  return (
    <>
      {/* ================================================================ */}
      {/* Section 1: Market Pulse                                          */}
      {/* ================================================================ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Market Pulse</h2>

        {market.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}
          </div>
        ) : market.error ? (
          <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6 text-error text-sm">
            Failed to load market data: {market.error}
          </div>
        ) : market.data ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <KPICard
              label="DIBBS Open Solicitations"
              value={formatNumber(market.data.dibbs_open_solicitations_count)}
              source="Source: DIBBS"
              tooltip="Solicitations currently open across DIBBS, DLA's parts-buying system. Source: DIBBS, live count."
            />
            <KPICard
              label="SAM.gov DoD Open Solicitations"
              value={formatNumber(market.data.sam_dod_open_solicitations_count)}
              source="Source: SAM.gov"
              tooltip="Open Department of Defense opportunities posted on SAM.gov (agency code DLA). Source: SAM.gov, refreshed every 5 minutes."
            />
            <KPICard
              label="Recent DIBBS Awards (90d)"
              value={formatCurrency(market.data.dibbs_recent_awards_total)}
              source="Source: DIBBS"
              tooltip="Total dollar value of DIBBS contract awards market-wide in the last 90 days — not specific to you. Source: DIBBS award data."
            />
          </div>
        ) : null}

        {/* Set-Aside compact table + SAM trend (demoted from hero) */}
        {market.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : market.data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SetAsideMarketTable data={market.data.set_aside_market} />
            <OpportunitiesTrendChart data={market.data.sam_opportunities_trend} />
          </div>
        ) : null}
      </section>

      {/* ================================================================ */}
      {/* Section 2: Act Now (urgency + match-quality alerts)              */}
      {/* ================================================================ */}
      {(business.isLoading || business.data || !bidMatch.forbidden) && (
        <section id="buy-signals" className="mb-10 scroll-mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Act Now</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Window (E) — from /my-business */}
            {business.isLoading ? (
              <div className={soloResponseWindow ? "lg:col-span-2" : undefined}>
                <ChartSkeleton height="h-32" />
              </div>
            ) : business.data ? (
              <div className={soloResponseWindow ? "lg:col-span-2" : undefined}>
                <ResponseWindowChips data={business.data.response_window} />
              </div>
            ) : null}

            {/* Match Strength split (F) — bid-matching only */}
            {bidMatch.isLoading ? (
              <div className={soloMatchStrength ? "lg:col-span-2" : undefined}>
                <ChartSkeleton height="h-32" />
              </div>
            ) : bidMatch.data ? (
              <div className={soloMatchStrength ? "lg:col-span-2" : undefined}>
                <MatchStrengthChart data={bidMatch.data.match_strength_split} />
              </div>
            ) : null}
          </div>

          {/* Amendment Alerts (G) — bid-matching only, full-width */}
          {bidMatch.data && (
            <div className="mt-6">
              <AmendmentAlertsTable data={bidMatch.data.amendment_alerts} />
            </div>
          )}

          {/* Buy Signals — parts you supply that DLA is flagging for a
              near-term buy. Also the destination the bell's "buy is coming"
              alert links to. */}
          {business.isLoading ? (
            <div className="mt-6"><ChartSkeleton height="h-48" /></div>
          ) : business.data ? (
            <div className="mt-6">
              <BuySignalsTable data={business.data.buy_signals} />
            </div>
          ) : null}
        </section>
      )}

      {/* ================================================================ */}
      {/* Section 3: Competitive Intel                                     */}
      {/* ================================================================ */}
      <section id="your-business" className="mb-10 scroll-mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Competitive Intel
          {business.data?.company_name && (
            <span className="text-muted font-normal text-base ml-2">
              ({business.data.company_name})
            </span>
          )}
        </h2>

        {/* KPI strip */}
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
              tooltip="Lifetime total value of contracts awarded to your CAGE. Source: DIBBS procurement history."
            />
            <KPICard
              label="Open Matched Solicitations"
              value={formatNumber(business.data.open_solicitations_count)}
              subtitle="Matching your manufactured parts"
              tooltip="Currently open solicitations matching parts you manufacture. Source: DIBBS/SAM, matched to your procurement history."
            />
            <KPICard
              label="Competitors on Your Parts"
              value={formatNumber(business.data.competitor_count)}
              subtitle="Distinct vendors on same parts"
              tooltip="Distinct vendors who've also won awards on the same parts as you, last 2 years. Source: DIBBS award history."
            />
          </div>
        ) : null}

        {/* Hero: Winning Price Benchmark (A) */}
        {business.isLoading ? (
          <div className="mb-6"><ChartSkeleton height="h-64" /></div>
        ) : business.data ? (
          <div className="mb-6">
            <WinningPriceBenchmarkTable data={business.data.winning_price_benchmarks} />
          </div>
        ) : null}

        {/* Competitor Leaderboard (B) + Set-Aside Win Rate (C) */}
        {business.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : business.data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompetitorLeaderboard data={business.data.competitor_leaderboard} />
            <SetAsideWinRateTable data={business.data.set_aside_win_rate} />
          </div>
        ) : null}
      </section>

      {/* ================================================================ */}
      {/* Section 4: Opportunity Targeting                                 */}
      {/* ================================================================ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Opportunity Targeting</h2>

        {/* Hot Parts (D) */}
        {business.isLoading ? (
          <div className="mb-6"><ChartSkeleton height="h-64" /></div>
        ) : business.data ? (
          <div className="mb-6">
            <HotPartsTable data={business.data.hot_parts} />
          </div>
        ) : null}

        {/* Bookings + Awards Over Time */}
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
          <div className="mb-6"><ChartSkeleton height="h-48" /></div>
        ) : business.data ? (
          <div className="mb-6">
            <UpcomingSolicitationsTable data={business.data.upcoming_solicitations} />
          </div>
        ) : null}

        {/* Market Prioritization — prospecting parts outside the customer's
            catalog, ranked by DLA buy-imminence x estimated value. */}
        {marketPrioritization.isLoading ? (
          <ChartSkeleton height="h-48" />
        ) : marketPrioritization.data ? (
          <MarketPrioritizationTable data={marketPrioritization.data.market_prioritization} />
        ) : null}
      </section>

      {/* ================================================================ */}
      {/* Section 5: Bid-Matching Health (only if entitled)                */}
      {/* ================================================================ */}
      {!bidMatch.forbidden && (bidMatch.isLoading || bidMatch.data || bidMatch.error) && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">Bid-Matching Health</h2>

          {/* KPI Cards */}
          {bidMatch.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}
            </div>
          ) : bidMatch.error ? (
            <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6 text-error text-sm">
              Failed to load bid-matching data: {bidMatch.error}
            </div>
          ) : bidMatch.data ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <KPICard
                  label="Active Profiles"
                  value={formatNumber(bidMatch.data.active_profiles_count)}
                  subtitle="Running bid-match profiles"
                  tooltip="Bid-match search profiles you're currently running. Source: your ALAN bid-matching profiles."
                />
                <KPICard
                  label="Total Matches"
                  value={formatNumber(bidMatch.data.total_matches)}
                  subtitle="Lifetime matched solicitations"
                  href="/bidmatching"
                  tooltip="Lifetime solicitations matched across all your profiles. Source: your bid-matching results."
                />
                <KPICard
                  label="Latest Run Matches"
                  value={formatNumber(bidMatch.data.latest_run_matches)}
                  subtitle="Most recent matching run"
                  href="/bidmatching"
                  tooltip="Matches found in the most recent scheduled run. Source: your bid-matching results."
                />
              </div>

              {/* Profile Health (H) + Time-to-Close (I) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <ProfileHealthTable data={bidMatch.data.profile_health} />
                <TimeToCloseChips data={bidMatch.data.time_to_close} />
              </div>

              {/* Existing charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <MatchTrendChart data={bidMatch.data.match_trend} />
                <ConditionTypeChart data={bidMatch.data.condition_type_distribution} />
              </div>

              {/* Recent Matches Table */}
              <RecentMatchesTable data={bidMatch.data.recent_matches} />
            </>
          ) : null}
        </section>
      )}
    </>
  );
}
