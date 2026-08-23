"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { MyStockSummary } from "@/lib/inventory/types";

export interface StockQuoteSubmit {
  quantity: number;
  notes: string;
  /** null when there is no cost basis — create unpriced. */
  pricing: {
    markup_percent: number;
    shipping_amount: number;
    other_charges: number;
  } | null;
}

/**
 * The one-step "Use my stock" form: cost basis from the buyer's inventory,
 * the QUANTITY quoted from stock (split sourcing is normal — quote 5 from
 * the shelf, RFQ vendors for the balance), markup % (prefilled from the
 * company default), shipping and other charges, with the same live
 * price-to-gov preview formula as the Price editor. One submit creates the
 * quote already priced.
 */
export function StockQuoteModal({
  partLabel,
  partDescription,
  solicitedQty,
  summary,
  defaultMarkup,
  busy,
  onSubmit,
  onClose,
}: {
  partLabel: string;
  partDescription: string | null;
  solicitedQty: number | null;
  summary: MyStockSummary;
  defaultMarkup: number | null;
  busy: boolean;
  onSubmit: (payload: StockQuoteSubmit) => void;
  onClose: () => void;
}) {
  const defaultQty =
    solicitedQty != null && solicitedQty > 0
      ? Math.min(summary.totalQuantity, solicitedQty)
      : summary.totalQuantity;
  const [qty, setQty] = useState(String(defaultQty > 0 ? defaultQty : 1));
  const [markup, setMarkup] = useState(defaultMarkup != null ? String(defaultMarkup) : "");
  const [shipping, setShipping] = useState("");
  const [other, setOther] = useState("");
  const [notes, setNotes] = useState("");

  const hasCost = summary.unitPrice != null;
  const qtyNum = qty !== "" ? parseFloat(qty) : NaN;
  const qtyValid =
    !Number.isNaN(qtyNum) && qtyNum > 0 &&
    (solicitedQty == null || solicitedQty <= 0 || qtyNum <= solicitedQty);
  const overStock = qtyValid && qtyNum > summary.totalQuantity;
  const remainder =
    solicitedQty != null && qtyValid && qtyNum < solicitedQty
      ? solicitedQty - qtyNum
      : null;

  // Live preview of the server formula: unit × (1 + markup%) + (ship + other)/qty.
  const preview = useMemo(() => {
    if (!hasCost || !qtyValid) return null;
    const m = markup !== "" ? parseFloat(markup) : 0;
    const s = shipping !== "" ? parseFloat(shipping) : 0;
    const o = other !== "" ? parseFloat(other) : 0;
    if ([m, s, o].some((v) => Number.isNaN(v) || v < 0)) return null;
    const unit = summary.unitPrice as number;
    const price = unit * (1 + m / 100) + (s + o) / qtyNum;
    return { unit: Math.round(price * 100) / 100, extended: Math.round(price * qtyNum * 100) / 100 };
  }, [hasCost, qtyValid, qtyNum, markup, shipping, other, summary.unitPrice]);

  const money = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <Modal isOpen onClose={onClose} title={`Use my stock — ${partLabel}`} size="md">
      <div className="space-y-4">
        {partDescription && (
          <p className="text-xs text-muted -mt-1">{partDescription}</p>
        )}

        {/* Cost basis */}
        <div className="rounded-lg border border-border bg-muted-light/50 px-3 py-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Your stock</span>
            <span className="font-medium text-foreground">
              {summary.totalQuantity.toLocaleString()} {summary.unitOfMeasure}
              {summary.conditionCode ? ` · cond ${summary.conditionCode}` : ""}
              {summary.warehouse ? ` · ${summary.warehouse}` : ""}
              {summary.otherLocations > 0 ? ` +${summary.otherLocations}` : ""}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-muted">Your cost</span>
            <span className="font-medium text-foreground">
              {hasCost ? `${money(summary.unitPrice as number)} / ${summary.unitOfMeasure}` : "not on file"}
            </span>
          </div>
          {solicitedQty != null && solicitedQty > 0 && (
            <div className="flex justify-between mt-1">
              <span className="text-muted">Solicited</span>
              <span className="font-medium text-foreground">{solicitedQty.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Quantity from stock */}
        <div>
          <label className="block">
            <span className="block text-xs text-muted mb-1">
              Quantity to quote from stock
            </span>
            <input
              type="number" min="1" step="any"
              max={solicitedQty != null && solicitedQty > 0 ? solicitedQty : undefined}
              className="w-40 rounded border border-border bg-card-bg px-2 py-1.5 text-sm text-foreground"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </label>
          {!qtyValid && qty !== "" && (
            <p className="text-[11px] text-error mt-1">
              {solicitedQty != null && qtyNum > solicitedQty
                ? `Can't quote more than the ${solicitedQty.toLocaleString()} solicited.`
                : "Enter a quantity above zero."}
            </p>
          )}
          {overStock && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
              More than your recorded {summary.totalQuantity.toLocaleString()} on
              hand — fine if the count is stale, but verify the shelf.
            </p>
          )}
          {remainder != null && (
            <p className="text-[11px] text-muted mt-1">
              {remainder.toLocaleString()} of the solicited quantity remains —
              use <span className="font-medium text-foreground">Get quotes</span> to
              RFQ vendors for the balance.
            </p>
          )}
        </div>

        {hasCost ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-xs text-muted mb-1">Markup %</span>
                <input
                  type="number" min="0" step="any"
                  className="w-full rounded border border-border bg-card-bg px-2 py-1.5 text-sm text-foreground"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-muted mb-1">Shipping $</span>
                <input
                  type="number" min="0" step="any"
                  className="w-full rounded border border-border bg-card-bg px-2 py-1.5 text-sm text-foreground"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-muted mb-1">Other $</span>
                <input
                  type="number" min="0" step="any"
                  className="w-full rounded border border-border bg-card-bg px-2 py-1.5 text-sm text-foreground"
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder="0"
                />
              </label>
            </div>
            <div className="flex justify-between text-sm rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-muted">Price to government</span>
              <span className="font-semibold text-foreground">
                {preview
                  ? `${money(preview.unit)} / unit · ${money(preview.extended)} extended`
                  : "—"}
              </span>
            </div>
          </>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2">
            This inventory line has no unit cost on file, so the quote will be
            created unpriced — set the unit price in the quote view, then add
            markup and shipping there.
          </p>
        )}

        {/* Buyer notes, stored on the quote line ahead of the auto breakdown */}
        <label className="block">
          <span className="block text-xs text-muted mb-1">Notes (optional)</span>
          <textarea
            rows={2}
            maxLength={2000}
            className="w-full rounded border border-border bg-card-bg px-2 py-1.5 text-sm text-foreground"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Quoting 5 from stock, RFQing the balance"
          />
        </label>

        <p className="text-[11px] text-muted">
          No vendor is contacted — this creates an internal quote from your
          inventory, ready for the bidder. You can adjust the pricing later
          from View quotes.
        </p>

        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={busy || !qtyValid || (hasCost && !preview)}
            onClick={() =>
              onSubmit({
                quantity: qtyNum,
                notes: notes.trim(),
                pricing: hasCost
                  ? {
                      markup_percent: markup !== "" ? parseFloat(markup) : 0,
                      shipping_amount: shipping !== "" ? parseFloat(shipping) : 0,
                      other_charges: other !== "" ? parseFloat(other) : 0,
                    }
                  : null,
              })
            }
          >
            {busy ? "Creating…" : hasCost ? "Create priced quote" : "Create quote"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
