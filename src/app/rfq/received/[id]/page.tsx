"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { formatDateMmDdYyyy } from "@/lib/dates";
import { PLACEHOLDER_LINE_DESCRIPTION } from "@/lib/rfq/types";
import type { PublicRfqView, ResponseLineInput } from "@/lib/rfq/types";

interface LineForm {
  unit_price: string;
  quantity_available: string;
  lead_time_days: string;
  alternate_part_number: string;
  is_no_bid: boolean;
}

const blankLine: LineForm = {
  unit_price: "",
  quantity_available: "",
  lead_time_days: "",
  alternate_part_number: "",
  is_no_bid: false,
};

const inputClass =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

export default function ReceivedRfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [view, setView] = useState<PublicRfqView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<Record<number, LineForm>>({});
  const [quoteValidUntil, setQuoteValidUntil] = useState("");
  const [headerNotes, setHeaderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "responded" | "declined">(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/rfq/received/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "This RFQ is not available.");
      } else {
        const v = data as PublicRfqView;
        setView(v);
        setLines(Object.fromEntries(v.line_items.map((li) => [li.id, { ...blankLine }])));
      }
    } catch {
      setLoadError("Network error loading the RFQ.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) load();
  }, [authLoading, isAuthenticated, load]);

  const setLine = (lid: number, patch: Partial<LineForm>) =>
    setLines((prev) => ({ ...prev, [lid]: { ...prev[lid], ...patch } }));

  const submit = async () => {
    if (!view) return;
    setSubmitting(true);
    setError(null);
    const line_items: ResponseLineInput[] = view.line_items.map((li) => {
      const f = lines[li.id] || blankLine;
      return {
        rfq_line_item_id: li.id,
        unit_price: f.is_no_bid || !f.unit_price ? null : parseFloat(f.unit_price),
        quantity_available: f.quantity_available ? parseFloat(f.quantity_available) : null,
        lead_time_days: f.lead_time_days ? parseInt(f.lead_time_days, 10) : null,
        alternate_part_number: f.alternate_part_number || null,
        is_no_bid: f.is_no_bid,
        notes: null,
      };
    });
    try {
      const res = await fetch(`/api/rfq/received/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_valid_until: quoteValidUntil || null, notes: headerNotes || null, line_items }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit quote.");
        setSubmitting(false);
        return;
      }
      setDone("responded");
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  };

  const decline = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rfq/received/${id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to decline.");
        setSubmitting(false);
        return;
      }
      setDone("declined");
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="max-w-3xl mx-auto p-8 text-sm text-muted">Loading…</div>;

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <p className="text-sm text-muted mb-3">Please sign in to view this RFQ.</p>
        <Link href="/login" className="text-primary hover:underline text-sm">Sign in →</Link>
      </div>
    );
  }

  if (loadError || !view) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-xl border border-border bg-card-bg p-8 text-center">
          <p className="text-sm text-muted">{loadError || "Not found."}</p>
          <Link href="/rfq/received" className="text-primary hover:underline text-sm">← Back</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-xl border border-success/30 bg-success/10 p-8 text-center">
          <h1 className="text-lg font-semibold text-foreground mb-2">
            {done === "responded" ? "Quote submitted" : "Response recorded"}
          </h1>
          <p className="text-sm text-muted">
            {done === "responded" ? "Your quote has been sent." : "You've declined this RFQ."}
          </p>
          <Link href="/rfq/received" className="text-primary hover:underline text-sm mt-3 inline-block">
            ← Back to received RFQs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/rfq/received" className="text-xs text-primary hover:underline">← Received RFQs</Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">{view.title}</h1>
        <p className="text-sm text-muted mt-1">
          From <span className="font-medium text-foreground">{view.sender_company_name}</span>
          {view.response_due_date ? ` · respond by ${formatDateMmDdYyyy(view.response_due_date)}` : ""}
        </p>
        {view.already_responded && (
          <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning">
            You&apos;ve already submitted a quote. Submitting again replaces it.
          </div>
        )}
      </div>

      <div className="space-y-4">
        {view.line_items.map((li) => {
          const f = lines[li.id] || blankLine;
          return (
            <div key={li.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground font-mono">
                    {li.part_number || li.nsn || li.description || `Item ${li.line_number}`}
                  </div>
                  {/* The readable item name, when the headline above is an
                      identifier rather than the description itself. */}
                  {(li.part_number || li.nsn) &&
                    li.description &&
                    li.description !== PLACEHOLDER_LINE_DESCRIPTION && (
                      <div className="text-xs text-muted">{li.description}</div>
                    )}
                </div>
                <div className="text-xs text-muted">
                  Qty {li.quantity}{li.unit_of_measure ? ` ${li.unit_of_measure}` : ""}
                  {li.need_by_date ? ` · need by ${formatDateMmDdYyyy(li.need_by_date)}` : ""}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={f.is_no_bid} onChange={(e) => setLine(li.id, { is_no_bid: e.target.checked })} />
                No bid on this line
              </label>
              {f.is_no_bid && (
                <p className="text-[11px] text-muted -mt-1">
                  You won&apos;t quote this item. {view.sender_company_name} will see it marked &ldquo;No bid&rdquo; and can still consider your other lines.
                </p>
              )}
              {!f.is_no_bid && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-muted mb-0.5">Unit price</label>
                    <input type="number" min="0" step="any" className={inputClass} value={f.unit_price} onChange={(e) => setLine(li.id, { unit_price: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-0.5">Qty available</label>
                    <input type="number" min="0" step="any" className={inputClass} value={f.quantity_available} onChange={(e) => setLine(li.id, { quantity_available: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-0.5">Lead (days)</label>
                    <input type="number" min="0" className={inputClass} value={f.lead_time_days} onChange={(e) => setLine(li.id, { lead_time_days: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-0.5">Alt part #</label>
                    <input className={inputClass} value={f.alternate_part_number} onChange={(e) => setLine(li.id, { alternate_part_number: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Quote valid until</label>
          <DateField className={inputClass} ariaLabel="Quote valid until" value={quoteValidUntil} onChange={setQuoteValidUntil} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Notes to buyer</label>
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={headerNotes}
            onChange={(e) => setHeaderNotes(e.target.value)}
            placeholder="Optional — e.g. substitutions, minimum order quantities, shipping terms"
          />
        </div>
      </div>

      {error && <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={decline} disabled={submitting}>Decline to quote</Button>
        <Button variant="primary" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit quote"}
        </Button>
      </div>
    </div>
  );
}
