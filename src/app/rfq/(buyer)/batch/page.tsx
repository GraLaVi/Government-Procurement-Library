"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_SENDER_KEYS } from "@/lib/rfq/tier";
import { Button } from "@/components/ui/Button";
import { RfqBatchItemEditModal } from "@/components/rfq/RfqBatchItemEditModal";
import { TableCard } from "@/components/rfq/TableCard";
import type { BatchItem, BatchContributor, RfqSendResponse } from "@/lib/rfq/types";
import { rfqVendorKey } from "@/lib/rfq/types";

const ALL = "all";

export default function RfqBatchPage() {
  const { isLoading: authLoading, hasAnyProductAccess, user } = useAuth();

  const [items, setItems] = useState<BatchItem[]>([]);
  const [contributors, setContributors] = useState<BatchContributor[]>([]);
  const [filterUser, setFilterUser] = useState<string>(ALL);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filterInitialized, setFilterInitialized] = useState(false);
  const [editingItem, setEditingItem] = useState<BatchItem | null>(null);

  // Default the filter to the current user's own staged rows.
  useEffect(() => {
    if (!filterInitialized && user?.id) {
      setFilterUser(String(user.id));
      setFilterInitialized(true);
    }
  }, [user, filterInitialized]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filterUser !== ALL ? `?added_by_user_id=${filterUser}` : "";
      const [itemsRes, contribRes] = await Promise.all([
        fetch(`/api/rfq/batch${qs}`),
        fetch(`/api/rfq/batch/contributors`),
      ]);
      const itemsData = await itemsRes.json();
      if (!itemsRes.ok) {
        setError(itemsData.error || "Failed to load batch.");
        setItems([]);
      } else {
        setItems(itemsData as BatchItem[]);
      }
      if (contribRes.ok) setContributors((await contribRes.json()) as BatchContributor[]);
    } catch {
      setError("Network error loading batch.");
    } finally {
      setLoading(false);
    }
  }, [filterUser]);

  useEffect(() => {
    if (!authLoading && hasAnyProductAccess(RFQ_SENDER_KEYS)) load();
  }, [authLoading, hasAnyProductAccess, load]);

  const selectedItems = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected]);
  const selectedVendors = useMemo(
    () => new Set(selectedItems.map((i) => rfqVendorKey(i))).size,
    [selectedItems]
  );
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => (prev.size >= items.length ? new Set() : new Set(items.map((i) => i.id))));

  const updateQty = async (id: number, quantity: number) => {
    if (!quantity || quantity <= 0) return;
    try {
      const res = await fetch(`/api/rfq/batch/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) {
        const data = (await res.json()) as BatchItem;
        setItems((prev) => prev.map((i) => (i.id === id ? data : i)));
      }
    } catch {
      /* best-effort quick edit */
    }
  };

  const removeItem = async (id: number) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/rfq/batch/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const send = async (mode: "selected" | "all") => {
    setBusy(true);
    setError(null);
    const body =
      mode === "selected"
        ? { item_ids: Array.from(selected) }
        : { send_all: true, added_by_user_id: filterUser !== ALL ? Number(filterUser) : null };
    try {
      const res = await fetch("/api/rfq/batch/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send batch.");
      } else {
        const result = data as RfqSendResponse;
        setToast(`Sent ${result.rfq_count} RFQ${result.rfq_count !== 1 ? "s" : ""} to ${result.vendor_count} vendor${result.vendor_count !== 1 ? "s" : ""}.`);
        setSelected(new Set());
        await load();
      }
    } catch {
      setError("Network error sending batch.");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;

  if (!hasAnyProductAccess(RFQ_SENDER_KEYS)) {
    return (
      <AccessDeniedPage
        featureName="Request for Quotes"
        featureKey="request_for_quote"
        description="Stage RFQ items into a shared cart and send them to vendors in one go."
        benefits={["Shared team cart", "Send one RFQ per vendor", "Track every quote"]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">RFQ Batch</h1>
          <p className="text-muted mt-1 text-sm">
            Staged items shared across your team. Sending groups them into one RFQ per vendor.
          </p>
        </div>
        <Link href="/rfq" className="text-xs text-primary hover:underline whitespace-nowrap">
          ← All RFQs
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>
      )}
      {toast && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">{toast}</div>
      )}

      <TableCard
        header={
          <>
            <label className="text-xs text-muted">Added by</label>
            <select
              className="px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm"
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
                setSelected(new Set());
              }}
            >
              <option value={ALL}>Everyone</option>
              {contributors.map((c) => (
                <option key={c.user_id} value={String(c.user_id)}>
                  {c.name} ({c.item_count})
                </option>
              ))}
            </select>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={busy || selected.size === 0} onClick={() => send("selected")}>
                Send selected ({selected.size})
              </Button>
              <Button variant="primary" size="sm" disabled={busy || items.length === 0} onClick={() => send("all")}>
                Send all
              </Button>
            </div>
          </>
        }
      >
      {selected.size > 0 && (
        <p className="text-xs text-muted mb-3">
          Selected {selected.size} item{selected.size !== 1 ? "s" : ""} → {selectedVendors} vendor
          {selectedVendors !== 1 ? "s" : ""} → {selectedVendors} RFQ{selectedVendors !== 1 ? "s" : ""}.
        </p>
      )}

      {loading ? (
        <div className="text-sm text-muted">Loading batch…</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted">
            No staged items. Add some from a part&apos;s <span className="font-medium">Manufacturers</span> tab via <span className="font-medium">Create RFQ → Save to batch</span>.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-card-bg/60 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="px-3 py-2 text-left font-medium">Vendor</th>
                <th className="px-3 py-2 text-left font-medium">Recipient</th>
                <th className="px-3 py-2 text-left font-medium">Part / NSN</th>
                <th className="px-3 py-2 text-left font-medium">Qty</th>
                <th className="px-3 py-2 text-left font-medium">Added by</th>
                <th className="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} aria-label={`Select item ${it.id}`} />
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {it.vendor_name || it.cage_code}{" "}
                    {it.cage_code ? (
                      <span className="font-mono text-xs text-muted">({it.cage_code})</span>
                    ) : (
                      <span className="text-xs text-muted">(private)</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {it.resolved_contact_email ? (
                      <div>
                        <div className="text-xs text-foreground">{it.resolved_contact_email}</div>
                        {it.resolved_contact_name && (
                          <div className="text-[11px] text-muted">{it.resolved_contact_name}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-error">No contact on file</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-foreground">
                    {it.part_number || it.nsn || it.description || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      defaultValue={it.quantity ?? ""}
                      onBlur={(e) => updateQty(it.id, parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 rounded-md border border-border bg-card-bg text-card-foreground text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-muted">{it.added_by_name || `User ${it.added_by_user_id}`}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditingItem(it)}
                      disabled={busy}
                      className="text-xs text-primary hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeItem(it.id)}
                      disabled={busy}
                      className="text-xs text-error hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </TableCard>

      <RfqBatchItemEditModal
        isOpen={editingItem !== null}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={(updated) => {
          setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          setEditingItem(null);
        }}
      />
    </div>
  );
}
