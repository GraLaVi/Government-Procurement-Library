"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_ENTERPRISE_PRODUCT_KEY } from "@/lib/rfq/tier";
import { TableCard } from "@/components/rfq/TableCard";

interface BuyerCoverageRow {
  user_id: number;
  name: string;
  derived_unclaimed: number;
  unworked: number;
  rfq_sent: number;
  quotes_in: number;
  priced: number;
  bid: number;
  no_bid: number;
  passed: number;
  total: number;
}

interface CoverageSummary {
  total_open: number;
  closing_soon_days: number;
  closing_soon_unworked: number;
  awaiting_quotes_past_due: number;
  unassigned_count: number;
  unassigned_soon_days: number;
  unassigned_closing_soon: number;
  by_buyer: BuyerCoverageRow[];
}

function StatTile({
  label, value, sub, urgent, href,
}: { label: string; value: number; sub?: string; urgent?: boolean; href?: string }) {
  const inner = (
    <div className={`rounded-xl border p-5 h-full ${urgent && value > 0 ? "border-error/40 bg-error/5" : "border-border bg-card-bg"}`}>
      <div className={`text-3xl font-bold ${urgent && value > 0 ? "text-error" : "text-foreground"}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-sm font-medium text-card-foreground mt-1">{label}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{inner}</Link> : inner;
}

/**
 * Coverage / aging for the Send RFQs queue (Enterprise §5) — the manager's
 * "what is falling through" view.
 */
export default function RfqCoveragePage() {
  const { isLoading: authLoading, hasAnyProductAccess } = useAuth();
  const hasEnterprise = hasAnyProductAccess([RFQ_ENTERPRISE_PRODUCT_KEY]);

  const [data, setData] = useState<CoverageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !hasEnterprise) return;
    (async () => {
      try {
        const res = await fetch("/api/rfq/coverage");
        const body = await res.json();
        if (!res.ok) setError(body.error || "Failed to load coverage.");
        else setData(body as CoverageSummary);
      } catch {
        setError("Network error loading coverage.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, hasEnterprise]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasEnterprise) {
    return (
      <AccessDeniedPage
        featureName="RFQ Coverage"
        featureKey="request_for_quote_enterprise"
        description="Coverage and aging reporting requires the RFQ Enterprise Add-on."
        benefits={[
          "See solicitations closing soon that nobody has worked",
          "Catch vendor quotes that are overdue",
          "Balance workload across your buyers",
        ]}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Coverage</h1>
        <p className="text-muted mt-1 text-sm">
          What&apos;s falling through across the{" "}
          <Link href="/rfq/worklist" className="text-primary hover:underline">Send RFQs</Link> queue.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/5 px-4 py-2.5 text-sm text-error">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              label="Closing soon, unworked"
              value={data.closing_soon_unworked}
              sub={`Close within ${data.closing_soon_days} days, no RFQ sent`}
              urgent
              href="/rfq/worklist?scope=all"
            />
            <StatTile
              label="Quotes overdue"
              value={data.awaiting_quotes_past_due}
              sub="RFQ sent, vendor response window passed"
              urgent
            />
            <StatTile
              label="Unassigned pool"
              value={data.unassigned_count}
              sub={`${data.unassigned_closing_soon} close within ${data.unassigned_soon_days} days`}
              href="/rfq/worklist?scope=unassigned"
            />
            <StatTile
              label="Open matched solicitations"
              value={data.total_open}
              sub="Everything currently actionable"
              href="/rfq/worklist?scope=all"
            />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">By buyer</h2>
            {data.by_buyer.length === 0 ? (
              <p className="text-sm text-muted">
                No assignments yet — set up CAGE ownership under{" "}
                <Link href="/account/rfq-assignments" className="text-primary hover:underline">
                  RFQ Buyer Assignments
                </Link>.
              </p>
            ) : (
              <TableCard className="overflow-x-auto !p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-primary/10 text-left text-[10px] font-semibold text-muted uppercase tracking-wide">
                      <th className="px-3 py-2">Buyer</th>
                      <th className="px-3 py-2 text-right" title="Unclaimed solicitations deriving to this buyer via CAGE ownership">In queue (derived)</th>
                      <th className="px-3 py-2 text-right">Unworked</th>
                      <th className="px-3 py-2 text-right">RFQ sent</th>
                      <th className="px-3 py-2 text-right">Quotes in</th>
                      <th className="px-3 py-2 text-right">Priced</th>
                      <th className="px-3 py-2 text-right">Bid</th>
                      <th className="px-3 py-2 text-right">No bid</th>
                      <th className="px-3 py-2 text-right">Passed</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.by_buyer.map((b) => (
                      <tr key={b.user_id}>
                        <td className="px-3 py-2 text-card-foreground">{b.name}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{b.derived_unclaimed}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{b.unworked}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{b.rfq_sent}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{b.quotes_in}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{b.priced}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{b.bid}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{b.no_bid}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{b.passed}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">{b.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
