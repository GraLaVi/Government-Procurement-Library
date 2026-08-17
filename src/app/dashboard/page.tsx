"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { useMyBusinessSummary, useBidMatchAnalytics, useUpcomingSolicitations, useOpenSolicitationsAndCompetitors } from "@/lib/hooks/useAnalytics";
import { resolveLibraryTier, type LibraryTier } from "@/lib/library/tier";
import { hasAnalyticsAccess } from "@/lib/analytics/tier";
import {
  KPICard,
  KPICardSkeleton,
  ChartSkeleton,
  UpcomingSolicitationsTable,
  BidMatchesClosingSoonTable,
  formatCurrency,
  formatNumber,
} from "@/components/analytics";
import { QuickSearchLauncher } from "@/components/dashboard/QuickSearchLauncher";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { PaymentMethodAlert } from "@/components/dashboard/PaymentMethodAlert";
import { SeatCapSuspensionAlert } from "@/components/dashboard/SeatCapSuspensionAlert";
import { RecentSearches } from "@/components/dashboard/RecentSearches";
import { BidMatchingResultsCard } from "@/components/dashboard/BidMatchingResultsCard";

export default function DashboardPage() {
  const { user, hasProductAccess, hasAnyProductAccess } = useAuth();
  // Resolved client-side from the product list useAuth() already loaded
  // before this page rendered — no network call. This decides which branch
  // to mount BEFORE any tier-gated endpoint is hit, so we never fire a
  // doomed-to-403 request against a higher tier's endpoint just to learn
  // what tier the user holds (each branch below fetches only what it can
  // actually use).
  const tier = resolveLibraryTier(hasAnyProductAccess);
  const canUseAnalytics = hasAnalyticsAccess(hasProductAccess, hasAnyProductAccess);

  const userName = user?.first_name || user?.email?.split("@")[0] || "User";

  // Three branches, in priority order:
  //   - tier === null            → no library access (subscription expired) —
  //                                full resubscribe prompt
  //   - analytics add-on seat    → full analytics dashboard. The add-on already
  //                                requires Advanced, so this strictly beats the
  //                                launcher branch below.
  //   - any library tier         → search-launcher dashboard (Free is the
  //                                baseline; Basic adds bid-matching caps;
  //                                Advanced adds full search plus two
  //                                lightweight KPI cards). An Advanced user at
  //                                an org that bought the add-on but didn't
  //                                assign them a seat lands here — seats are
  //                                per-user, so a colleague's access doesn't
  //                                change what they see.
  const showResubscribe = tier === null;
  const showFullAnalytics = tier !== null && canUseAnalytics;
  const showLauncher = tier !== null && !canUseAnalytics;

  return (
    <>
      {/* Welcome strip */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {userName}
        </h1>
        <p className="text-muted mt-1">
          Here&apos;s what&apos;s happening with your government contract opportunities.
        </p>
      </div>

      {showResubscribe && <ResubscribePrompt />}
      {showLauncher && <BasicDashboard tier={tier} />}
      {showFullAnalytics && <FullDashboard />}
    </>
  );
}

function ResubscribePrompt() {
  return (
    <div className="bg-card-bg border border-border rounded-xl p-8 max-w-2xl mx-auto text-center">
      <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-error"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        Your subscription has expired
      </h2>
      <p className="text-muted mb-6">
        Resubscribe to restore access to the Library and your other products.
        Your account data is preserved — picking back up where you left off
        takes one click.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button href="/pricing" variant="primary" size="md">
          View Pricing
        </Button>
        <Button href="/account/billing" variant="outline" size="md">
          Manage Billing
        </Button>
      </div>
    </div>
  );
}

interface BasicDashboardProps {
  tier: LibraryTier;
}

function BasicDashboard({ tier }: BasicDashboardProps) {
  // Parts-based "closing soonest" table — shown to basic + free + advanced
  // via the tier-open endpoint (useMyBusinessSummary needs the add-on).
  const upcoming = useUpcomingSolicitations();

  return (
    <div className="space-y-6">
      <PaymentMethodAlert />
      <SeatCapSuspensionAlert />
      <OnboardingChecklist />
      <QuickSearchLauncher />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <BidMatchingResultsCard />
        {/* Only mounted for Advanced tier, so the lightweight KPI endpoint is
            only ever called by users who can actually use it — Basic/Free
            never fire this request at all. */}
        {tier === "advanced" && <AdvancedKpiCards />}
      </div>
      {upcoming.isLoading ? (
        <ChartSkeleton height="h-48" />
      ) : upcoming.data.length > 0 ? (
        <UpcomingSolicitationsTable data={upcoming.data} />
      ) : null}
      <RecentSearches />
    </div>
  );
}

// Open Solicitations + Competitors — available to Advanced tier via a
// lightweight endpoint that doesn't require the add-on-gated analytics
// bundle. Basic/Free never see these two cards.
function AdvancedKpiCards() {
  const kpis = useOpenSolicitationsAndCompetitors();

  if (kpis.isLoading) {
    return (
      <>
        <KPICardSkeleton />
        <KPICardSkeleton />
      </>
    );
  }
  if (!kpis.data) return null;

  return (
    <>
      <KPICard
        label="Open Solicitations"
        value={formatNumber(kpis.data.open_solicitations_count)}
        subtitle="Matching your manufactured parts"
        tooltip="Based on your Procurement History, items sold by your CAGE, this is the number of open solicitations."
        href={`/library/vendor-search?cage_code=${encodeURIComponent(kpis.data.cage_code)}&tab=solicitations`}
      />
      <KPICard
        label="Competitors on Your Parts"
        value={formatNumber(kpis.data.competitor_count)}
        subtitle="Distinct vendors on the same parts"
      />
    </>
  );
}

function FullDashboard() {
  const business = useMyBusinessSummary();
  // Bid-matching matches closing soon. The endpoint 403s (forbidden) when the
  // customer has no bid_matching product, so the table self-hides for them.
  const bidMatch = useBidMatchAnalytics();

  return (
    <div className="space-y-6">
      <PaymentMethodAlert />
      <SeatCapSuspensionAlert />
      <OnboardingChecklist />
      <QuickSearchLauncher />

      {/* Bid-matching card is always the leftmost cell and owns its own data,
          so it renders independently of the business-summary state. The three
          business KPICards (or their skeletons) fill the remaining cells. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BidMatchingResultsCard />
        {business.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : business.data ? (
          <>
            <KPICard
              label="Open Solicitations"
              value={formatNumber(business.data.open_solicitations_count)}
              subtitle="Matching your manufactured parts"
              tooltip="Based on your Procurement History, items sold by your CAGE, this is the number of open solicitations."
              href={`/library/vendor-search?cage_code=${encodeURIComponent(business.data.cage_code)}&tab=solicitations`}
            />
            <KPICard
              label="Historical Contract Value"
              value={formatCurrency(business.data.procurement_history_total)}
              subtitle="Lifetime procurement total"
            />
            <KPICard
              label="Competitors on Your Parts"
              value={formatNumber(business.data.competitor_count)}
              subtitle="Distinct vendors on the same parts"
            />
          </>
        ) : null}
      </div>

      {business.error ? (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-error text-sm flex items-center justify-between gap-4">
          <span>Failed to load your business data: {business.error}</span>
          <button
            type="button"
            onClick={business.refetch}
            className="underline hover:no-underline shrink-0"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Bid-matching matches closing soon — sits above the parts-based table.
          Advanced tier always qualifies; bid_matching access is gated server-
          side (403 → no data → hidden). */}
      {bidMatch.isLoading ? (
        <ChartSkeleton height="h-48" />
      ) : bidMatch.data && bidMatch.data.upcoming_matches.length > 0 ? (
        <BidMatchesClosingSoonTable data={bidMatch.data.upcoming_matches} />
      ) : null}

      {/* Upcoming solicitations matched to your manufactured parts — below the
          bid-matching table. */}
      {business.isLoading ? (
        <ChartSkeleton height="h-48" />
      ) : business.data && business.data.upcoming_solicitations.length > 0 ? (
        <UpcomingSolicitationsTable data={business.data.upcoming_solicitations} />
      ) : null}

      <RecentSearches />
    </div>
  );
}
