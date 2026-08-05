"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import type { QuoteComparisonResponse } from "@/lib/rfq/types";

interface QuoteComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitationId: number;
  solicitationNumber: string | null;
}

function money(v: number | null, currency: string): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(v);
}

/**
 * Side-by-side vendor quotes for one solicitation (Enterprise §4). One table
 * per requested item; best price highlighted; the
 * alternate-part-from-non-approved-source case called out inline (that quote
 * gets rejected by DLA on AID-described items); no-bids sorted last.
 */
export function QuoteComparisonModal({ isOpen, onClose, solicitationId, solicitationNumber }: QuoteComparisonModalProps) {
  const [data, setData] = useState<QuoteComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/rfq/worklist/${solicitationId}/quotes`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(body.error || "Failed to load quotes.");
        else setData(body as QuoteComparisonResponse);
      } catch {
        if (!cancelled) setError("Network error loading quotes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, solicitationId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quotes — ${solicitationNumber || `solicitation ${solicitationId}`}`}
      size="full"
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>
        ) : data ? (
          <>
            {/* Response summary — "3 of 5 quoted" is the buyer's actual question. */}
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <span className="font-medium text-card-foreground">
                {data.quoted} of {data.invited} vendor{data.invited !== 1 ? "s" : ""} quoted
              </span>
              {data.declined > 0 && <span className="text-muted">{data.declined} declined</span>}
              {data.pending.length > 0 && (
                <span className="text-muted">
                  Waiting on: {data.pending.map((p) => p.vendor_name || p.cage_code || "?").join(", ")}
                </span>
              )}
            </div>

            {data.groups.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">
                No RFQs have been sent from this solicitation yet.
              </p>
            ) : (
              data.groups.map((g, gi) => (
                <div key={gi} className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted-light/50 border-b border-border">
                    <span className="text-sm font-semibold font-mono text-foreground">
                      {g.nsn || g.part_number || "Item"}
                    </span>
                    {g.description && <span className="ml-2 text-xs text-muted">{g.description}</span>}
                    {g.quantity != null && (
                      <span className="ml-2 text-xs text-muted">
                        · Qty {g.quantity}{g.unit_of_measure ? ` ${g.unit_of_measure}` : ""}
                      </span>
                    )}
                  </div>
                  {g.quotes.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-muted italic">No quotes back for this item yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-medium text-muted uppercase tracking-wider border-b border-border">
                            <th className="px-4 py-2">Vendor</th>
                            <th className="px-4 py-2 text-right">Unit price</th>
                            <th className="px-4 py-2 text-right">Qty avail</th>
                            <th className="px-4 py-2 text-right">Lead time</th>
                            <th className="px-4 py-2">Valid until</th>
                            <th className="px-4 py-2">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {g.quotes.map((q) => (
                            <tr
                              key={q.recipient_id}
                              className={
                                q.is_no_bid
                                  ? "opacity-50"
                                  : q.is_best_price
                                  ? "bg-emerald-50/60"
                                  : undefined
                              }
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-card-foreground">{q.vendor_name || q.cage_code || "Vendor"}</span>
                                  {q.cage_code && (
                                    <span className="text-[11px] font-mono text-muted">CAGE {q.cage_code}</span>
                                  )}
                                  {q.rfq_vendor_id != null && <Badge variant="info" size="sm">Private</Badge>}
                                  {q.is_approved_source && <Badge variant="success" size="sm">Approved source</Badge>}
                                  {q.is_best_price && <Badge variant="success" size="sm">Best price</Badge>}
                                  {q.quote_expired && <Badge variant="warning" size="sm">Expired</Badge>}
                                </div>
                                {q.alternate_part_number && (
                                  <div className="mt-0.5 text-[11px]">
                                    <span className="font-mono text-muted">Alt P/N {q.alternate_part_number}</span>
                                    {q.alternate_not_approved && (
                                      <span
                                        className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200"
                                        title="This vendor quoted an alternate part but is not an approved source for the requested item. DLA rejects such quotes on items described by manufacturer CAGE/part number — do not price without an exception."
                                      >
                                        Not an approved source
                                      </span>
                                    )}
                                  </div>
                                )}
                                {q.manufacturer && (
                                  <div className="text-[11px] text-muted">Mfr: {q.manufacturer}</div>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                                {q.is_no_bid ? "No bid" : money(q.unit_price, q.currency)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                {q.quantity_available ?? "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                {q.lead_time_days != null ? `${q.lead_time_days}d` : "—"}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                {q.quote_valid_until || "—"}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-muted max-w-[220px] truncate" title={q.notes || undefined}>
                                {q.notes || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
