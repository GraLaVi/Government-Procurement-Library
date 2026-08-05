"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_SENDER_KEYS } from "@/lib/rfq/tier";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  PLACEHOLDER_LINE_DESCRIPTION,
  rfqStatusLabel,
  type RfqDetail,
  type RfqResponseDetail,
} from "@/lib/rfq/types";
import { formatDateMmDdYyyy } from "@/lib/dates";
import { formatNSN } from "@/lib/library/types";
import { TableCard } from "@/components/rfq/TableCard";
import { PrintButton } from "@/components/ui/PrintButton";

function statusVariant(status: string): "default" | "success" | "warning" | "error" {
  switch (status) {
    case "responded":
    case "submitted": return "success";
    case "viewed": return "warning";
    case "declined":
    case "stale":
    case "cancelled": return "error";
    default: return "default";
  }
}

export default function RfqDetailPage() {
  const params = useParams<{ id: string }>();
  const rfqId = params?.id;
  const { isLoading: authLoading, hasAnyProductAccess } = useAuth();

  const [rfq, setRfq] = useState<RfqDetail | null>(null);
  const [responses, setResponses] = useState<RfqResponseDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"close" | "cancel" | null>(null);
  // Stamped when Print is clicked rather than during render — `new Date()` at
  // render time would mismatch between the server and client HTML.
  const [printedOn, setPrintedOn] = useState<string | null>(null);
  const [printRequested, setPrintRequested] = useState(false);

  const load = useCallback(async () => {
    if (!rfqId) return;
    setLoading(true);
    setError(null);
    try {
      const [detailRes, respRes] = await Promise.all([
        fetch(`/api/rfq/${rfqId}`),
        fetch(`/api/rfq/${rfqId}/responses`),
      ]);
      const detail = await detailRes.json();
      if (!detailRes.ok) {
        setError(detail.error || "Failed to load RFQ.");
        return;
      }
      setRfq(detail as RfqDetail);
      if (respRes.ok) setResponses((await respRes.json()) as RfqResponseDetail[]);
    } catch {
      setError("Network error loading RFQ.");
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    if (!authLoading && hasAnyProductAccess(RFQ_SENDER_KEYS)) load();
  }, [authLoading, hasAnyProductAccess, load]);

  // Quote lines reference an rfq_line_items.id; this resolves one back to the
  // requested line it answers.
  const lineItemsById = useMemo(
    () => new Map((rfq?.line_items ?? []).map((li) => [li.id, li])),
    [rfq],
  );

  // Open the print dialog once the print-only header has actually painted.
  useEffect(() => {
    if (!printRequested) return;
    setPrintRequested(false);
    const id = window.requestAnimationFrame(() => window.print());
    return () => window.cancelAnimationFrame(id);
  }, [printRequested]);

  const act = async (action: "close" | "cancel") => {
    if (!rfqId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rfq/${rfqId}/${action}`, { method: "POST" });
      if (res.ok) {
        setRfq((await res.json()) as RfqDetail);
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${action} RFQ.`);
      }
    } catch {
      setError(`Network error during ${action}.`);
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  };

  // The whole record is already loaded, so printing only needs the printed-on
  // stamp to paint before the dialog opens. The browser's print dialog is also
  // the "Save as PDF" path, so one button covers both.
  const handlePrint = () => {
    setPrintedOn(formatDateMmDdYyyy(new Date().toISOString()));
    setPrintRequested(true);
  };

  if (authLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;

  if (!hasAnyProductAccess(RFQ_SENDER_KEYS)) {
    return (
      <AccessDeniedPage
        featureName="Request for Quotes"
        featureKey="request_for_quote"
        description="Send structured RFQs to vendors and track every quote in one place."
        benefits={["Send RFQs from parts search", "Collect structured quotes", "Track responses"]}
      />
    );
  }

  if (loading) return <div className="p-6 text-sm text-muted">Loading RFQ…</div>;

  if (!rfq) {
    return (
      <div className="p-6">
        <p className="text-sm text-error">{error || "RFQ not found."}</p>
        <Link href="/rfq" className="text-sm text-primary hover:underline">← Back to RFQs</Link>
      </div>
    );
  }

  const isOpen = rfq.status === "sent";

  return (
    <div className="print-root space-y-6">
      <div>
        <Link href="/rfq" className="no-print text-xs text-primary hover:underline">← All RFQs</Link>
        <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{rfq.title}</h1>
            <p className="text-sm text-muted mt-1">
              Created {formatDateMmDdYyyy(rfq.created_at)}
              {rfq.response_due_date ? ` · Due ${formatDateMmDdYyyy(rfq.response_due_date)}` : ""}
            </p>
            {/* Paper needs an identifier and a date the screen doesn't. */}
            <p className="print-only text-sm text-muted mt-1">
              RFQ #{rfq.id}
              {printedOn ? ` · Printed ${printedOn}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(rfq.status)} size="md">{rfqStatusLabel(rfq.status)}</Badge>
            <PrintButton className="no-print" onClick={handlePrint} title="Print this RFQ" />
            {isOpen && (
              <>
                <Button variant="outline" size="sm" className="no-print" onClick={() => setConfirmAction("close")} disabled={busy}>Close</Button>
                <Button variant="ghost" size="sm" className="no-print" onClick={() => setConfirmAction("cancel")} disabled={busy}>Cancel</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="no-print rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {/* Recipients */}
      <TableCard as="section" header={<h2 className="text-sm font-semibold text-foreground">Recipients</h2>}>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card-bg/60 text-xs text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Vendor</th>
                <th className="px-4 py-2 text-left font-medium">Contact</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Reminders</th>
              </tr>
            </thead>
            <tbody>
              {rfq.recipients.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">
                    {r.vendor_name || r.cage_code}{" "}
                    <span className="font-mono text-xs text-muted">({r.cage_code})</span>
                  </td>
                  <td className="px-4 py-2 text-muted">{r.contact_email || "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant={statusVariant(r.status)} size="sm">{rfqStatusLabel(r.status)}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted">{r.reminder_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>

      {/* Line items */}
      <TableCard as="section" header={<h2 className="text-sm font-semibold text-foreground">Requested items</h2>}>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card-bg/60 text-xs text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Part number</th>
                <th className="px-4 py-2 text-left font-medium">NSN</th>
                <th className="px-4 py-2 text-left font-medium">Qty</th>
                <th className="px-4 py-2 text-left font-medium">Need by</th>
                <th className="px-4 py-2 text-left font-medium">Target $/unit</th>
                <th className="px-4 py-2 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rfq.line_items.map((li) => (
                <tr key={li.id} className="border-t border-border">
                  <td className="px-4 py-2 text-muted">{li.line_number}</td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground">
                    {li.part_number || "—"}
                    {/* The part description, which no longer has a column of
                        its own. Legacy lines carry a placeholder here instead
                        of a real description — don't show that. */}
                    {li.description && li.description !== PLACEHOLDER_LINE_DESCRIPTION && (
                      <div className="font-sans text-xs text-muted">{li.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground">
                    {formatNSN(li.nsn) || "—"}
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {li.quantity}{li.unit_of_measure ? ` ${li.unit_of_measure}` : ""}
                  </td>
                  <td className="px-4 py-2 text-muted">{formatDateMmDdYyyy(li.need_by_date)}</td>
                  <td className="px-4 py-2 text-muted">{li.target_unit_price ?? "—"}</td>
                  <td className="px-4 py-2 text-muted">{li.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>

      {/* Responses */}
      <TableCard
        as="section"
        header={
          <h2 className="text-sm font-semibold text-foreground">
            Quotes received ({responses.length})
          </h2>
        }
      >
        {responses.length === 0 ? (
          <p className="text-sm text-muted">No quotes yet.</p>
        ) : (
          <div className="space-y-4">
            {responses.map((resp) => (
              <div key={resp.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">
                    {resp.vendor_name || resp.cage_code}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {resp.total_price != null && <span>Total ${resp.total_price}</span>}
                    {resp.lead_time_days != null && <span>· {resp.lead_time_days}d lead</span>}
                    <Badge variant={statusVariant(resp.status)} size="sm">{rfqStatusLabel(resp.status)}</Badge>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="bg-card-bg/60 text-muted">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">Line / Part</th>
                        <th className="px-3 py-1.5 text-left font-medium">Unit $</th>
                        <th className="px-3 py-1.5 text-left font-medium">Qty avail</th>
                        <th className="px-3 py-1.5 text-left font-medium">Lead</th>
                        <th className="px-3 py-1.5 text-left font-medium">Alt part</th>
                        <th className="px-3 py-1.5 text-left font-medium">No bid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resp.line_items.map((rli, i) => {
                        // rfq_line_item_id is a database id, meaningless next to
                        // the requested-items table above — show the line number
                        // and part it refers to instead.
                        const li = lineItemsById.get(rli.rfq_line_item_id);
                        return (
                        <tr key={i} className="border-t border-border/60">
                          <td className="px-3 py-1.5 text-muted">
                            {li ? (
                              <>
                                <span className="text-foreground">{li.line_number}</span>
                                <span className="ml-1.5 font-mono">
                                  {li.part_number || formatNSN(li.nsn) || ""}
                                </span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-foreground">{rli.unit_price ?? "—"}</td>
                          <td className="px-3 py-1.5 text-muted">{rli.quantity_available ?? "—"}</td>
                          <td className="px-3 py-1.5 text-muted">{rli.lead_time_days ?? "—"}</td>
                          <td className="px-3 py-1.5 text-muted">{rli.alternate_part_number || "—"}</td>
                          <td className="px-3 py-1.5 text-muted">{rli.is_no_bid ? "Yes" : "—"}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {resp.notes && <p className="text-xs text-muted">{resp.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </TableCard>

      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && act(confirmAction)}
        isLoading={busy}
        variant="destructive"
        title={confirmAction === "cancel" ? "Cancel this RFQ?" : "Close this RFQ?"}
        confirmLabel={confirmAction === "cancel" ? "Cancel RFQ" : "Close RFQ"}
        cancelLabel="Keep open"
        message={
          confirmAction === "cancel"
            ? "Cancelling stops all vendor responses and invalidates their links. Quotes already submitted are kept. This can't be undone."
            : "Closing finalizes the RFQ — vendors can no longer respond and their links stop working. Quotes already submitted are kept. This can't be undone."
        }
      />
    </div>
  );
}
