"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PricingPopoverProps {
  priceToGov: number;
  vendorUnitPrice: number | null;
  markupPercent: number | null;
  shippingAmount: number | null;
  otherCharges: number | null;
  pricedAt: string | null;
}

function usd(v: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

const PANEL_WIDTH = 256; // w-64

/**
 * The "Your price to gov" value as an explicit popover trigger — dotted
 * underline + info glyph so it reads as clickable, opening the full cost
 * build-up (vendor price, markup, shipping, other, priced date).
 *
 * The panel renders through a portal to document.body with fixed
 * positioning: the quote tables sit inside overflow-x-auto scroll
 * containers, which clip any absolutely-positioned child — the portal is
 * what lets the popover escape them. Repositions on scroll/resize; closes
 * on outside click or Escape.
 */
export function PricingPopover({
  priceToGov, vendorUnitPrice, markupPercent, shippingAmount, otherCharges, pricedAt,
}: PricingPopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Right-align the panel to the trigger; clamp to the viewport.
    const left = Math.max(8, Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8));
    setPos({ top: rect.bottom + 6, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Capture-phase so scrolls inside nested containers reposition too.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          // Position is computed at click time (not in an effect): the
          // trigger's rect is already final here, and it keeps the effect
          // purely about listeners.
          if (!open) place();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-label="Show price build-up"
        className="inline-flex items-center gap-1 font-mono font-semibold text-foreground underline decoration-dotted decoration-primary/60 underline-offset-2 hover:decoration-primary cursor-pointer"
      >
        ${priceToGov}
        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH }}
            className="z-[200] rounded-lg border border-border bg-card-bg shadow-xl p-3 text-left font-sans"
          >
            <div className="text-xs font-semibold text-foreground mb-2">Price build-up</div>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Vendor unit price</dt>
                <dd className="font-mono text-card-foreground">{usd(vendorUnitPrice)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Markup</dt>
                <dd className="font-mono text-card-foreground">{markupPercent != null ? `${markupPercent}%` : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Shipping</dt>
                <dd className="font-mono text-card-foreground">{usd(shippingAmount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Other charges</dt>
                <dd className="font-mono text-card-foreground">{usd(otherCharges)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-1 mt-1">
                <dt className="font-medium text-foreground">Unit price to gov</dt>
                <dd className="font-mono font-semibold text-foreground">{usd(priceToGov)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[10px] text-muted">
              Shipping and other charges are spread over the requested quantity.
              {pricedAt ? ` Priced ${new Date(pricedAt).toLocaleDateString()}.` : ""}
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
