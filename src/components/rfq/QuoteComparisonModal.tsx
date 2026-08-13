"use client";

import { Fragment, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RowBadge } from "@/components/library/RowBadge";
import { Button } from "@/components/ui/Button";
import type { ComparisonQuote, QuoteComparisonResponse, RfqSettings } from "@/lib/rfq/types";

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
  // Pricing editor: which quote line is open + its draft fields.
  const [pricingFor, setPricingFor] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ markup: string; shipping: string; other: string }>({ markup: "", shipping: "", other: "" });
  const [savingPrice, setSavingPrice] = useState(false);
  const [defaultMarkup, setDefaultMarkup] = useState<number | null>(null);

  // Org default markup % pre-fills the editor (soft-fail).
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await fetch("/api/rfq/settings");
        if (res.ok) {
          const st: RfqSettings = await res.json();
          setDefaultMarkup(st.default_markup_percent ?? null);
        }
      } catch { /* soft */ }
    })();
  }, [isOpen]);

  const openPricing = (q: ComparisonQuote) => {
    setPricingFor(q.response_line_id);
    setDraft({
      markup: q.markup_percent != null ? String(q.markup_percent) : defaultMarkup != null ? String(defaultMarkup) : "",
      shipping: q.shipping_amount != null ? String(q.shipping_amount) : "",
      other: q.other_charges != null ? String(q.other_charges) : "",
    });
  };

  const savePricing = async (q: ComparisonQuote, clear = false) => {
    setSavingPrice(true);
    setError(null);
    try {
      const body = clear
        ? { markup_percent: null, shipping_amount: null, other_charges: null }
        : {
            markup_percent: draft.markup !== "" ? parseFloat(draft.markup) : 0,
            shipping_amount: draft.shipping !== "" ? parseFloat(draft.shipping) : 0,
            other_charges: draft.other !== "" ? parseFloat(draft.other) : 0,
          };
      const res = await fetch(`/api/rfq/quote-lines/${q.response_line_id}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const out = await res.json();
      if (!res.ok) {
        setError(out.error || "Failed to save pricing.");
        return;
      }
      // Patch the saved fields into local state — no refetch needed.
      setData((prev) =>
        prev
          ? {
              ...prev,
              groups: prev.groups.map((g) => ({
                ...g,
                quotes: g.quotes.map((x) =>
                  x.response_line_id === q.response_line_id
                    ? { ...x, markup_percent: out.markup_percent, shipping_amount: out.shipping_amount, other_charges: out.other_charges, price_to_gov: out.price_to_gov, priced_at: out.priced_at }
                    : x
                ),
              })),
            }
          : prev
      );
      setPricingFor(null);
    } catch {
      setError("Network error saving pricing.");
    } finally {
      setSavingPrice(false);
    }
  };

  /** Live preview of the server formula: unit x (1+markup%) + (ship+other)/qty. */
  const previewPrice = (q: ComparisonQuote, qty: number | null): number | null => {
    if (q.unit_price == null || !qty) return null;
    const markup = draft.markup !== "" ? parseFloat(draft.markup) : 0;
    const ship = draft.shipping !== "" ? parseFloat(draft.shipping) : 0;
    const other = draft.other !== "" ? parseFloat(draft.other) : 0;
    if ([markup, ship, other].some((n) => Number.isNaN(n) || n < 0)) return null;
    return Math.round((q.unit_price * (1 + markup / 100) + (ship + other) / qty) * 100) / 100;
  };

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
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[10px] font-semibold text-muted uppercase tracking-wide border-b border-border">
                            <th className="px-3 py-2">Vendor</th>
                            <th className="px-3 py-2 text-right">Unit price</th>
                            <th className="px-3 py-2 text-right">Qty avail</th>
                            <th className="px-3 py-2 text-right">Lead time</th>
                            <th className="px-3 py-2">Valid until</th>
                            <th className="px-3 py-2 text-right">Price to gov</th>
                            <th className="px-3 py-2 text-right" aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {g.quotes.map((q) => (
                            <Fragment key={q.recipient_id}>
                            <tr
                              className={
                                q.is_no_bid
                                  ? "opacity-50"
                                  : q.is_best_price
                                  ? "bg-emerald-50/60"
                                  : undefined
                              }
                            >
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-card-foreground">{q.vendor_name || q.cage_code || "Vendor"}</span>
                                  {q.cage_code && (
                                    <span className="text-[11px] font-mono text-muted">CAGE {q.cage_code}</span>
                                  )}
                                  {q.rfq_vendor_id != null && <RowBadge tone="sky">Private</RowBadge>}
                                  {q.is_approved_source && <RowBadge tone="green">Approved source</RowBadge>}
                                  {q.is_best_price && <RowBadge tone="green">Best price</RowBadge>}
                                  {q.quote_expired && <RowBadge tone="amber">Expired</RowBadge>}
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
                              <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                                {q.is_no_bid ? "No bid" : money(q.unit_price, q.currency)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">
                                {q.quantity_available ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                {q.lead_time_days != null ? `${q.lead_time_days}d` : "—"}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {q.quote_valid_until || "—"}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                                {q.price_to_gov != null ? (
                                  <span
                                    className="font-semibold text-foreground"
                                    title={`Markup ${q.markup_percent ?? 0}% · shipping ${q.shipping_amount ?? 0} · other ${q.other_charges ?? 0}`}
                                  >
                                    {money(q.price_to_gov, q.currency)}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                {!q.is_no_bid && q.unit_price != null && (
                                  <button
                                    type="button"
                                    className="text-xs text-primary hover:underline"
                                    onClick={() => (pricingFor === q.response_line_id ? setPricingFor(null) : openPricing(q))}
                                  >
                                    {q.price_to_gov != null ? "Edit price" : "Price"}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {(q.notes || q.response_notes) && (
                              <tr className={q.is_no_bid ? "opacity-50" : q.is_best_price ? "bg-emerald-50/60" : undefined}>
                                <td colSpan={7} className="px-6 pb-2.5 pt-0 text-xs text-muted">
                                  {/* Full-width, untruncated — the vendor's message is
                                      decision context, not an afterthought. */}
                                  {q.response_notes && (
                                    <div>
                                      <span className="font-medium text-card-foreground">Vendor message:</span>{" "}
                                      <span className="whitespace-pre-wrap">{q.response_notes}</span>
                                    </div>
                                  )}
                                  {q.notes && (
                                    <div className={q.response_notes ? "mt-0.5" : undefined}>
                                      <span className="font-medium text-card-foreground">Line note:</span>{" "}
                                      <span className="whitespace-pre-wrap">{q.notes}</span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                            {pricingFor === q.response_line_id && (
                              <tr className="bg-muted-light/40">
                                <td colSpan={7} className="px-6 py-3">
                                  <div className="flex flex-wrap items-end gap-3">
                                    <div>
                                      <label className="block text-[11px] text-muted mb-0.5">Markup %</label>
                                      <input type="number" min="0" step="any"
                                        className="w-24 px-2 py-1 rounded-md border border-border bg-card-bg text-sm"
                                        value={draft.markup}
                                        onChange={(e) => setDraft((d) => ({ ...d, markup: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] text-muted mb-0.5">Shipping $</label>
                                      <input type="number" min="0" step="any"
                                        className="w-28 px-2 py-1 rounded-md border border-border bg-card-bg text-sm"
                                        value={draft.shipping}
                                        onChange={(e) => setDraft((d) => ({ ...d, shipping: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] text-muted mb-0.5">Other charges $</label>
                                      <input type="number" min="0" step="any"
                                        className="w-28 px-2 py-1 rounded-md border border-border bg-card-bg text-sm"
                                        value={draft.other}
                                        onChange={(e) => setDraft((d) => ({ ...d, other: e.target.value }))} />
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-muted text-xs">Unit price to government:</span>{" "}
                                      <span className="font-mono font-semibold text-foreground">
                                        {(() => {
                                          const pv = previewPrice(q, g.quantity);
                                          return pv != null ? money(pv, q.currency) : "—";
                                        })()}
                                      </span>
                                      {g.quantity != null && (() => {
                                        const pv = previewPrice(q, g.quantity);
                                        return pv != null ? (
                                          <span className="ml-2 text-xs text-muted">
                                            × {g.quantity} = {money(Math.round(pv * g.quantity * 100) / 100, q.currency)}
                                          </span>
                                        ) : null;
                                      })()}
                                    </div>
                                    <div className="ml-auto flex items-center gap-2">
                                      {q.price_to_gov != null && (
                                        <button type="button" className="text-xs text-error hover:underline"
                                          disabled={savingPrice} onClick={() => savePricing(q, true)}>
                                          Clear
                                        </button>
                                      )}
                                      <Button variant="ghost" size="sm" disabled={savingPrice} onClick={() => setPricingFor(null)}>
                                        Cancel
                                      </Button>
                                      <Button variant="primary" size="sm" disabled={savingPrice} onClick={() => savePricing(q)}>
                                        {savingPrice ? "Saving…" : "Save price"}
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="mt-1.5 text-[11px] text-muted">
                                    Price to government = vendor unit price × (1 + markup%) + (shipping + other) ÷ requested qty.
                                    Saving marks the solicitation Priced.
                                  </p>
                                </td>
                              </tr>
                            )}
                            </Fragment>
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
