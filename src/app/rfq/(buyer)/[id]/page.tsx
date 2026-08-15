"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_SENDER_KEYS } from "@/lib/rfq/tier";
import { RowBadge } from "@/components/library/RowBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  PLACEHOLDER_LINE_DESCRIPTION,
  rfqStatusLabel, rfqStatusTone,
  WORK_STATUS_LABELS,
  type RfqDetail,
  type RfqResponseDetail,
} from "@/lib/rfq/types";
import { formatDateMmDdYyyy } from "@/lib/dates";
import { formatCurrency, formatNSN } from "@/lib/library/types";
import {
  TableCard, rowClass, tableClass, tableHeadRowClass, tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";
import { PrintButton, ToolbarButton } from "@/components/ui/PrintButton";

export default function RfqDetailPage() {
  const router = useRouter();
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
  // Prev/next navigation across the RFQ Pipeline list (same order as /rfq).
  const [rfqIds, setRfqIds] = useState<number[]>([]);
  const [printRequested, setPrintRequested] = useState(false);
  const [completing, setCompleting] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/rfq");
        if (!res.ok || cancelled) return;
        const list: { id: number }[] = await res.json();
        setRfqIds(list.map((r) => r.id));
      } catch { /* nav arrows just stay hidden */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Open the print dialog once the print-only header has actually painted.
  useEffect(() => {
    if (!printRequested) return;
    setPrintRequested(false);
    const id = window.requestAnimationFrame(() => window.print());
    return () => window.cancelAnimationFrame(id);
  }, [printRequested]);

  // Mark the bid as sent. Writes the SOLICITATION's progress, not this RFQ's —
  // one solicitation fans out to an RFQ per vendor and "we bid this" is one
  // fact about the solicitation, so the same click moves every sibling.
  const handleComplete = async () => {
    if (!rfq?.source_solicitation_id) return;
    setCompleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rfq/worklist/${rfq.source_solicitation_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_status: "bid" }),
      });
      if (res.ok) {
        setRfq((prev) => (prev ? { ...prev, work_status: "bid" } : prev));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not mark the bid as sent.");
      }
    } catch {
      setError("Network error marking the bid as sent.");
    } finally {
      setCompleting(false);
    }
  };

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
  const isBidSent = rfq.work_status === "bid";

  return (
    <div className="print-root space-y-6">
      <div>
        <div className="no-print flex items-center gap-2">
          <Link
            href="/rfq"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs text-card-foreground hover:border-primary/50 hover:text-primary"
          >
            ← All RFQs
          </Link>
          {rfqIds.length > 1 && (() => {
            const idx = rfqIds.indexOf(Number(rfqId));
            const prevId = idx > 0 ? rfqIds[idx - 1] : null;
            const nextId = idx >= 0 && idx < rfqIds.length - 1 ? rfqIds[idx + 1] : null;
            const btn = "inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs text-card-foreground hover:border-primary/50 hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-card-foreground";
            return (
              <div className="flex items-center gap-2">
                <button type="button" className={btn} disabled={!prevId}
                  onClick={() => prevId && router.push(`/rfq/${prevId}`)} aria-label="Previous RFQ">
                  ← Prev
                </button>
                <button type="button" className={btn} disabled={!nextId}
                  onClick={() => nextId && router.push(`/rfq/${nextId}`)} aria-label="Next RFQ">
                  Next →
                </button>
                {idx >= 0 && (
                  <span className="text-xs text-muted">{idx + 1} of {rfqIds.length}</span>
                )}
              </div>
            );
          })()}
        </div>
        <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
          <div>
            {/* Reference first: it is what the buyer quotes in email and what
                the vendor sees in the invitation subject. The title says what
                the request is for. */}
            <div className="data-field text-sm font-semibold text-muted">
              RFQ-{rfq.reference_number}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{rfq.title}</h1>
            <p className="text-sm text-muted mt-1">
              Created {formatDateMmDdYyyy(rfq.created_at)}
              {rfq.response_due_date ? ` · Quote due ${formatDateMmDdYyyy(rfq.response_due_date)}` : ""}
              {/* The status pill that used to sit beside Close was the only
                  thing saying an RFQ was no longer open — the Close/Cancel
                  buttons hide themselves once it isn't. Kept as text. */}
              {!isOpen ? ` · ${rfqStatusLabel(rfq.status)}${rfq.closed_at ? ` ${formatDateMmDdYyyy(rfq.closed_at)}` : ""}` : ""}
            </p>
            {/* Paper needs a date the screen doesn't. The reference is already
                above and prints with it — `id` was standing in for one before
                there was a customer-facing number. */}
            {printedOn && (
              <p className="print-only text-sm text-muted mt-1">Printed {printedOn}</p>
            )}
          </div>
          {/* One toolbar, one geometry. Close was an outline Button, Cancel a
              ghost Button and Print a toolbar button — three sizes and three
              type scales sitting in a row. */}
          <div className="no-print flex items-center gap-2">
            {/* The reason a bidder opens this page: read the priced quote,
                send the bid, mark it done. Only offered when there is a
                solicitation to record it against. */}
            {rfq.source_solicitation_id && (
              isBidSent ? (
                <ToolbarButton
                  disabled
                  title="A bid has been sent to the government for this solicitation. Change it from the RFQ Pipeline if that was wrong."
                >
                  <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {WORK_STATUS_LABELS.bid}
                </ToolbarButton>
              ) : (
                <ToolbarButton
                  tone="primary"
                  onClick={handleComplete}
                  disabled={completing}
                  title={
                    "Mark the bid as sent to the government. Progress is tracked per "
                    + "solicitation, so this also moves any other RFQs you sent for it."
                  }
                >
                  {completing ? "Saving…" : "Complete"}
                </ToolbarButton>
              )
            )}
            {isOpen && (
              <>
                <ToolbarButton onClick={() => setConfirmAction("close")} disabled={busy}>
                  Close
                </ToolbarButton>
                <ToolbarButton tone="danger" onClick={() => setConfirmAction("cancel")} disabled={busy}>
                  Cancel
                </ToolbarButton>
              </>
            )}
            <PrintButton onClick={handlePrint} title="Print this RFQ" />
          </div>
        </div>
      </div>

      {error && (
        <div className="no-print rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {/* Recipients */}
      <TableCard as="section" header={<h2 className="text-sm font-semibold text-foreground">Recipients</h2>}>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={thClass}>Vendor</th>
                <th className={thClass}>Contact</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Reminders</th>
              </tr>
            </thead>
            <tbody>
              {rfq.recipients.map((r) => (
                <tr key={r.id} className={rowClass}>
                  <td className={`${tdClass} text-foreground`}>
                    {r.vendor_name || r.cage_code}{" "}
                    <span className="font-mono text-xs text-muted">({r.cage_code})</span>
                  </td>
                  <td className={`${tdClass} text-muted`}>{r.contact_email || "—"}</td>
                  <td className={tdClass}>
                    <RowBadge tone={rfqStatusTone(r.status)}>{rfqStatusLabel(r.status)}</RowBadge>
                  </td>
                  <td className={`${tdClass} text-muted`}>{r.reminder_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>

      {/* Line items */}
      <TableCard as="section" header={<h2 className="text-sm font-semibold text-foreground">Requested items</h2>}>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={thClass}>#</th>
                <th className={thClass}>Part number</th>
                <th className={thClass}>NSN</th>
                <th className={thClass}>Qty</th>
                <th className={thClass}>Need by</th>
                <th className={thClass}>Target $/unit</th>
                <th className={thClass}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rfq.line_items.map((li) => (
                <tr key={li.id} className={rowClass}>
                  <td className={`${tdClass} text-muted`}>{li.line_number}</td>
                  <td className={`${tdClass} font-mono text-xs text-foreground`}>
                    {li.part_number || "—"}
                    {/* The part description, which no longer has a column of
                        its own. Legacy lines carry a placeholder here instead
                        of a real description — don't show that. */}
                    {li.description && li.description !== PLACEHOLDER_LINE_DESCRIPTION && (
                      <div className="font-sans text-xs text-muted">{li.description}</div>
                    )}
                  </td>
                  <td className={`${tdClass} font-mono text-xs text-foreground`}>
                    {formatNSN(li.nsn) || "—"}
                  </td>
                  <td className={`${tdClass} text-foreground`}>
                    {li.quantity}{li.unit_of_measure ? ` ${li.unit_of_measure}` : ""}
                  </td>
                  <td className={`${tdClass} text-muted`}>{formatDateMmDdYyyy(li.need_by_date)}</td>
                  <td className={`${tdClass} text-muted`}>{li.target_unit_price ?? "—"}</td>
                  <td className={`${tdClass} text-muted`}>{li.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Quotes live in the same card as the request: they answer these
            exact lines, and the side-by-side read (asked vs. answered) is
            the whole point of the page. */}
        <div className="mt-6 pt-4 border-t border-border">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Quotes received ({responses.length})
          </h2>
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
                    {resp.line_items.some((l) => l.price_to_gov != null) && (
                      <RowBadge tone="green">Priced</RowBadge>
                    )}
                    {/* Progress is per solicitation, so this says the bid went
                        to the government for the solicitation this quote is
                        part of — not that this vendor was the one quoted. */}
                    {rfq.work_status === "bid" && (
                      <RowBadge tone="blue" title="A bid has been sent to the government for this solicitation">
                        {WORK_STATUS_LABELS.bid}
                      </RowBadge>
                    )}
                    <RowBadge tone={rfqStatusTone(resp.status)}>{rfqStatusLabel(resp.status)}</RowBadge>
                  </div>
                </div>
                <div className={tableWrapClass}>
                  <table className={tableClass}>
                    <thead>
                      <tr className={tableHeadRowClass}>
                        <th className={thClass}>Line / Part</th>
                        <th className={thClass}>Unit $</th>
                        <th className={thClass}>Qty avail</th>
                        <th className={thClass}>Lead</th>
                        <th className={thClass}>Alt part</th>
                        <th className={thClass}>No bid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resp.line_items.map((rli, i) => {
                        // rfq_line_item_id is a database id, meaningless next to
                        // the requested-items table above — show the line number
                        // and part it refers to instead.
                        const li = lineItemsById.get(rli.rfq_line_item_id);
                        return (
                        <Fragment key={i}>
                        <tr className={rowClass}>
                          <td className={`${tdClass} text-muted`}>
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
                          <td className={`${tdClass} text-foreground`}>{rli.unit_price ?? "—"}</td>
                          <td className={`${tdClass} text-muted`}>{rli.quantity_available ?? "—"}</td>
                          <td className={`${tdClass} text-muted`}>{rli.lead_time_days ?? "—"}</td>
                          <td className={`${tdClass} text-muted`}>{rli.alternate_part_number || "—"}</td>
                          <td className={`${tdClass} text-muted`}>{rli.is_no_bid ? "Yes" : "—"}</td>
                        </tr>
                        {/* What the BUYER did to this line after the vendor
                            quoted it, spelled out rather than summarised behind
                            a popover on a "price to gov" column. The vendor
                            sends unit_price; everything here was added by us,
                            so a bidder reading the record can see exactly how
                            the government number was reached and who reached
                            it. Absent until someone prices the line. */}
                        {rli.price_to_gov != null && (
                          <tr className="border-t border-border/40 bg-muted-light/40">
                            <td colSpan={6} className="px-3 py-1.5">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px]">
                                <span className="text-muted">↳ Buyer priced:</span>
                                <span className="font-mono tabular-nums text-muted">
                                  {formatCurrency(rli.unit_price)} vendor
                                </span>
                                {rli.markup_percent != null && (
                                  <span className="font-mono tabular-nums text-muted">
                                    + {rli.markup_percent}% markup
                                  </span>
                                )}
                                {rli.shipping_amount != null && (
                                  <span className="font-mono tabular-nums text-muted">
                                    + {formatCurrency(rli.shipping_amount)} shipping
                                  </span>
                                )}
                                {rli.other_charges != null && (
                                  <span className="font-mono tabular-nums text-muted">
                                    + {formatCurrency(rli.other_charges)} other
                                  </span>
                                )}
                                <span className="text-muted">→</span>
                                <span className="font-mono tabular-nums font-semibold text-foreground">
                                  {formatCurrency(rli.price_to_gov)} to government
                                </span>
                                {(rli.priced_by_name || rli.priced_at) && (
                                  <span className="text-muted/80">
                                    ·{rli.priced_by_name ? ` ${rli.priced_by_name}` : ""}
                                    {rli.priced_at ? `, ${formatDateMmDdYyyy(rli.priced_at)}` : ""}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
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
        </div>
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
