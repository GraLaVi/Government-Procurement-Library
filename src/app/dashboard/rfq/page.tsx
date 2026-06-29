"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { Badge } from "@/components/ui/Badge";
import { rfqStatusLabel, type RfqListItem, type RfqContributor } from "@/lib/rfq/types";
import { formatDateMmDdYyyy } from "@/lib/dates";

const ALL = "all";

function statusVariant(status: string): "default" | "success" | "warning" | "error" {
  switch (status) {
    case "responded": return "success";
    case "viewed": return "warning";
    case "declined":
    case "stale":
    case "cancelled": return "error";
    default: return "default";
  }
}

export default function RfqListPage() {
  const { isLoading: authLoading, hasProductAccess, user } = useAuth();
  const [rfqs, setRfqs] = useState<RfqListItem[] | null>(null);
  const [contributors, setContributors] = useState<RfqContributor[]>([]);
  const [filterUser, setFilterUser] = useState<string>(ALL);
  const [filterInitialized, setFilterInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Default the filter to the current user's own RFQs.
  useEffect(() => {
    if (!filterInitialized && user?.id) {
      setFilterUser(String(user.id));
      setFilterInitialized(true);
    }
  }, [user, filterInitialized]);

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
    if (!authLoading && hasProductAccess("vendor_rfq")) {
      load();
    }
  }, [authLoading, hasProductAccess, load]);

  if (authLoading) {
    return <div className="p-6 text-sm text-muted">Loading…</div>;
  }

  if (!hasProductAccess("vendor_rfq")) {
    return (
      <AccessDeniedPage
        featureName="Request for Quotes"
        featureKey="vendor_rfq"
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
          <Link href="/dashboard/rfq/batch" className="text-xs text-primary hover:underline">
            View batch →
          </Link>
          <Link href="/dashboard/rfq/settings" className="text-xs text-primary hover:underline">
            Settings
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
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
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
          <button onClick={load} className="ml-3 underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted">Loading RFQs…</div>
      ) : rfqs && rfqs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card-bg p-8 text-center">
          <p className="text-sm text-muted">
            No RFQs yet. Open a part&apos;s <span className="font-medium">Manufacturers</span> tab, select vendors, and click <span className="font-medium">Create RFQ</span>.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card-bg/60 text-xs text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">RFQ</th>
                <th className="px-4 py-2 text-left font-medium">Vendor</th>
                <th className="px-4 py-2 text-left font-medium">Created by</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Responses</th>
                <th className="px-4 py-2 text-left font-medium">Due</th>
                <th className="px-4 py-2 text-left font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              {rfqs?.map((rfq) => (
                <tr key={rfq.id} className="border-t border-border hover:bg-card-bg/40">
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/rfq/${rfq.id}`} className="text-primary hover:underline font-medium">
                      {rfq.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {rfq.primary_vendor_name || rfq.primary_cage_code || "—"}
                  </td>
                  <td className="px-4 py-2 text-muted">{rfq.created_by_name || "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant={statusVariant(rfq.aggregate_status)} size="sm">
                      {rfqStatusLabel(rfq.aggregate_status)}
                    </Badge>
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
    </div>
  );
}
