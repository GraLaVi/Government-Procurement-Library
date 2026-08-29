"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { TableCard, filterSelectClass } from "@/components/rfq/TableCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RowBadge } from "@/components/library/RowBadge";
import {
  type InventoryItem,
  type InventoryItemPatch,
  type MatchStatus,
  MATCH_STATUS_LABELS,
} from "@/lib/inventory/types";

const PAGE_SIZE = 50;

const MATCH_TONES: Record<MatchStatus, "green" | "amber" | "red" | "slate"> = {
  matched_niin: "green",
  matched_cage_part: "green",
  matched_part_number: "green",
  ambiguous: "amber",
  conflict: "red",
  unmatched: "slate",
};

interface ItemsTabProps {
  isAdmin: boolean;
}

interface EditState {
  item: InventoryItem;
  quantity_on_hand: string;
  quantity_committed: string;
  unit_price: string;
  lead_time_days: string;
  condition_code: string;
  warehouse_location: string;
  notes: string;
}

export function ItemsTab({ isAdmin }: ItemsTabProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [matchFilter, setMatchFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounced apply and page reset, mirroring /rfq/worklist: no Search button,
  // results follow typing. offset resets here rather than in a submit handler
  // because the query can now change without a submit.
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedQ(q.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (appliedQ) params.set("q", appliedQ);
      if (matchFilter) params.set("match_status", matchFilter);
      const res = await fetch(`/api/inventory/items?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load items.");
        return;
      }
      setItems(data.items as InventoryItem[]);
      setTotal(data.total as number);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [offset, appliedQ, matchFilter]);

  useEffect(() => { load(); }, [load]);

  const openEdit = useCallback((item: InventoryItem) => {
    setEdit({
      item,
      quantity_on_hand: item.quantity_on_hand ?? "",
      quantity_committed: item.quantity_committed ?? "",
      unit_price: item.unit_price ?? "",
      lead_time_days: item.lead_time_days != null ? String(item.lead_time_days) : "",
      condition_code: item.condition_code ?? "",
      warehouse_location: item.warehouse_location ?? "",
      notes: item.notes ?? "",
    });
  }, []);

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const body: InventoryItemPatch = {};
      if (edit.quantity_on_hand !== "") body.quantity_on_hand = Number(edit.quantity_on_hand);
      if (edit.quantity_committed !== "") body.quantity_committed = Number(edit.quantity_committed);
      if (edit.unit_price !== "") body.unit_price = Number(edit.unit_price);
      if (edit.lead_time_days !== "") body.lead_time_days = Number(edit.lead_time_days);
      if (edit.condition_code !== "") body.condition_code = edit.condition_code.toUpperCase();
      body.warehouse_location = edit.warehouse_location || undefined;
      body.notes = edit.notes || undefined;
      const res = await fetch(`/api/inventory/items/${edit.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save the item.");
        return;
      }
      setEdit(null);
      load();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory/items/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to remove the item.");
        return;
      }
      setDeleteTarget(null);
      load();
    } catch {
      setError("Network error.");
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<InventoryItem, unknown>[]>(() => {
    const cols: ColumnDef<InventoryItem, unknown>[] = [
      {
        id: "customer_sku",
        accessorKey: "customer_sku",
        header: "SKU",
        cell: ({ row }) => <span className="font-mono">{row.original.customer_sku || "—"}</span>,
      },
      {
        id: "identity",
        header: "NSN / part number",
        cell: ({ row }) => (
          <span className="font-mono whitespace-nowrap">
            {row.original.niin
              ? (row.original.fsc ? `${row.original.fsc}-${row.original.niin}` : row.original.niin)
              : row.original.part_number || "—"}
          </span>
        ),
      },
      {
        id: "quantity",
        header: () => <span className="w-full text-right block">On hand</span>,
        cell: ({ row }) => (
          <span className="text-right block font-medium whitespace-nowrap">
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
        header: () => <span className="w-full text-right block">Price</span>,
        cell: ({ row }) => (
          <span className="text-right block">
            {row.original.unit_price != null
              ? Number(row.original.unit_price).toLocaleString("en-US", { style: "currency", currency: row.original.currency || "USD" })
              : "—"}
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
        id: "match_status",
        header: "Match",
        cell: ({ row }) => (
          <RowBadge tone={MATCH_TONES[row.original.match_status]}>
            {MATCH_STATUS_LABELS[row.original.match_status]}
          </RowBadge>
        ),
      },
      {
        id: "as_of_date",
        accessorKey: "as_of_date",
        header: "As of",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            {row.original.as_of_date}
            {row.original.network_hidden_at && (
              <RowBadge tone="amber" title="Withdrawn from the network — refresh to restore.">
                hidden
              </RowBadge>
            )}
          </span>
        ),
      },
    ];
    if (isAdmin) {
      cols.push({
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex items-center gap-2 justify-end">
            <button
              className="text-xs text-primary hover:underline"
              onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}
            >
              Edit
            </button>
            <button
              className="text-xs text-error hover:underline"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(row.original); }}
            >
              Remove
            </button>
          </span>
        ),
      });
    }
    return cols;
  }, [isAdmin, openEdit]);

  return (
    <TableCard
      header={
        <>
          {/* Label and control as one <label>, so the caption reads as part of
              its own select rather than floating between two. Same shape as
              the worklist's filter row. */}
          <label className="inline-flex items-center gap-1.5 text-[11px] text-muted whitespace-nowrap">
            Match state
            <select
              className={filterSelectClass}
              value={matchFilter}
              onChange={(e) => { setOffset(0); setMatchFilter(e.target.value); }}
            >
              <option value="">All</option>
              <option value="unmatched">Not matched</option>
              <option value="ambiguous">Ambiguous</option>
              <option value="conflict">Conflict</option>
            </select>
          </label>
          {/* One bordered control with a clear button, matching the worklist
              and bid-matching search. No field selector: this searches SKU,
              part number and NSN together, so there is nothing to scope. */}
          <div className="flex-1 min-w-[240px] max-w-md flex items-stretch rounded-lg border border-border overflow-hidden focus-within:border-primary">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search SKU, part number, or NSN"
              className="flex-1 min-w-0 border-0 bg-card-bg text-foreground text-xs px-2.5 py-1 focus:outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="px-2 text-muted hover:text-foreground"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <span className="ml-auto text-xs text-muted">
            {total.toLocaleString()} line{total === 1 ? "" : "s"}
          </span>
        </>
      }
    >
      {error && <p className="text-xs text-error mb-3">{error}</p>}

      <DataTable
        data={items}
        columns={columns}
        isLoading={loading}
        getRowId={(r) => String(r.id)}
        emptyMessage="No inventory lines yet — upload a stock file to get started."
      />

      {total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            Previous
          </Button>
          <span className="text-xs text-muted">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
          </span>
          <Button size="sm" variant="outline" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
            Next
          </Button>
        </div>
      )}

      {edit && (
        <Modal isOpen onClose={() => setEdit(null)} title={`Edit ${edit.item.customer_sku || edit.item.part_number || "line"}`} size="md">
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Edits count as a fresh stock check (the as-of date moves to today) —
              but your next snapshot upload overwrites them, so make the change in
              your ERP too.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["Quantity on hand", "quantity_on_hand", "number"],
                ["Quantity committed", "quantity_committed", "number"],
                ["Unit price", "unit_price", "number"],
                ["Lead time (days)", "lead_time_days", "number"],
                ["Condition code", "condition_code", "text"],
                ["Warehouse", "warehouse_location", "text"],
              ] as const).map(([label, key, type]) => (
                <label key={key} className="block">
                  <span className="block text-xs text-muted mb-1">{label}</span>
                  <input
                    type={type}
                    step={type === "number" ? "any" : undefined}
                    className="w-full rounded border border-border bg-card-bg px-2 py-1.5 text-sm text-foreground"
                    value={edit[key]}
                    onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <label className="block">
              <span className="block text-xs text-muted mb-1">Notes</span>
              <textarea
                className="w-full rounded border border-border bg-card-bg px-2 py-1.5 text-sm text-foreground"
                rows={2}
                value={edit.notes}
                onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEdit(null)} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Remove inventory line"
        message={`Remove ${deleteTarget?.customer_sku || deleteTarget?.part_number || "this line"} from your catalog? It disappears from the network immediately; a future upload can list it again.`}
        confirmLabel="Remove"
        isLoading={deleting}
      />
    </TableCard>
  );
}
