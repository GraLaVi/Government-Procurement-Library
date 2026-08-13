"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_SENDER_KEYS } from "@/lib/rfq/tier";
import { RowBadge } from "@/components/library/RowBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import { TableCard } from "@/components/rfq/TableCard";
import { rfqStatusLabel, rfqStatusTone, type RfqListItem, type RfqContributor } from "@/lib/rfq/types";
import { formatDateMmDdYyyy } from "@/lib/dates";

const ALL = "all";
const FILTER_KEY = "rfq_filter_user";

export default function RfqListPage() {
  const { isLoading: authLoading, hasAnyProductAccess, user } = useAuth();
  const [rfqs, setRfqs] = useState<RfqListItem[] | null>(null);
  const [contributors, setContributors] = useState<RfqContributor[]>([]);
  const [filterUser, setFilterUser] = useState<string>(ALL);
  const [filterInitialized, setFilterInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the last-used filter (defaulting to Everyone) before the first
  // fetch. Waiting for auth + doing this once means only one fetch fires, with
  // the resolved filter — no flicker where records flash then get replaced.
  useEffect(() => {
    if (filterInitialized || authLoading) return;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(FILTER_KEY) : null;
    setFilterUser(saved || ALL);
    setFilterInitialized(true);
  }, [authLoading, filterInitialized]);

  // Persist the filter so the choice sticks across reloads/navigation.
  useEffect(() => {
    if (!filterInitialized || typeof window === "undefined") return;
    window.localStorage.setItem(FILTER_KEY, filterUser);
  }, [filterUser, filterInitialized]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filterUser !== ALL ? `?created_by_user_id=${filterUser}` : "";
      const [res, contribRes] = await Promise.all([
        fetch(`/api/rfq${qs}`),
        fetch("/api/rfq/contributors"),
      ]);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load RFQs.");
        setRfqs([]);
      } else {
        setRfqs(data as RfqListItem[]);
      }
      if (contribRes.ok) setContributors((await contribRes.json()) as RfqContributor[]);
    } catch {
      setError("Network error loading RFQs.");
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  }, [filterUser]);

  useEffect(() => {
    if (filterInitialized && hasAnyProductAccess(RFQ_SENDER_KEYS)) {
      load();
    }
  }, [filterInitialized, hasAnyProductAccess, load]);

  if (authLoading) {
    return <div className="p-6 text-sm text-muted">Loading…</div>;
  }

  if (!hasAnyProductAccess(RFQ_SENDER_KEYS)) {
    return (
      <AccessDeniedPage
        featureName="Request for Quotes"
        featureKey="request_for_quote"
        description="Send structured RFQs to vendors directly from parts search and track every quote in one place."
        benefits={[
          "Send RFQs to vendors from the parts Manufacturers tab",
          "Collect structured quotes (unit price, lead time, alternates)",
          "Track sent, viewed, responded, and stale requests",
          "Keep a private vendor contact book",
        ]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My RFQs</h1>
          <p className="text-muted mt-1 text-sm">
            Requests for quote you&apos;ve sent to vendors. Start one from the Manufacturers tab of a part.
          </p>
        </div>
        <div className="flex items-center gap-4 whitespace-nowrap">
          <Link href="/rfq/batch" className="text-xs text-primary hover:underline">
            View batch →
          </Link>
          <Link href="/rfq/settings" className="text-xs text-primary hover:underline">
            Settings
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
          <button onClick={load} className="ml-3 underline">Retry</button>
        </div>
      )}

      <TableCard
        header={
          <>
            <label className="text-xs text-muted">Created by</label>
            <select
              className="px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value={ALL}>Everyone</option>
              {contributors.map((c) => (
                <option key={c.user_id} value={String(c.user_id)}>
                  {c.name}{user?.id === c.user_id ? " (me)" : ""} ({c.rfq_count})
                </option>
              ))}
            </select>
          </>
        }
      >
      {loading ? (
        <div className="text-sm text-muted">Loading RFQs…</div>
      ) : rfqs && rfqs.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted">
            No RFQs yet. Open a part&apos;s <span className="font-medium">Manufacturers</span> tab, select vendors, and click <span className="font-medium">Create RFQ</span>.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-card-bg/60 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">RFQ</th>
                <th className="px-3 py-2 text-left font-medium">Vendor</th>
                <th className="px-3 py-2 text-left font-medium">Created by</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Responses</th>
                <th className="px-3 py-2 text-left font-medium">Due</th>
                <th className="px-3 py-2 text-left font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              {rfqs?.map((rfq) => (
                <tr key={rfq.id} className="border-t border-border hover:bg-card-bg/40">
                  <td className="px-4 py-2">
                    {/* Titles can be very long (vendor name + part). Cap the
                        column and show the full value on hover; short titles
                        skip the tooltip so row hover stays quiet. */}
                    {rfq.title.length > 40 ? (
                      <Tooltip content={rfq.title}>
                        <Link
                          href={`/rfq/${rfq.id}`}
                          className="block max-w-[20rem] truncate text-primary hover:underline font-medium"
                        >
                          {rfq.title}
                        </Link>
                      </Tooltip>
                    ) : (
                      <Link href={`/rfq/${rfq.id}`} className="text-primary hover:underline font-medium">
                        {rfq.title}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {rfq.primary_vendor_name || rfq.primary_cage_code || "—"}
                  </td>
                  <td className="px-4 py-2 text-muted">{rfq.created_by_name || "—"}</td>
                  <td className="px-4 py-2">
                    <RowBadge tone={rfqStatusTone(rfq.aggregate_status)}>
                      {rfqStatusLabel(rfq.aggregate_status)}
                    </RowBadge>
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {rfq.response_count}/{rfq.recipient_count}
                  </td>
                  <td className="px-4 py-2 text-muted">{formatDateMmDdYyyy(rfq.response_due_date)}</td>
                  <td className="px-4 py-2 text-muted">{formatDateMmDdYyyy(rfq.sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </TableCard>
    </div>
  );
}
