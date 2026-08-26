"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { UOM_OPTIONS } from "@/lib/rfq/uom";
import { PLACEHOLDER_LINE_DESCRIPTION, rfqVendorKey } from "@/lib/rfq/types";
import type {
  RfqManufacturerSelection,
  RfqLineInput,
  RfqSendResponse,
  RfqSettings,
  VendorContactResolution,
} from "@/lib/rfq/types";

interface RfqComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** NSN of the part the manufacturers were selected from. */
  nsn: string | null;
  /** Selected vendor rows (CAGE manufacturers and/or private vendors). */
  selections: RfqManufacturerSelection[];
  onSent?: (result: RfqSendResponse) => void;
  onStaged?: (count: number) => void;
  /** Send RFQs work queue context: stamped onto every line so the RFQ traces
   * back to its solicitation. */
  sourceSolicitationId?: number | null;
  /** Prefill for the response-due-date field (e.g. solicitation close date
   * minus the customer's quote-due lead days). User-editable as always. */
  defaultResponseDueDate?: string | null;
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

/** A stock listing routes through GPH: no contact is collected, and the
 *  owner's identity is whatever the listing chose to show. */
const isStock = (sel: RfqManufacturerSelection) => sel.inventory_listing_id != null;

/** Distinct vendors in a selection, preserving order. */
function dedupeVendors(selections: RfqManufacturerSelection[]): RfqManufacturerSelection[] {
  const seen = new Set<string>();
  const out: RfqManufacturerSelection[] = [];
  for (const s of selections) {
    const key = rfqVendorKey(s);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

/**
 * Thin wrapper: the form unmounts when closed, so every open starts from
 * fresh useState initializers — no reset effect
 * (react-hooks/set-state-in-effect). The remaining effect only runs the
 * async contact/settings prefills.
 */
export function RfqComposeModal({ isOpen, ...formProps }: RfqComposeModalProps) {
  if (!isOpen) return null;
  return <ComposeForm {...formProps} />;
}

function ComposeForm({
  onClose,
  nsn,
  selections,
  onSent,
  onStaged,
  sourceSolicitationId,
  defaultResponseDueDate,
}: Omit<RfqComposeModalProps, "isOpen">) {
  // All per-vendor state is keyed by rfqVendorKey(sel): "cage:<CAGE>" for
  // manufacturers, "vendor:<id>" for private vendors — never by raw
  // cage_code, which is null for private vendors.
  const [lines, setLines] = useState<LineState[]>(() => selections.map(() => ({ ...emptyLine })));
  const [responseDueDate, setResponseDueDate] = useState(defaultResponseDueDate || "");
  const [saveContacts, setSaveContacts] = useState(true);
  const [contacts, setContacts] = useState<Record<string, ContactState>>(() =>
    Object.fromEntries(dedupeVendors(selections).map((v) => [rfqVendorKey(v), { contact_name: "", contact_email: "" }]))
  );
  const [resolutions, setResolutions] = useState<Record<string, VendorContactResolution>>({});
  const [contactSel, setContactSel] = useState<Record<string, string>>(() =>
    Object.fromEntries(dedupeVendors(selections).map((v) => [rfqVendorKey(v), "custom"]))
  ); // key -> "saved:<id>" | "sam" | "custom"
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allVendors = useMemo(() => dedupeVendors(selections), [selections]);

  const vendors = useMemo(
    () => allVendors.filter((v) => !removed.has(rfqVendorKey(v))),
    [allVendors, removed]
  );

  // True when at least one active vendor's contact is hand-typed rather than
  // picked from their saved/SAM.gov options — that contact has no other home
  // to live in, so it's always saved (no opt-out, no checkbox for it).
  const anyCustomContact = vendors.some(
    (v) => !isStock(v) && (contactSel[rfqVendorKey(v)] || "custom") === "custom"
  );

  // Supplier stock is quick-send only: a staged cart row cannot re-check that
  // the listing is still shared, still fresh, and still visible at send time,
  // and the backend rejects inventory targets in the batch schema for exactly
  // that reason.
  const anyStock = vendors.some(isStock);
  const effectiveSaveContacts = anyCustomContact || saveContacts;

  // Async prefills, once per open (mounted == open). Line/contact state
  // initializes in useState above.
  useEffect(() => {
    let cancelled = false;

    // Pre-fill the due date from the customer's "Default response window
    // (days)" setting — unless the caller already supplied one (work-queue
    // path derives it from the solicitation close date). Functional set so a
    // date the user has already typed (this fetch is async) is never
    // overwritten; the field stays editable and clearable either way.
    if (!defaultResponseDueDate) {
      (async () => {
        try {
          const res = await fetch("/api/rfq/settings");
          if (!res.ok) return;
          const settings: RfqSettings = await res.json();
          const days = settings.default_response_due_days;
          if (cancelled || days == null) return;
          const due = new Date();
          due.setDate(due.getDate() + days);
          const iso = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
          setResponseDueDate((prev) => prev || iso);
        } catch {
          /* best-effort prefill */
        }
      })();
    }

    (async () => {
      for (const v of allVendors) {
        // Stock listings have no vendor book entry and no SAM identity to
        // look up — asking would also leak which CAGE we think they are.
        if (isStock(v)) continue;
        const key = rfqVendorKey(v);
        try {
          const param =
            v.rfq_vendor_id != null
              ? `rfq_vendor_id=${v.rfq_vendor_id}`
              : `cage_code=${encodeURIComponent(v.cage_code ?? "")}`;
          const res = await fetch(`/api/rfq/vendor-contact?${param}`);
          if (!res.ok) continue;
          const data: VendorContactResolution = await res.json();
          if (cancelled) return;
          setResolutions((prev) => ({ ...prev, [key]: data }));
          const best = data.saved?.[0] || null;
          if (best) {
            setContacts((prev) => ({ ...prev, [key]: { contact_name: best.contact_name || "", contact_email: best.email } }));
            setContactSel((prev) => ({ ...prev, [key]: `saved:${best.id}` }));
          } else if (data.suggestion?.email) {
            setContacts((prev) => ({ ...prev, [key]: { contact_name: data.suggestion?.contact_name || "", contact_email: data.suggestion?.email || "" } }));
            setContactSel((prev) => ({ ...prev, [key]: "sam" }));
          }
        } catch {
          /* best-effort prefill */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allVendors, defaultResponseDueDate]);

  const setLine = (idx: number, patch: Partial<LineState>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const setContact = (key: string, patch: Partial<ContactState>) =>
    setContacts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // Apply a dropdown selection to the editable contact fields.
  const onPickContact = (key: string, value: string) => {
    setContactSel((prev) => ({ ...prev, [key]: value }));
    const resolution = resolutions[key];
    if (value === "sam" && resolution?.suggestion) {
      setContact(key, {
        contact_name: resolution.suggestion.contact_name || "",
        contact_email: resolution.suggestion.email || "",
      });
    } else if (value.startsWith("saved:")) {
      const id = Number(value.slice(6));
      const saved = resolution?.saved.find((s) => s.id === id);
      if (saved) setContact(key, { contact_name: saved.contact_name || "", contact_email: saved.email });
    } else if (value === "custom") {
      setContact(key, { contact_name: "", contact_email: "" });
    }
  };

  const sourceLabel = (key: string): string => {
    const sel = contactSel[key] || "custom";
    if (sel === "sam") return "Suggested from SAM.gov — edit if this isn't the right person";
    if (sel.startsWith("saved:")) return "From your saved contacts";
    return "Custom contact";
  };

  const removeVendor = (key: string) => setRemoved((prev) => new Set(prev).add(key));

  const activeSelections = () => selections.filter((s) => !removed.has(rfqVendorKey(s)));

  const vendorDisplayName = (v: RfqManufacturerSelection): string =>
    v.vendor_name || v.cage_code || (isStock(v) ? "Supplier" : "Unknown vendor");

  const validate = (requireContact: boolean): string | null => {
    const active = activeSelections();
    if (active.length === 0) return "Add at least one vendor to send to.";
    for (let i = 0; i < selections.length; i++) {
      if (removed.has(rfqVendorKey(selections[i]))) continue;
      const q = parseFloat(lines[i]?.quantity ?? "");
      if (!q || q <= 0) {
        return `Enter a quantity for "${selections[i].part_number || selections[i].nsn || nsn || vendorDisplayName(selections[i])}".`;
      }
    }
    if (requireContact) {
      for (const v of vendors) {
        if (isStock(v)) continue; // routed through GPH, no address to enter
        const c = contacts[rfqVendorKey(v)];
        if (!c?.contact_email?.trim()) {
          return `Enter a contact email for ${vendorDisplayName(v)}.`;
        }
      }
    }
    return null;
  };

  const buildItems = (withContact: boolean): RfqLineInput[] =>
    selections
      .map((sel, i) => ({ sel, i }))
      .filter(({ sel }) => !removed.has(rfqVendorKey(sel)))
      .map(({ sel, i }) => {
        const line = lines[i];
        const contact = contacts[rfqVendorKey(sel)];
        const effectiveNsn = sel.nsn ?? nsn;
        return {
          cage_code: sel.cage_code,
          rfq_vendor_id: sel.rfq_vendor_id ?? null,
          inventory_listing_id: sel.inventory_listing_id ?? null,
          vendor_name: sel.vendor_name,
          source_part_number: sel.part_number,
          ...(withContact && !isStock(sel)
            ? {
                contact_name: contact?.contact_name || null,
                contact_email: contact?.contact_email?.trim() || null,
              }
            : {}),
          part_id: sel.part_id,
          nsn: effectiveNsn,
          part_number: sel.part_number,
          // The part's own description, so the vendor sees a readable item
          // name next to the part number. The placeholder is only a last
          // resort: a line with no nsn and no part number still needs a
          // description to satisfy chk_rfq_line_item_identifier.
          description:
            sel.description?.trim() ||
            (sel.part_number || effectiveNsn ? null : PLACEHOLDER_LINE_DESCRIPTION),
          quantity: parseFloat(line.quantity),
          unit_of_measure: line.unit_of_measure || null,
          need_by_date: line.need_by_date || null,
          target_unit_price: line.target_unit_price ? parseFloat(line.target_unit_price) : null,
          notes: line.notes || null,
          response_due_date: responseDueDate || null,
          source_solicitation_id: sourceSolicitationId ?? null,
        };
      });

  const persistContacts = async (force = false) => {
    if (!saveContacts && !force) return;
    await Promise.all(
      vendors
        .filter((v) => {
          if (isStock(v)) return false;
          const key = rfqVendorKey(v);
          return contacts[key]?.contact_email?.trim() && contactSel[key] === "custom";
        })
        .map((v) =>
          fetch("/api/rfq/vendor-contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cage_code: v.cage_code,
              rfq_vendor_id: v.rfq_vendor_id ?? null,
              contact_name: contacts[rfqVendorKey(v)]?.contact_name || null,
              email: contacts[rfqVendorKey(v)]?.contact_email?.trim(),
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
          save_contacts: effectiveSaveContacts,
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
      // Batch items don't carry contact info themselves — the vendor's saved
      // default contact is what gets used when the batch is sent later. Any
      // custom contact typed here must be persisted as that default,
      // regardless of the "save for future RFQs" checkbox, or it's silently
      // lost and send_batch() falls back to whatever was previously on file.
      await persistContacts(true);
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
    <Modal isOpen={true} onClose={onClose} title="Create RFQ" size="full" preventClose={submitting}>
      {/* -mx-1 px-1: same as QuoteVendorPickerModal — keeps flush-left inputs'
          focus border/ring from being clipped by the scroll container. */}
      <div className="space-y-5 max-h-[70vh] overflow-y-auto -mx-1 px-1">
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
          const vendorKey = rfqVendorKey(vendor);
          const stock = isStock(vendor);
          const vendorLines = selections
            .map((sel, idx) => ({ sel, idx }))
            .filter(({ sel }) => rfqVendorKey(sel) === vendorKey);
          const contact = contacts[vendorKey] || { contact_name: "", contact_email: "" };
          const resolution = resolutions[vendorKey];
          const hasOptions = (resolution?.saved?.length || 0) > 0 || !!resolution?.suggestion?.email;
          return (
            <div key={vendorKey} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {vendorDisplayName(vendor)}
                  {stock ? (
                    <span className="ml-2 text-xs text-muted">Supplier stock</span>
                  ) : vendor.cage_code ? (
                    <span className="ml-2 text-xs font-mono text-muted">CAGE {vendor.cage_code}</span>
                  ) : (
                    <span className="ml-2 text-xs text-muted">Private vendor</span>
                  )}
                </h3>
                {allVendors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVendor(vendorKey)}
                    className="text-xs text-error hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              {stock && (
                <p className="rounded-md bg-card-bg/50 border border-border/60 px-3 py-2 text-[11px] text-muted">
                  GPH delivers this request to the supplier using the contact
                  details they chose. They stay anonymous unless they reply.
                </p>
              )}

              {/* Recipient picker — vendors only; stock has no address to pick */}
              {!stock && hasOptions && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Recipient</label>
                  <select
                    className={inputClass}
                    value={contactSel[vendorKey] || "custom"}
                    onChange={(e) => onPickContact(vendorKey, e.target.value)}
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

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3${stock ? " hidden" : ""}`}>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Contact name</label>
                  <input
                    className={inputClass}
                    value={contact.contact_name}
                    onChange={(e) => { setContact(vendorKey, { contact_name: e.target.value }); setContactSel((p) => ({ ...p, [vendorKey]: "custom" })); }}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Contact email *</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={contact.contact_email}
                    onChange={(e) => { setContact(vendorKey, { contact_email: e.target.value }); setContactSel((p) => ({ ...p, [vendorKey]: "custom" })); }}
                    placeholder="vendor@example.com"
                  />
                </div>
              </div>
              {!stock && <p className="text-[11px] text-muted">{sourceLabel(vendorKey)}</p>}

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

        {vendors.every(isStock) ? null : anyCustomContact ? (
          <p className="text-xs text-muted">
            Custom contacts are automatically saved as the vendor&apos;s default for future RFQs.
          </p>
        ) : (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={saveContacts} onChange={(e) => setSaveContacts(e.target.checked)} />
            Save entered contacts for future RFQs
          </label>
        )}

        {error && (
          <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
        {!anyStock && (
          <Button variant="outline" size="sm" onClick={handleSaveToBatch} disabled={submitting}>Save to batch</Button>
        )}
        <Button variant="primary" size="sm" onClick={handleSend} disabled={submitting}>
          {submitting ? "Sending…" : "Send now"}
        </Button>
      </div>
    </Modal>
  );
}
