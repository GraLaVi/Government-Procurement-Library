"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { UOM_OPTIONS } from "@/lib/rfq/uom";
import type { BatchItem } from "@/lib/rfq/types";

interface RfqBatchItemEditModalProps {
  isOpen: boolean;
  item: BatchItem | null;
  onClose: () => void;
  onSaved: (updated: BatchItem) => void;
}

const inputClass =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

/**
 * Thin wrapper: unmounts the form when closed and remounts per item (key),
 * so the form initializes from props in useState — no reset effect
 * (react-hooks/set-state-in-effect).
 */
export function RfqBatchItemEditModal({ isOpen, item, onClose, onSaved }: RfqBatchItemEditModalProps) {
  if (!isOpen || !item) return null;
  return <BatchItemEditForm key={item.id} item={item} onClose={onClose} onSaved={onSaved} />;
}

function BatchItemEditForm({ item, onClose, onSaved }: {
  item: BatchItem; onClose: () => void; onSaved: (updated: BatchItem) => void;
}) {
  const [quantity, setQuantity] = useState(item.quantity != null ? String(item.quantity) : "");
  const [unitOfMeasure, setUnitOfMeasure] = useState(item.unit_of_measure || "EA");
  const [needByDate, setNeedByDate] = useState(item.need_by_date || "");
  const [targetUnitPrice, setTargetUnitPrice] = useState(item.target_unit_price != null ? String(item.target_unit_price) : "");
  const [notes, setNotes] = useState(item.notes || "");
  const [responseDueDate, setResponseDueDate] = useState(item.response_due_date || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const q = parseFloat(quantity);
    if (!q || q <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const price = parseFloat(targetUnitPrice);
    try {
      const res = await fetch(`/api/rfq/batch/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: q,
          unit_of_measure: unitOfMeasure || null,
          need_by_date: needByDate || null,
          target_unit_price: targetUnitPrice.trim() && !Number.isNaN(price) ? price : null,
          notes: notes || null,
          response_due_date: responseDueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update item.");
        setSubmitting(false);
        return;
      }
      onSaved(data as BatchItem);
    } catch {
      setError("Network error updating item.");
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit batch item" size="lg" preventClose={submitting}>
      <div className="space-y-4">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {item.vendor_name || item.cage_code}{" "}
            <span className="font-mono text-xs text-muted">({item.cage_code})</span>
          </div>
          <div className="text-xs font-mono text-muted">
            {item.part_number || item.nsn || item.description || "—"}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Qty *</label>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">UOM</label>
            <select className={inputClass} value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)}>
              {UOM_OPTIONS.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Need by</label>
            <DateField className={inputClass} ariaLabel="Need by date" value={needByDate} onChange={setNeedByDate} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Target $/unit</label>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={targetUnitPrice}
              onChange={(e) => setTargetUnitPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="max-w-xs">
          <label className="block text-xs font-medium text-muted mb-1">Response due date</label>
          <DateField className={inputClass} ariaLabel="Response due date" value={responseDueDate} onChange={setResponseDueDate} />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Notes</label>
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Line notes (optional)"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Modal>
  );
}
