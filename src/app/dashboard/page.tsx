"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { useMyBusinessSummary, useBidMatchAnalytics, useUpcomingSolicitations } from "@/lib/hooks/useAnalytics";
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
import { RecentSearches } from "@/components/dashboard/RecentSearches";
import { BidMatchingResultsCard } from "@/components/dashboard/BidMatchingResultsCard";

export default function DashboardPage() {
  const { user } = useAuth();
  const business = useMyBusinessSummary();
  // Bid-matching matches closing soon. The endpoint 403s (forbidden) when the
  // customer has no bid_matching product, so the table self-hides for them.
  const bidMatch = useBidMatchAnalytics();

  const userName = user?.first_name || user?.email?.split("@")[0] || "User";

  // Three branches:
  //   - tier === null      → no library access (subscription expired) —
  //                          full resubscribe prompt, no product surface
  //   - forbidden=true and
  //     tier ∈ {basic,free} → search-launcher dashboard (Free is the
  //                          baseline; Basic adds bid-matching caps;
  //                          analytics is gated either way)
  //   - otherwise          → Advanced — analytics dashboard
  const showResubscribe = business.forbidden && business.tier === null;
  const showLauncher = business.forbidden && (business.tier === "basic" || business.tier === "free");
  const showAdvanced = !business.forbidden;

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
      {showLauncher && <BasicDashboard />}
      {showAdvanced && <FullDashboard business={business} bidMatch={bidMatch} />}
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

function BasicDashboard() {
  // Parts-based "closing soonest" table — shown to basic + free via the
  // tier-open endpoint (useMyBusinessSummary 403s these tiers). The bid-
  // matching table is intentionally NOT here; it's Advanced-only.
  const upcoming = useUpcomingSolicitations();

  return (
    <div className="space-y-6">
      <PaymentMethodAlert />
      <OnboardingChecklist />
      <QuickSearchLauncher />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BidMatchingResultsCard />
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

interface FullDashboardProps {
  business: ReturnType<typeof useMyBusinessSummary>;
  bidMatch: ReturnType<typeof useBidMatchAnalytics>;
}

function FullDashboard({ business, bidMatch }: FullDashboardProps) {
  return (
    <div className="space-y-6">
      <PaymentMethodAlert />
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
