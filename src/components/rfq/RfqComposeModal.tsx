"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { UOM_OPTIONS } from "@/lib/rfq/uom";
import type {
  RfqManufacturerSelection,
  RfqLineInput,
  RfqSendResponse,
  VendorContactResolution,
} from "@/lib/rfq/types";

interface RfqComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** NSN of the part the manufacturers were selected from. */
  nsn: string | null;
  /** Selected manufacturer rows (vendor + part). */
  selections: RfqManufacturerSelection[];
  onSent?: (result: RfqSendResponse) => void;
  onStaged?: (count: number) => void;
}

interface LineState {
  quantity: string;
  unit_of_measure: string;
  need_by_date: string;
  target_unit_price: string;
  notes: string;
}

interface ContactState {
  contact_name: string;
  contact_email: string;
}

const emptyLine: LineState = {
  quantity: "1",
  unit_of_measure: "EA",
  need_by_date: "",
  target_unit_price: "",
  notes: "",
};

const inputClass =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

export function RfqComposeModal({ isOpen, onClose, nsn, selections, onSent, onStaged }: RfqComposeModalProps) {
  const [lines, setLines] = useState<LineState[]>([]);
  const [responseDueDate, setResponseDueDate] = useState("");
  const [saveContacts, setSaveContacts] = useState(true);
  const [contacts, setContacts] = useState<Record<string, ContactState>>({});
  const [resolutions, setResolutions] = useState<Record<string, VendorContactResolution>>({});
  const [contactSel, setContactSel] = useState<Record<string, string>>({}); // cage -> "saved:<id>" | "sam" | "custom"
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Distinct vendors (cage_code) in the selection, preserving order.
  const allVendors = useMemo(() => {
    const seen = new Set<string>();
    const out: RfqManufacturerSelection[] = [];
    for (const s of selections) {
      if (!seen.has(s.cage_code)) {
        seen.add(s.cage_code);
        out.push(s);
      }
    }
    return out;
  }, [selections]);

  const vendors = useMemo(() => allVendors.filter((v) => !removed.has(v.cage_code)), [allVendors, removed]);

  // Initialize line + contact state whenever the modal opens with a selection.
  useEffect(() => {
    if (!isOpen) return;
    setLines(selections.map(() => ({ ...emptyLine })));
    setError(null);
    setSubmitting(false);
    setResponseDueDate("");
    setSaveContacts(true);
    setRemoved(new Set());
    setResolutions({});

    setContacts(Object.fromEntries(allVendors.map((v) => [v.cage_code, { contact_name: "", contact_email: "" }])));
    setContactSel(Object.fromEntries(allVendors.map((v) => [v.cage_code, "custom"])));

    let cancelled = false;
    (async () => {
      for (const v of allVendors) {
        try {
          const res = await fetch(`/api/rfq/vendor-contact?cage_code=${encodeURIComponent(v.cage_code)}`);
          if (!res.ok) continue;
          const data: VendorContactResolution = await res.json();
          if (cancelled) return;
          setResolutions((prev) => ({ ...prev, [v.cage_code]: data }));
          const best = data.saved?.[0] || null;
          if (best) {
            setContacts((prev) => ({ ...prev, [v.cage_code]: { contact_name: best.contact_name || "", contact_email: best.email } }));
            setContactSel((prev) => ({ ...prev, [v.cage_code]: `saved:${best.id}` }));
          } else if (data.suggestion?.email) {
            setContacts((prev) => ({ ...prev, [v.cage_code]: { contact_name: data.suggestion?.contact_name || "", contact_email: data.suggestion?.email || "" } }));
            setContactSel((prev) => ({ ...prev, [v.cage_code]: "sam" }));
          }
        } catch {
          /* best-effort prefill */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, selections, allVendors]);

  const setLine = (idx: number, patch: Partial<LineState>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const setContact = (cage: string, patch: Partial<ContactState>) =>
    setContacts((prev) => ({ ...prev, [cage]: { ...prev[cage], ...patch } }));

  // Apply a dropdown selection to the editable contact fields.
  const onPickContact = (cage: string, value: string) => {
    setContactSel((prev) => ({ ...prev, [cage]: value }));
    const resolution = resolutions[cage];
    if (value === "sam" && resolution?.suggestion) {
      setContact(cage, {
        contact_name: resolution.suggestion.contact_name || "",
        contact_email: resolution.suggestion.email || "",
      });
    } else if (value.startsWith("saved:")) {
      const id = Number(value.slice(6));
      const saved = resolution?.saved.find((s) => s.id === id);
      if (saved) setContact(cage, { contact_name: saved.contact_name || "", contact_email: saved.email });
    } else if (value === "custom") {
      setContact(cage, { contact_name: "", contact_email: "" });
    }
  };

  const sourceLabel = (cage: string): string => {
    const sel = contactSel[cage] || "custom";
    if (sel === "sam") return "Suggested from SAM.gov — edit if this isn't the right person";
    if (sel.startsWith("saved:")) return "From your saved contacts";
    return "Custom contact";
  };

  const removeVendor = (cage: string) => setRemoved((prev) => new Set(prev).add(cage));

  const activeSelections = () => selections.filter((s) => !removed.has(s.cage_code));

  const validate = (requireContact: boolean): string | null => {
    const active = activeSelections();
    if (active.length === 0) return "Add at least one vendor to send to.";
    for (let i = 0; i < selections.length; i++) {
      if (removed.has(selections[i].cage_code)) continue;
      const q = parseFloat(lines[i]?.quantity ?? "");
      if (!q || q <= 0) {
        return `Enter a quantity for "${selections[i].part_number || selections[i].nsn || nsn || selections[i].cage_code}".`;
      }
    }
    if (requireContact) {
      for (const v of vendors) {
        const c = contacts[v.cage_code];
        if (!c?.contact_email?.trim()) {
          return `Enter a contact email for ${v.vendor_name || v.cage_code}.`;
        }
      }
    }
    return null;
  };

  const buildItems = (withContact: boolean): RfqLineInput[] =>
    selections
      .map((sel, i) => ({ sel, i }))
      .filter(({ sel }) => !removed.has(sel.cage_code))
      .map(({ sel, i }) => {
        const line = lines[i];
        const contact = contacts[sel.cage_code];
        return {
          cage_code: sel.cage_code,
          vendor_name: sel.vendor_name,
          source_part_number: sel.part_number,
          ...(withContact
            ? {
                contact_name: contact?.contact_name || null,
                contact_email: contact?.contact_email?.trim() || null,
              }
            : {}),
          nsn: sel.nsn ?? nsn,
          part_number: sel.part_number,
          description: sel.part_number ? null : "Requested item",
          quantity: parseFloat(line.quantity),
          unit_of_measure: line.unit_of_measure || null,
          need_by_date: line.need_by_date || null,
          target_unit_price: line.target_unit_price ? parseFloat(line.target_unit_price) : null,
          notes: line.notes || null,
          response_due_date: responseDueDate || null,
        };
      });

  const persistContacts = async () => {
    if (!saveContacts) return;
    await Promise.all(
      vendors
        .filter((v) => contacts[v.cage_code]?.contact_email?.trim() && contactSel[v.cage_code] === "custom")
        .map((v) =>
          fetch("/api/rfq/vendor-contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cage_code: v.cage_code,
              contact_name: contacts[v.cage_code]?.contact_name || null,
              email: contacts[v.cage_code]?.contact_email?.trim(),
              is_default: true,
            }),
          }).catch(() => null)
        )
    );
  };

  const handleSend = async () => {
    const validationError = validate(true);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rfq/quick-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_due_date: responseDueDate || null,
          save_contacts: saveContacts,
          items: buildItems(true),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send RFQ.");
        setSubmitting(false);
        return;
      }
      onSent?.(data as RfqSendResponse);
      onClose();
    } catch {
      setError("Network error sending RFQ.");
      setSubmitting(false);
    }
  };

  const handleSaveToBatch = async () => {
    const validationError = validate(false);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await persistContacts();
      const res = await fetch("/api/rfq/batch/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: buildItems(false) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save to batch.");
        setSubmitting(false);
        return;
      }
      onStaged?.(data.added ?? buildItems(false).length);
      onClose();
    } catch {
      setError("Network error saving to batch.");
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create RFQ" size="full" preventClose={submitting}>
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        <p className="text-sm text-muted">
          {activeSelections().length} item{activeSelections().length !== 1 ? "s" : ""} ·{" "}
          {vendors.length} vendor{vendors.length !== 1 ? "s" : ""}.
          {vendors.length > 1 && " One RFQ will be sent per vendor."}
        </p>

        <div className="max-w-xs">
          <label className="block text-sm font-medium text-card-foreground mb-1">Response due date</label>
          <DateField className={inputClass} ariaLabel="Response due date" value={responseDueDate} onChange={setResponseDueDate} />
        </div>

        {vendors.map((vendor) => {
          const vendorLines = selections
            .map((sel, idx) => ({ sel, idx }))
            .filter(({ sel }) => sel.cage_code === vendor.cage_code);
          const contact = contacts[vendor.cage_code] || { contact_name: "", contact_email: "" };
          const resolution = resolutions[vendor.cage_code];
          const hasOptions = (resolution?.saved?.length || 0) > 0 || !!resolution?.suggestion?.email;
          return (
            <div key={vendor.cage_code} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {vendor.vendor_name || "Unknown vendor"}
                  <span className="ml-2 text-xs font-mono text-muted">CAGE {vendor.cage_code}</span>
                </h3>
                {allVendors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVendor(vendor.cage_code)}
                    className="text-xs text-error hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Recipient picker */}
              {hasOptions && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Recipient</label>
                  <select
                    className={inputClass}
                    value={contactSel[vendor.cage_code] || "custom"}
                    onChange={(e) => onPickContact(vendor.cage_code, e.target.value)}
                  >
                    {resolution?.saved?.map((s) => (
                      <option key={s.id} value={`saved:${s.id}`}>
                        {(s.contact_name ? `${s.contact_name} — ` : "") + s.email}{s.is_default ? " (default)" : ""}
                      </option>
                    ))}
                    {resolution?.suggestion?.email && (
                      <option value="sam">SAM.gov: {resolution.suggestion.email}</option>
                    )}
                    <option value="custom">Custom / enter manually…</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Contact name</label>
                  <input
                    className={inputClass}
                    value={contact.contact_name}
                    onChange={(e) => { setContact(vendor.cage_code, { contact_name: e.target.value }); setContactSel((p) => ({ ...p, [vendor.cage_code]: "custom" })); }}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Contact email *</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={contact.contact_email}
                    onChange={(e) => { setContact(vendor.cage_code, { contact_email: e.target.value }); setContactSel((p) => ({ ...p, [vendor.cage_code]: "custom" })); }}
                    placeholder="vendor@example.com"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted">{sourceLabel(vendor.cage_code)}</p>

              <div className="space-y-2">
                {vendorLines.map(({ sel, idx }) => (
                  <div key={idx} className="rounded-md bg-card-bg/50 border border-border/60 p-3 space-y-2">
                    <div>
                      <div className="text-xs font-mono font-semibold text-foreground">
                        {sel.part_number || "(no part number)"}
                      </div>
                      {(sel.nsn || nsn) && (
                        <div className="text-[11px] font-mono text-muted">NSN {sel.nsn || nsn}</div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[11px] text-muted mb-0.5">Qty *</label>
                        <input type="number" min="0" step="any" className={inputClass}
                          value={lines[idx]?.quantity ?? ""} onChange={(e) => setLine(idx, { quantity: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted mb-0.5">UOM</label>
                        <select className={inputClass}
                          value={lines[idx]?.unit_of_measure ?? "EA"} onChange={(e) => setLine(idx, { unit_of_measure: e.target.value })}>
                          {UOM_OPTIONS.map((u) => (
                            <option key={u.code} value={u.code}>{u.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted mb-0.5">Need by</label>
                        <DateField className={inputClass} ariaLabel="Need by date"
                          value={lines[idx]?.need_by_date ?? ""} onChange={(iso) => setLine(idx, { need_by_date: iso })} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted mb-0.5">Target $/unit</label>
                        <input type="number" min="0" step="any" className={inputClass}
                          value={lines[idx]?.target_unit_price ?? ""} onChange={(e) => setLine(idx, { target_unit_price: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted mb-0.5">Notes</label>
                      <textarea
                        className={`${inputClass} min-h-[60px] resize-y`}
                        value={lines[idx]?.notes ?? ""}
                        onChange={(e) => setLine(idx, { notes: e.target.value })}
                        placeholder="Line notes (optional)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={saveContacts} onChange={(e) => setSaveContacts(e.target.checked)} />
          Save entered contacts for future RFQs
        </label>

        {error && (
          <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="outline" size="sm" onClick={handleSaveToBatch} disabled={submitting}>Save to batch</Button>
        <Button variant="primary" size="sm" onClick={handleSend} disabled={submitting}>
          {submitting ? "Sending…" : "Send now"}
        </Button>
      </div>
    </Modal>
  );
}
