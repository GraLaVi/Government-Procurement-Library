"use client";

import { useState, useEffect } from "react";
import {
  PartSearchResult,
  PartSearchResponse,
  formatCurrency,
} from "@/lib/library/types";
import { PartIdentityLink } from "@/components/bidmatching/PartIdentityLink";

// Full line-item list for one solicitation, loaded when its results row is
// expanded. The results table shows only the matched (or largest) line item
// inline — this is where the rest live.
//
// Reuses the parts search endpoint the old solicitation modal called, so the
// same data is available without the modal. Fetches on first expand only.
export function BidMatchLineItems({
  solicitationNumber,
  expectedCount,
}: {
  solicitationNumber: string | null;
  expectedCount: number;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PartSearchResult[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!solicitationNumber) return;
    const controller = new AbortController();
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          solicitation: solicitationNumber,
          limit: "50",
          offset: "0",
        });
        const res = await fetch(`/api/library/parts/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const data: PartSearchResponse = await res.json();
        setItems(data.results);
        setTotal(data.total);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load line items");
        setItems([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [solicitationNumber]);

  if (!solicitationNumber) return null;

  return (
    <div>
      <div className="text-xs text-muted mb-2">
        Line items{expectedCount > 0 ? ` (${expectedCount.toLocaleString()})` : ""}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          Loading line items…
        </div>
      ) : error ? (
        <p className="py-2 text-xs text-error">{error}</p>
      ) : !items || items.length === 0 ? (
        <p className="py-2 text-xs text-muted">No line items found for this solicitation.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-border bg-card-bg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted-light border-b border-border">
                <th className="text-left px-3 py-1.5 font-semibold text-foreground">NSN</th>
                <th className="text-left px-3 py-1.5 font-semibold text-foreground">Description</th>
                <th className="text-right px-3 py-1.5 font-semibold text-foreground whitespace-nowrap">Qty</th>
                <th className="text-left px-3 py-1.5 font-semibold text-foreground">UOM</th>
                <th className="text-right px-3 py-1.5 font-semibold text-foreground whitespace-nowrap">Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <PartIdentityLink part={p} className="data-field font-semibold" />
                  </td>
                  <td
                    className="px-3 py-1.5 text-foreground max-w-[420px] truncate"
                    title={p.description || undefined}
                  >
                    {p.description || "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right text-muted data-field whitespace-nowrap">
                    {p.quantity != null ? p.quantity.toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-muted whitespace-nowrap">{p.unit_of_issue || "—"}</td>
                  <td className="px-3 py-1.5 text-right text-muted data-field whitespace-nowrap">
                    {formatCurrency(p.unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !error && items && total > items.length && (
        <p className="mt-1.5 text-xs text-muted">
          Showing first {items.length.toLocaleString()} of {total.toLocaleString()} line items.
        </p>
      )}
    </div>
  );
}
