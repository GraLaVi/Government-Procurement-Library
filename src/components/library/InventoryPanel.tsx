"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { RowBadge } from "@/components/library/RowBadge";
import { NetworkStockTable } from "@/components/inventory/NetworkStockTable";
import {
  type InventoryItem,
  type PartInventory,
} from "@/lib/inventory/types";

interface InventoryPanelProps {
  inventory: PartInventory | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatMoney(value: string | null, currency: string | null): string {
  if (value == null) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: currency || "USD" });
}

/** Supplier Stock tab: the viewer's own lines (full fidelity) plus other
 *  suppliers' shared listings, already projected server-side through each
 *  owner's exposure settings — anything this component doesn't receive was
 *  deliberately withheld, so absent fields simply render as "—". */
export function InventoryPanel({ inventory, isLoading, error, onRetry }: InventoryPanelProps) {
  const myColumns = useMemo<ColumnDef<InventoryItem, unknown>[]>(
    () => [
      {
        id: "customer_sku",
        accessorKey: "customer_sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-foreground">{row.original.customer_sku || "—"}</span>
        ),
      },
      {
        id: "part_number",
        accessorKey: "part_number",
        header: "Part number",
        cell: ({ row }) => <span>{row.original.part_number || "—"}</span>,
      },
      {
        id: "quantity",
        header: () => <span className="w-full text-right block">On hand</span>,
        cell: ({ row }) => (
          <span className="text-right block font-medium">
            {Number(row.original.quantity_on_hand).toLocaleString()} {row.original.unit_of_measure}
          </span>
        ),
      },
      {
        id: "condition_code",
        accessorKey: "condition_code",
        header: "Cond",
        cell: ({ row }) => <span>{row.original.condition_code || "—"}</span>,
      },
      {
        id: "unit_price",
        header: () => <span className="w-full text-right block">Unit price</span>,
        cell: ({ row }) => (
          <span className="text-right block">
            {formatMoney(row.original.unit_price, row.original.currency)}
          </span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "warehouse_location",
        accessorKey: "warehouse_location",
        header: "Warehouse",
        cell: ({ row }) => <span className="text-muted">{row.original.warehouse_location || "—"}</span>,
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "as_of_date",
        accessorKey: "as_of_date",
        header: "As of",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            {formatDate(row.original.as_of_date)}
            {row.original.network_hidden_at && (
              <RowBadge tone="amber" title="This line is older than your auto-hide threshold and has been withdrawn from the network. A fresh upload restores it.">
                hidden — needs refresh
              </RowBadge>
            )}
          </span>
        ),
      },
    ],
    []
  );

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

  return (
    <div className="space-y-6">
      {/* My stock — owner view, always full fidelity */}
      {inventory.my_stock.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              My stock ({inventory.my_stock.length})
            </h3>
            <Link href="/library/inventory" className="text-xs text-primary hover:underline">
              Manage inventory
            </Link>
          </div>
          <DataTable
            data={inventory.my_stock}
            columns={myColumns}
            getRowId={(r) => String(r.id)}
            emptyMessage="No stock lines for this part"
          />
        </section>
      )}

      {/* Network stock — projected through each owner's exposure settings */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Network stock{inventory.network_stock ? ` (${inventory.network_stock.length})` : ""}
        </h3>
        {inventory.network_stock === null ? (
          <div className="bg-card-bg rounded-lg border border-border p-6 text-center">
            <p className="text-sm font-medium text-foreground mb-1">
              See what the supply chain has on the shelf
            </p>
            <p className="text-xs text-muted max-w-md mx-auto mb-3">
              Other GPH suppliers share live stock for parts like this one. Network
              stock is included on the Advanced plan — or unlock it on any plan by
              sharing your own inventory.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/pricing" className="text-xs text-primary hover:underline">
                View plans
              </Link>
              <Link href="/library/inventory" className="text-xs text-primary hover:underline">
                Share my inventory
              </Link>
            </div>
          </div>
        ) : inventory.network_stock.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-muted">
              No shared supplier stock for this part yet. Listings appear here as
              suppliers publish their inventory
              {inventory.my_stock.length === 0 && (
                <>
                  {" "}— <Link href="/library/inventory" className="text-primary hover:underline">including yours</Link>
                </>
              )}
              .
            </p>
          </div>
        ) : (
          <>
            <NetworkStockTable
              rows={inventory.network_stock}
              nsn={inventory.nsn}
              emptyMessage="No shared supplier stock for this part"
            />
            <p className="text-[11px] text-muted mt-2">
              Each listing shows exactly what its supplier chose to share. Always
              check the as-of date — quantities are the supplier&apos;s last reported
              count, not a live feed.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
