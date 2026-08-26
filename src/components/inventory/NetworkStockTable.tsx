"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { RowBadge } from "@/components/library/RowBadge";
import { RfqComposeModal } from "@/components/rfq/RfqComposeModal";
import { useAuth } from "@/contexts/AuthContext";
import { RFQ_SENDER_KEYS } from "@/lib/rfq/tier";
import type { RfqManufacturerSelection } from "@/lib/rfq/types";
import {
  type NetworkStockItem,
  MATERIAL_SOURCE_LABELS,
  TRACEABILITY_LABELS,
  formatNetworkQuantity,
} from "@/lib/inventory/types";

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

/** NSN as stored on the listing: FSC + dashed NIIN. Present only when the
 *  line matched a catalog part, which every shared listing has by definition
 *  (the network quality bar requires part_id). */
function listingNsn(row: NetworkStockItem): string | null {
  if (!row.niin) return null;
  return row.fsc ? `${row.fsc}-${row.niin}` : row.niin;
}

interface NetworkStockTableProps {
  rows: NetworkStockItem[];
  /** Part context from the surrounding page. Null on the vendor-search
   *  catalog, where each listing carries its own part identity instead. */
  nsn?: string | null;
  /** Show Part / NSN columns — the catalog spans many parts, a part record
   *  does not. */
  showPartColumns?: boolean;
  emptyMessage?: string;
}

/**
 * Shared network-stock table for both surfaces that render other companies'
 * stock: the part record's Supplier Stock tab and a vendor's Inventory tab.
 *
 * RFQ selection lives here rather than in either caller so the two can't
 * drift on the thing that matters — a listing is addressed by
 * `inventory_listing_id` and never by any identity the row happens to show.
 * The backend resolves that to the owning customer, groups by owner, and
 * takes the delivery address from the owner's own settings, so "who is this"
 * is never a question the client can answer or needs to.
 */
export function NetworkStockTable({
  rows,
  nsn = null,
  showPartColumns = false,
  emptyMessage = "No shared supplier stock",
}: NetworkStockTableProps) {
  // RFQ is a separate paid add-on (either tier — Enterprise is a superset).
  const { hasAnyProductAccess } = useAuth();
  const canSendRfq = hasAnyProductAccess(RFQ_SENDER_KEYS);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Listings can disappear between renders — withdrawn, gone stale, or a new
  // page of the catalog. Derive the effective selection from what is actually
  // on screen rather than pruning state in an effect, so the count can never
  // claim more than the user can see.
  const visibleSelected = useMemo(
    () => rows.filter((r) => selectedIds.has(r.listing_id)),
    [rows, selectedIds]
  );
  const selectedCount = visibleSelected.length;

  const allSelected = rows.length > 0 && selectedCount === rows.length;

  const toggleRow = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size >= rows.length ? new Set() : new Set(rows.map((r) => r.listing_id))
    );
  }, [rows]);

  const selections: RfqManufacturerSelection[] = useMemo(
    () =>
      visibleSelected
        .map((r) => ({
          cage_code: null,
          inventory_listing_id: r.listing_id,
          // The label the listing showed — anonymized unless its owner opted
          // into being named. Never a CAGE.
          vendor_name: r.supplier_label,
          part_number: r.part_number,
          nsn: listingNsn(r) ?? nsn,
          part_id: r.part_id,
          description: null,
        })),
    [visibleSelected, nsn]
  );

  const selectColumn = useMemo<ColumnDef<NetworkStockItem, unknown>>(
    () => ({
      id: "rfq_select",
      header: () => (
        <input
          type="checkbox"
          aria-label="Select all listings"
          checked={allSelected}
          onChange={toggleAll}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label={`Select listing from ${row.original.supplier_label}`}
          checked={selectedIds.has(row.original.listing_id)}
          onChange={() => toggleRow(row.original.listing_id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      meta: { className: "w-8" },
    }),
    [allSelected, selectedIds, toggleAll, toggleRow]
  );

  const partColumns = useMemo<ColumnDef<NetworkStockItem, unknown>[]>(
    () => [
      {
        id: "part_number",
        header: "Part number",
        cell: ({ row }) => (
          <span className="font-mono text-foreground">{row.original.part_number || "—"}</span>
        ),
      },
      {
        id: "nsn",
        header: "NSN",
        cell: ({ row }) => (
          <span className="font-mono text-muted whitespace-nowrap">{listingNsn(row.original) || "—"}</span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
    ],
    []
  );

  const dataColumns = useMemo<ColumnDef<NetworkStockItem, unknown>[]>(
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
              onClick={(e) => {
                e.stopPropagation();
                // Tell the supplier's stats this happened. RFQ inquiries are
                // recorded server-side already; a mailto: never reaches us,
                // so without this beacon anyone routing inquiries by email
                // shows zero inquiries forever. Fire-and-forget — the mail
                // client must open whether or not this lands.
                void fetch(
                  `/api/inventory/listings/${row.original.listing_id}/inquiry-click`,
                  { method: "POST", keepalive: true }
                ).catch(() => { /* stats must never break the link */ });
              }}
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

  const columns = useMemo(
    () => [
      ...(canSendRfq ? [selectColumn] : []),
      ...(showPartColumns ? partColumns : []),
      ...dataColumns,
    ],
    [canSendRfq, selectColumn, showPartColumns, partColumns, dataColumns]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-3">
        {canSendRfq ? (
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create RFQ{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        ) : (
          <Link
            href="/pricing"
            title="Add RFQ to send quote requests to these suppliers"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary/40 hover:text-primary"
          >
            <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span>Unlock <span className="font-semibold text-primary">RFQ</span></span>
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>

      {toast && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-xs text-success">
          {toast}
        </div>
      )}

      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => String(r.listing_id)}
        emptyMessage={emptyMessage}
      />

      {canSendRfq && (
        <RfqComposeModal
          isOpen={composeOpen}
          onClose={() => setComposeOpen(false)}
          nsn={nsn}
          selections={selections}
          onSent={(result) => {
            setSelectedIds(new Set());
            setComposeOpen(false);
            setToast(
              `Sent ${result.rfq_count} RFQ${result.rfq_count !== 1 ? "s" : ""} to ${result.vendor_count} supplier${result.vendor_count !== 1 ? "s" : ""}. They'll reply through GPH.`
            );
          }}
        />
      )}
    </div>
  );
}
