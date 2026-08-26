"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ANALYTICS_PRODUCT_KEY, hasAnalyticsAccess } from "@/lib/analytics/tier";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { Tabs, TabPanel, type Tab } from "@/components/ui/Tabs";
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

type TabId = "act-now" | "opportunities" | "competitive" | "bid-matching" | "market-pulse";

const TAB_IDS: readonly TabId[] = ["act-now", "opportunities", "competitive", "bid-matching", "market-pulse"];
const DEFAULT_TAB: TabId = "act-now";

// In-page anchors that predate the tabs. The bell's "buy is coming" alert
// links to /analytics#buy-signals (customer_notifications/service.py), and
// that link is out of this repo's control — so the hash has to be able to
// open whichever tab now holds the widget, or the alert lands on the default
// view with a dead anchor.
const ANCHOR_TABS: Record<string, TabId> = {
  "buy-signals": "act-now",
  "your-business": "competitive",
};

function isTabId(value: string | null): value is TabId {
  return !!value && (TAB_IDS as readonly string[]).includes(value);
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading…</div>}>
      <AnalyticsPageContent />
    </Suspense>
  );
}

function AnalyticsPageContent() {
  const { hasProductAccess, hasAnyProductAccess } = useAuth();
  // Resolved client-side from the product list useAuth() already loaded
  // before this page rendered — no network call, and no doomed-to-403
  // requests fired against the add-on-gated analytics endpoints for users
  // who can't use them.
  const canUseAnalytics = hasAnalyticsAccess(hasProductAccess, hasAnyProductAccess);

  return canUseAnalytics ? <FullAnalytics /> : (
    <>
      <PageHeader />
      <AnalyticsUpsell />
    </>
  );
}

