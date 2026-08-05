"use client";

import { useEffect, useRef, useState } from "react";

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

/**
 * The "Your price to gov" value as an explicit popover trigger — dotted
 * underline + info glyph so it reads as clickable, opening the full cost
 * build-up (vendor price, markup, shipping, other, priced date). Click
 * outside or Escape closes.
 */
export function PricingPopover({
  priceToGov, vendorUnitPrice, markupPercent, shippingAmount, otherCharges, pricedAt,
}: PricingPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Show price build-up"
        className="inline-flex items-center gap-1 font-mono font-semibold text-foreground underline decoration-dotted decoration-primary/60 underline-offset-2 hover:decoration-primary cursor-pointer"
      >
        ${priceToGov}
        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-lg border border-border bg-card-bg shadow-xl p-3 text-left font-sans">
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
        </div>
      )}
    </span>
  );
}
