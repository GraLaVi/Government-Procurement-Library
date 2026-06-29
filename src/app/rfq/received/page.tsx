"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/Badge";
import { rfqStatusLabel, type ReceivedRfqItem } from "@/lib/rfq/types";
import { formatDateMmDdYyyy } from "@/lib/dates";

function statusVariant(status: string): "default" | "success" | "warning" | "error" {
  switch (status) {
    case "responded": return "success";
    case "viewed": return "warning";
    case "declined":
    case "stale": return "error";
    default: return "default";
  }
}

export default function RfqReceivedPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [items, setItems] = useState<ReceivedRfqItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rfq/received");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load your RFQs.");
        setItems([]);
      } else {
        setItems(data as ReceivedRfqItem[]);
      }
    } catch {
      setError("Network error.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) load();
  }, [authLoading, isAuthenticated, load]);

  if (authLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h1 className="text-lg font-semibold text-foreground mb-2">Sign in required</h1>
        <p className="text-sm text-muted mb-4">Please sign in to view RFQs sent to your company.</p>
        <Link href="/login" className="text-primary hover:underline text-sm">Go to sign in →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">RFQs received</h1>
        <p className="text-muted mt-1 text-sm">Requests for quote sent to your company.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
          <button onClick={load} className="ml-3 underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : items && items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card-bg p-8 text-center">
          <p className="text-sm text-muted">No RFQs yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card-bg/60 text-xs text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">RFQ</th>
                <th className="px-4 py-2 text-left font-medium">From</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((it) => (
                <tr key={it.recipient_id} className="border-t border-border hover:bg-card-bg/40">
                  <td className="px-4 py-2">
                    <Link href={`/rfq/received/${it.recipient_id}`} className="text-primary hover:underline font-medium">
                      {it.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-foreground">{it.sender_company_name}</td>
                  <td className="px-4 py-2">
                    <Badge variant={statusVariant(it.status)} size="sm">{rfqStatusLabel(it.status)}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted">{formatDateMmDdYyyy(it.response_due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
