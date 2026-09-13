"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabPanel, type Tab } from "@/components/ui/Tabs";
import {
  KPICard,
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
} from "@/components/analytics";
import { DemoSurface } from "@/components/products/DemoSurface";
import type { DemoAnalyticsData } from "@/lib/demo/analytics";

/**
 * The clickable /analytics mock-up on /products/analytics.
 *
 * These are the real dashboard widgets — every card, chart and table the
 * add-on renders — laid out exactly as /analytics lays them out, fed from a
 * static fixture instead of the five analytics endpoints. The page's loading
 * skeletons, error banners and URL-driven tab state are the only things not
 * reproduced: a fixture never loads and never fails, and a marketing page
 * should not rewrite its own query string.
 *
 * The tours do the work. A dashboard of twenty widgets is not self-explaining
 * to someone who has never had one, so each chip switches to the right tab
 * and walks the visitor to the one widget that answers a question they came
 * with.
 */

type TabId = "act-now" | "opportunities" | "competitive" | "bid-matching" | "market-pulse";

const TABS: Tab[] = [
  { id: "act-now", label: "Act Now" },
  { id: "opportunities", label: "Opportunities" },
  { id: "competitive", label: "Competitive Intel" },
  { id: "bid-matching", label: "Bid Matching" },
  { id: "market-pulse", label: "Market Pulse" },
];

interface Tour {
  id: string;
  chip: string;
  caption: string;
  tab: TabId;
  /** data-demo-focus value of the widget to bring into view and ring. */
  focus: string | null;
}

const TOURS: Tour[] = [
  {
    id: "closing",
    chip: "What closes this week",
    caption:
      "Act Now is everything with a clock on it. The response window buckets your open matched solicitations by days left, and the table beneath lists the five closing soonest — the ones you lose by default if nobody looks today.",
    tab: "act-now",
    focus: "upcoming",
  },
  {
    id: "buy",
    chip: "What DLA is about to buy",
    caption:
      "Buy signals are DLA's own replenishment triggers on parts you supply: an item on backorder, or stock below the reorder point. Not a forecast — the government's inventory system saying a purchase is due.",
    tab: "act-now",
    focus: "buy-signals",
  },
  {
    id: "price",
    chip: "Price to win",
    caption:
      "The winning-price benchmark is what actually won on each of your parts in the last twelve months — min, median and max unit price, with the range drawn. The demand tag says whether DLA buys the part repeatedly, which decides whether the price is worth defending.",
    tab: "competitive",
    focus: "winning-price",
  },
  {
    id: "rivals",
    chip: "Who's beating you",
    caption:
      "Every vendor who has won an award on one of your parts in two years, ranked by how much they took. These are real CAGEs and real award values — the same DIBBS history the leaderboard reads in a live account.",
    tab: "competitive",
    focus: "competitors",
  },
  {
    id: "prospect",
    chip: "Parts worth getting qualified on",
    caption:
      "Market prioritization looks outside your catalog: parts in supply classes where you already have award history that DLA is flagging for a near-term buy, ranked by estimated order value. A prospecting list, in order.",
    tab: "opportunities",
    focus: "market-prioritization",
  },
  {
    id: "health",
    chip: "Is matching tuned right?",
    caption:
      "Profile health flags the two ways a bid-matching profile goes wrong: dormant, matching nothing for weeks, or over-broad, matching so much that nobody reads it. Both are a five-minute fix once you can see them.",
    tab: "bid-matching",
    focus: "profile-health",
  },
  {
    id: "market",
    chip: "The whole market",
    caption:
      "Market Pulse is the backdrop, identical for every customer: what is open right now on DIBBS and SAM.gov, how much money moved in the last ninety days, and how the market splits by set-aside. A drop in your own matches means something different in a month when the whole market is down.",
    tab: "market-pulse",
    focus: null,
  },
];

/**
 * A widget the tours can point at. Carries the anchor the tour scrolls to
 * and the ring that marks it once it arrives.
 */
