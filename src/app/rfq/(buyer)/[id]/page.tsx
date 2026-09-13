"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_SENDER_KEYS } from "@/lib/rfq/tier";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  rfqStatusLabel,
  WORK_STATUS_LABELS,
  type RfqDetail,
  type RfqResponseDetail,
} from "@/lib/rfq/types";
import { formatDateMmDdYyyy } from "@/lib/dates";
import { RfqRecord } from "@/components/rfq/RfqRecord";
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
    // The reset belongs inside the frame. Done before it, it flips a
    // dependency of this effect, React re-runs the effect, and the cleanup
    // cancels the very frame meant to open the dialog.
    const id = window.requestAnimationFrame(() => {
      setPrintRequested(false);
      window.print();
    });
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

      <RfqRecord rfq={rfq} responses={responses} />

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
