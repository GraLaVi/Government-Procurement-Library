"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { RowBadge } from "@/components/library/RowBadge";
import {
  type InventoryItem,
  type NetworkStockItem,
  type PartInventory,
  MATERIAL_SOURCE_LABELS,
  TRACEABILITY_LABELS,
  formatNetworkQuantity,
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

  const networkColumns = useMemo<ColumnDef<NetworkStockItem, unknown>[]>(
    () => [
      {
        id: "supplier",
        header: "Supplier",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.supplier_label}</span>
        ),
      },
      {
        id: "quantity",
        header: () => <span className="w-full text-right block">Qty</span>,
        cell: ({ row }) => (
          <span className="text-right block font-medium whitespace-nowrap">
            {formatNetworkQuantity(row.original)}
            {row.original.unit_of_measure ? ` ${row.original.unit_of_measure}` : ""}
          </span>
        ),
      },
      {
        id: "condition",
        header: "Cond",
        cell: ({ row }) => <span>{row.original.condition_code || "—"}</span>,
      },
      {
        id: "source",
        header: "Source",
        cell: ({ row }) => (
          <span className="text-muted">
            {row.original.material_source
              ? MATERIAL_SOURCE_LABELS[row.original.material_source] ?? row.original.material_source
              : "—"}
          </span>
        ),
        meta: { className: "hidden md:table-cell" },
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
        id: "moq",
        header: () => <span className="w-full text-right block">MOQ</span>,
        cell: ({ row }) => (
          <span className="text-right block">
            {row.original.minimum_order_quantity != null
              ? Number(row.original.minimum_order_quantity).toLocaleString()
              : "—"}
          </span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "lead_time",
        header: "Lead time",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.lead_time_days != null ? `${row.original.lead_time_days} days` : "—"}
          </span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "traceability",
        header: "Traceability",
        cell: ({ row }) => (
          <span className="text-muted">
            {row.original.traceability
              ? TRACEABILITY_LABELS[row.original.traceability] ?? row.original.traceability
              : "—"}
          </span>
        ),
        meta: { className: "hidden xl:table-cell" },
      },
      {
        id: "ships_from",
        header: "Ships from",
        cell: ({ row }) => (
          <span className="text-muted">
            {row.original.ship_from_region || row.original.ship_from_country || "—"}
          </span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "as_of",
        header: "As of",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            {formatDate(row.original.as_of_date)}
            {row.original.is_stale && (
              <RowBadge tone="amber" title="This listing has not been refreshed recently — confirm availability with the supplier.">
                stale
              </RowBadge>
            )}
          </span>
        ),
      },
      {
        id: "inquiry",
        header: "Inquiry",
        cell: ({ row }) =>
          row.original.inquiry_routing === "email" && row.original.inquiry_email ? (
            <a
              href={`mailto:${row.original.inquiry_email}`}
              className="text-xs text-primary hover:underline whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              Email supplier
            </a>
          ) : (
            <RowBadge
              tone="indigo"
              title="This supplier receives inquiries through GPH's RFQ tools; their identity stays private until they respond."
            >
              via GPH RFQ
            </RowBadge>
          ),
        enableSorting: false,
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
            <Link href="/account/inventory" className="text-xs text-primary hover:underline">
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
              stock is included on Basic and Advanced plans — or unlock it on any
              plan by sharing your own inventory.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/pricing" className="text-xs text-primary hover:underline">
                View plans
              </Link>
              <Link href="/account/inventory" className="text-xs text-primary hover:underline">
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
                  {" "}— <Link href="/account/inventory" className="text-primary hover:underline">including yours</Link>
                </>
              )}
              .
            </p>
          </div>
        ) : (
          <>
            <DataTable
              data={inventory.network_stock}
              columns={networkColumns}
              getRowId={(r) => String(r.listing_id)}
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