function Focusable({
  id, focused, children, className = "",
}: {
  id: string;
  focused: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-demo-focus={id}
      className={`rounded-xl transition-shadow duration-500 ${
        focused ? "ring-2 ring-primary ring-offset-2 ring-offset-muted-light dark:ring-offset-background" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function AnalyticsDemo({ data }: { data: DemoAnalyticsData }) {
  const { summary, business, bidMatch, market, marketPrioritization } = data;
  const [activeTab, setActiveTab] = useState<TabId>("act-now");
  const [activeTour, setActiveTour] = useState<string | null>(TOURS[0].id);
  const [focus, setFocus] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  // Scroll only in answer to a click. The first tour is active on load, but
  // a page that scrolls itself to a widget the moment it renders is a page
  // that jumps.
  const pendingScroll = useRef(false);

  useEffect(() => {
    if (!pendingScroll.current || !focus) return;
    pendingScroll.current = false;
    const el = container.current?.querySelector<HTMLElement>(`[data-demo-focus="${focus}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus, activeTab]);

  const applyTour = (t: Tour) => {
    setActiveTour(t.id);
    setActiveTab(t.tab);
    setFocus(t.focus);
    pendingScroll.current = t.focus !== null;
  };

  const onTabChange = (id: string) => {
    setActiveTab(id as TabId);
    setActiveTour(null);
    setFocus(null);
  };

  const tour = TOURS.find((t) => t.id === activeTour) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Show me
        </span>
        {TOURS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => applyTour(t)}
            aria-pressed={activeTour === t.id}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTour === t.id
                ? "border-primary bg-primary text-white"
                : "border-border bg-card-bg text-foreground hover:border-primary/40 hover:text-primary"
            }`}
          >
            {t.chip}
          </button>
        ))}
      </div>

      {tour && (
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{tour.caption}</p>
      )}

      {/* Solicitation numbers in these widgets are <button>s that open a
          parts modal backed by a fetch — gated here by selector, since
          DemoSurface's default only catches anchors. */}
      <DemoSurface
        gateSelector='button[title^="View parts matching solicitation"]'
        prompt="Analytics is an add-on on the Advanced plan."
        cta={{ href: "/pricing#add-ons", label: "See pricing →" }}
      >
        <div
          ref={container}
          className="rounded-xl border border-border bg-muted-light/40 p-3 dark:bg-background/40 sm:p-4 lg:p-6"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-foreground">Procurement Analytics</h3>
              <p className="mt-1 text-muted">
                Decision-driving intel to help you win your next bid.
                <span className="ml-1">Scoped to {summary.company_name}.</span>
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-card-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Sample data
            </span>
          </div>

          {/* Pinned: the customer's own headline numbers, on every tab. */}
          <section className="mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KPICard
                label="Historical Contract Value"
                value={formatCurrency(summary.procurement_history_total)}
                subtitle="Lifetime procurement total"
                tooltip="Lifetime total value of contracts awarded to your CAGE. Source: DIBBS procurement history."
              />
              <KPICard
                label="Open Matched Solicitations"
                value={formatNumber(summary.open_solicitations_count)}
                subtitle="Matching your manufactured parts"
                tooltip="Currently open solicitations matching parts you manufacture. Source: DIBBS/SAM, matched to your procurement history."
              />
              <KPICard
                label="Competitors on Your Parts"
                value={formatNumber(summary.competitor_count)}
                subtitle="Distinct vendors on same parts"
                tooltip="Distinct vendors who've also won awards on the same parts as you, last 2 years. Source: DIBBS award history."
              />
            </div>
          </section>

          <Tabs tabs={TABS} activeTab={activeTab} onTabChange={onTabChange} className="mb-6" />

          <TabPanel tabId="act-now" activeTab={activeTab}>
            <ResponseWindowChips data={business.response_window} />
            <Focusable id="upcoming" focused={focus === "upcoming"} className="mt-6">
              <UpcomingSolicitationsTable data={summary.upcoming_solicitations} />
            </Focusable>
            <div className="mt-6">
              <AmendmentAlertsTable data={bidMatch.amendment_alerts} />
            </div>
            <Focusable id="buy-signals" focused={focus === "buy-signals"} className="mt-6">
              <BuySignalsTable data={business.buy_signals} />
            </Focusable>
          </TabPanel>

          <TabPanel tabId="opportunities" activeTab={activeTab}>
            <HotPartsTable data={business.hot_parts} />
            <Focusable id="market-prioritization" focused={focus === "market-prioritization"} className="mt-6">
              <MarketPrioritizationTable data={marketPrioritization.market_prioritization} />
            </Focusable>
          </TabPanel>

          <TabPanel tabId="competitive" activeTab={activeTab}>
            <Focusable id="winning-price" focused={focus === "winning-price"}>
              <WinningPriceBenchmarkTable data={business.winning_price_benchmarks} />
            </Focusable>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Focusable id="competitors" focused={focus === "competitors"}>
                <CompetitorLeaderboard data={business.competitor_leaderboard} />
              </Focusable>
              <SetAsideWinRateTable data={business.set_aside_win_rate} />
            </div>
            <h4 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-wider text-muted">
              Your Track Record
            </h4>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AwardsOverTimeChart data={business.awards_over_time} />
              <BookingsTrendChart data={business.bookings_trend} />
            </div>
            <div className="mt-6">
              <TopAwardedPartsChart data={business.top_awarded_parts} />
            </div>
          </TabPanel>

          <TabPanel tabId="bid-matching" activeTab={activeTab}>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KPICard
                label="Active Profiles"
                value={formatNumber(bidMatch.active_profiles_count)}
                subtitle="Running bid-match profiles"
                tooltip="Bid-match search profiles you're currently running. Source: your bid-matching profiles."
              />
              <KPICard
                label="Total Matches"
                value={formatNumber(bidMatch.total_matches)}
                subtitle="Lifetime matched solicitations"
                href="/bidmatching"
                tooltip="Lifetime solicitations matched across all your profiles. Source: your bid-matching results."
              />
              <KPICard
                label="Latest Run Matches"
                value={formatNumber(bidMatch.latest_run_matches)}
                subtitle="Most recent matching run"
                href="/bidmatching"
                tooltip="Matches found in the most recent scheduled run. Source: your bid-matching results."
              />
            </div>
            <Focusable id="profile-health" focused={focus === "profile-health"} className="mb-6">
              <ProfileHealthTable data={bidMatch.profile_health} />
            </Focusable>
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TimeToCloseChips data={bidMatch.time_to_close} />
              <ConditionTypeChart data={bidMatch.condition_type_distribution} />
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <MatchTrendChart data={bidMatch.match_trend} />
              <MatchStrengthChart data={bidMatch.match_strength_split} />
            </div>
            <RecentMatchesTable data={bidMatch.recent_matches} />
          </TabPanel>

          <TabPanel tabId="market-pulse" activeTab={activeTab}>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KPICard
                label="DIBBS Open Solicitations"
                value={formatNumber(market.dibbs_open_solicitations_count)}
                source="Source: DIBBS"
                tooltip="Solicitations currently open across DIBBS, DLA's parts-buying system. Source: DIBBS, live count."
              />
              <KPICard
                label="SAM.gov DoD Open Solicitations"
                value={formatNumber(market.sam_dod_open_solicitations_count)}
                source="Source: SAM.gov"
                tooltip="Open Department of Defense opportunities posted on SAM.gov (agency code DLA). Source: SAM.gov, refreshed every 5 minutes."
              />
              <KPICard
                label="Recent DIBBS Awards (90d)"
                value={formatCurrency(market.dibbs_recent_awards_total)}
                source="Source: DIBBS"
                tooltip="Total dollar value of DIBBS contract awards market-wide in the last 90 days — not specific to you. Source: DIBBS award data."
              />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SetAsideMarketTable data={market.set_aside_market} />
              <OpportunitiesTrendChart data={market.sam_opportunities_trend} />
            </div>
          </TabPanel>
        </div>
      </DemoSurface>

      <p className="text-xs text-muted">
        NSNs, descriptions, winning prices and the competitor CAGEs and award
        values are real, public DIBBS award history for these parts. The
        supplier, its awards and its profiles are fictional, and the
        market-wide counts are illustrative — in an account, all of it would
        be yours and live.
      </p>
    </div>
  );
}