function PageHeader({ companyName }: { companyName?: string | null }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground">Procurement Analytics</h1>
      <p className="text-muted mt-1">
        Decision-driving intel to help you win your next bid.
        {companyName && <span className="ml-1">Scoped to {companyName}.</span>}
      </p>
    </div>
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const market = useMarketAnalytics();
  const business = useMyBusinessAnalytics();
  const bidMatch = useBidMatchAnalytics();
  const marketPrioritization = useMarketPrioritization();

  const showBidMatching = !bidMatch.forbidden;

  // The URL is the only source of truth for the selection — nothing mirrored
  // in state to drift out of sync, and ?tab= stays linkable and navigable.
  const tabParam = searchParams.get("tab");
  const requestedTab: TabId = isTabId(tabParam) ? tabParam : DEFAULT_TAB;
  // forbidden isn't known until the bid-match request resolves, so a linked
  // ?tab=bid-matching can name a tab that turns out not to be there.
  const activeTab: TabId =
    requestedTab === "bid-matching" && !showBidMatching ? DEFAULT_TAB : requestedTab;

  // Anchor we still owe a scroll to. A ref rather than state: the target
  // widget doesn't exist until its tab is mounted AND its data has landed, so
  // this has to outlive several renders — but clearing it must not cause one.
  const pendingAnchor = useRef<string | null>(null);
  const hashHandled = useRef(false);

  // A hash beats ?tab= — it's the more specific request, and it's what the
  // notification bell sends. replace(), not push(), so Back doesn't drop the
  // user straight back into this redirect.
  useEffect(() => {
    if (hashHandled.current) return;
    hashHandled.current = true;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    pendingAnchor.current = hash;
    const target = ANCHOR_TABS[hash];
    const params = new URLSearchParams(window.location.search);
    if (target && params.get("tab") !== target) {
      params.set("tab", target);
      router.replace(`/analytics?${params.toString()}#${hash}`, { scroll: false });
    }
  }, [router]);

  useEffect(() => {
    const anchor = pendingAnchor.current;
    if (!anchor) return;
    const el = document.getElementById(anchor);
    if (!el) return; // data still loading — retry when the deps below change
    pendingAnchor.current = null;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab, business.data, bidMatch.data]);

  const handleTabChange = useCallback((tabId: string) => {
    if (!isTabId(tabId)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    // push() so Back returns to the previous tab; scroll: false keeps the
    // pinned KPI strip where it is instead of jumping to the top.
    router.push(`/analytics?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const tabs: Tab[] = useMemo(() => {
    const all: Tab[] = [
      { id: "act-now", label: "Act Now" },
      { id: "opportunities", label: "Opportunities" },
      { id: "competitive", label: "Competitive Intel" },
      { id: "bid-matching", label: "Bid Matching" },
      { id: "market-pulse", label: "Market Pulse" },
    ];
    return showBidMatching ? all : all.filter((t) => t.id !== "bid-matching");
  }, [showBidMatching]);

  return (
    <>
      <PageHeader companyName={business.data?.company_name} />

      {/* ================================================================ */}
      {/* Pinned: the customer's own headline numbers.                     */}
      {/* Above the tabs so they read on every tab — these are the         */}
      {/* at-a-glance figures, and they used to sit below the market-wide  */}
      {/* counts that aren't about the customer at all.                    */}
      {/* ================================================================ */}
      <section className="mb-6">
        {business.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}
          </div>
        ) : business.error ? (
          <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-error text-sm">
            Failed to load business data: {business.error}
          </div>
        ) : business.data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </section>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} className="mb-6" />

      {/* ================================================================ */}
      {/* Act Now — everything with a clock on it, ordered by how soon it  */}
      {/* bites: deadline spread, what closes next, what changed under     */}
      {/* you, what DLA is about to buy.                                   */}
      {/* ================================================================ */}
      <TabPanel tabId="act-now" activeTab={activeTab}>
        {business.isLoading ? (
          <ChartSkeleton height="h-32" />
        ) : business.data ? (
          <ResponseWindowChips data={business.data.response_window} />
        ) : null}

        {business.isLoading ? (
          <div className="mt-6"><ChartSkeleton height="h-48" /></div>
        ) : business.data ? (
          <div className="mt-6">
            <UpcomingSolicitationsTable data={business.data.upcoming_solicitations} />
          </div>
        ) : null}

        {/* Amendment Alerts — bid-matching only */}
        {bidMatch.data && (
          <div className="mt-6">
            <AmendmentAlertsTable data={bidMatch.data.amendment_alerts} />
          </div>
        )}

        {/* Buy Signals — parts you supply that DLA is flagging for a
            near-term buy. Also the destination the bell's "buy is coming"
            alert links to; the id here is what ANCHOR_TABS resolves. */}
        {business.isLoading ? (
          <div className="mt-6"><ChartSkeleton height="h-48" /></div>
        ) : business.data ? (
          <div id="buy-signals" className="mt-6 scroll-mt-8">
            <BuySignalsTable data={business.data.buy_signals} />
          </div>
        ) : null}
      </TabPanel>

      {/* ================================================================ */}
      {/* Opportunities — what to pursue, inside the catalog then out.     */}
      {/* ================================================================ */}
      <TabPanel tabId="opportunities" activeTab={activeTab}>
        {business.isLoading ? (
          <ChartSkeleton height="h-64" />
        ) : business.data ? (
          <HotPartsTable data={business.data.hot_parts} />
        ) : null}

        {/* Market Prioritization — prospecting parts outside the customer's
            catalog, ranked by DLA buy-imminence x estimated value. */}
        {marketPrioritization.isLoading ? (
          <div className="mt-6"><ChartSkeleton height="h-48" /></div>
        ) : marketPrioritization.data ? (
          <div className="mt-6">
            <MarketPrioritizationTable data={marketPrioritization.data.market_prioritization} />
          </div>
        ) : null}
      </TabPanel>

      {/* ================================================================ */}
      {/* Competitive Intel — can I win it and at what price, followed by  */}
      {/* the track record that says how I've done so far. The three       */}
      {/* history charts used to sit under "Opportunity Targeting", which  */}
      {/* they aren't: all three look backwards, and bookings_trend is     */}
      {/* filtered by the customer's own CAGE despite its market-sounding  */}
      {/* title.                                                           */}
      {/* ================================================================ */}
      <TabPanel tabId="competitive" activeTab={activeTab}>
        <div id="your-business" className="scroll-mt-8">
          {business.isLoading ? (
            <ChartSkeleton height="h-64" />
          ) : business.data ? (
            <WinningPriceBenchmarkTable data={business.data.winning_price_benchmarks} />
          ) : null}
        </div>

        {business.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : business.data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <CompetitorLeaderboard data={business.data.competitor_leaderboard} />
            <SetAsideWinRateTable data={business.data.set_aside_win_rate} />
          </div>
        ) : null}

        {(business.isLoading || business.data) && (
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mt-10 mb-4">
            Your Track Record
          </h3>
        )}

        {business.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : business.data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AwardsOverTimeChart data={business.data.awards_over_time} />
            <BookingsTrendChart data={business.data.bookings_trend} />
          </div>
        ) : null}

        {business.isLoading ? (
          <div className="mt-6"><ChartSkeleton height="h-48" /></div>
        ) : business.data ? (
          <div className="mt-6">
            <TopAwardedPartsChart data={business.data.top_awarded_parts} />
          </div>
        ) : null}
      </TabPanel>

      {/* ================================================================ */}
      {/* Bid Matching — is the matching tuned right. Match Strength moves */}
      {/* here from "Act Now": it's a 30-day distribution, not an alert,   */}
      {/* and it pairs with Match Trend over the same window.              */}
      {/* ================================================================ */}
      {showBidMatching && (
        <TabPanel tabId="bid-matching" activeTab={activeTab}>
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

              {/* Wide table gets the full row; the two distributions and the
                  two 30-day daily-count charts pair off below it. */}
              <div className="mb-6">
                <ProfileHealthTable data={bidMatch.data.profile_health} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <TimeToCloseChips data={bidMatch.data.time_to_close} />
                <ConditionTypeChart data={bidMatch.data.condition_type_distribution} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <MatchTrendChart data={bidMatch.data.match_trend} />
                <MatchStrengthChart data={bidMatch.data.match_strength_split} />
              </div>

              <RecentMatchesTable data={bidMatch.data.recent_matches} />
            </>
          ) : null}
        </TabPanel>
      )}

      {/* ================================================================ */}
      {/* Market Pulse — market-wide context, none of it specific to the   */}
      {/* customer. Last tab by design: useful, but not what anyone opens  */}
      {/* the page to find out.                                            */}
      {/* ================================================================ */}
      <TabPanel tabId="market-pulse" activeTab={activeTab}>
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
      </TabPanel>
    </>
  );
}
