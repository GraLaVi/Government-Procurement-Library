"use client";

import { NetworkStockTable } from "@/components/inventory/NetworkStockTable";
import type { VendorInventory } from "@/lib/inventory/types";

interface VendorInventoryPanelProps {
  inventory: VendorInventory | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

/**
 * A vendor's shared stock on their CAGE profile.
 *
 * This tab only renders for vendors who opted into vendor-search listing, so
 * the panel never has to explain its own absence — VendorDetail simply omits
 * the tab. Rows use the same table (and therefore the same RFQ path) as the
 * part record's Supplier Stock tab, with the part columns switched on because
 * a catalog spans many parts.
 */
export function VendorInventoryPanel({
  inventory,
  isLoading,
  error,
  onRetry,
  onLoadMore,
  isLoadingMore,
}: VendorInventoryPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted">Loading supplier stock...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-error mb-2">{error}</p>
        <button onClick={onRetry} className="text-xs text-primary hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!inventory) return null;

  const shown = inventory.listings.length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted">
          {inventory.supplier_label} publishes {inventory.total.toLocaleString()} stock
          line{inventory.total !== 1 ? "s" : ""} on GPH.
        </p>
        {shown < inventory.total && (
          <span className="text-xs text-muted">
            Showing {shown.toLocaleString()} of {inventory.total.toLocaleString()}
          </span>
        )}
      </div>

      <NetworkStockTable
        rows={inventory.listings}
        showPartColumns
        emptyMessage="This supplier has no shared stock right now"
      />

      {shown < inventory.total && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      <p className="text-[11px] text-muted">
        Each line shows exactly what this supplier chose to share. Always check
        the as-of date — quantities are their last reported count, not a live
        feed.
      </p>
    </div>
  );
}
