"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_SENDER_KEYS } from "@/lib/rfq/tier";
import { Button } from "@/components/ui/Button";
import { RowBadge } from "@/components/library/RowBadge";
import { RfqVendorContactEditModal } from "@/components/rfq/RfqVendorContactEditModal";
import {
  TableCard, rowClass, tableClass, tableHeadRowClass, tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";
import type { VendorContact } from "@/lib/rfq/types";

// The add row's required fields, in render order. One list drives the
// asterisks, the highlight and the error message, so they cannot disagree.
const REQUIRED_FIELDS = [
  { key: "cage_code", label: "CAGE / Private Vendor" },
  { key: "contact_name", label: "Name" },
  { key: "email", label: "Email" },
] as const;
type RequiredKey = (typeof REQUIRED_FIELDS)[number]["key"];

const MISSING_CLASS = "border-error focus:border-error";

const inputClass =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

const emptyNew = { cage_code: "", contact_name: "", email: "", phone: "", title: "" };

export default function RfqContactsPage() {
  const { isLoading: authLoading, hasAnyProductAccess } = useAuth();
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(emptyNew);
  // Empty required fields from the last attempted add. Set on submit rather
  // than on blur so an untouched form is never pre-scolded.
  const [missingFields, setMissingFields] = useState<RequiredKey[]>([]);
  const [editingContact, setEditingContact] = useState<VendorContact | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rfq/vendor-contacts");
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load contacts.");
      else setContacts(data as VendorContact[]);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && hasAnyProductAccess(RFQ_SENDER_KEYS)) load();
  }, [authLoading, hasAnyProductAccess, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const patch = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/rfq/vendor-contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Update failed.");
      return false;
    }
    return true;
  };

  const setDefault = async (c: VendorContact) => {
    setBusy(true);
    if (await patch(c.id, { is_default: true })) {
      await load();
      setToast("Default contact updated.");
    }
    setBusy(false);
  };

  const remove = async (id: number) => {
    setBusy(true);
    const res = await fetch(`/api/rfq/vendor-contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setToast("Contact deleted.");
    } else {
      setError("Delete failed.");
    }
    setBusy(false);
  };

  // Typing into a flagged field clears its own warning immediately, so the
  // red does not sit there while the user is busy fixing it.
  const setField = (key: keyof typeof emptyNew, value: string) => {
    setAdding((prev) => ({ ...prev, [key]: value }));
    setMissingFields((prev) => prev.filter((k) => k !== key));
  };

  const add = async () => {
    // Mark the specific empty fields rather than only stating the rule: the
    // add row is five inputs wide, and a message alone leaves the user to
    // work out which of them it means.
    const missing = REQUIRED_FIELDS.filter((f) => !adding[f.key].trim()).map((f) => f.key);
    setMissingFields(missing);
    if (missing.length > 0) {
      const labels = REQUIRED_FIELDS.filter((f) => missing.includes(f.key)).map((f) => f.label);
      setError(
        labels.length === 1
          ? `${labels[0]} is required.`
          : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]} are required.`
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rfq/vendor-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cage_code: adding.cage_code.trim().toUpperCase(),
          contact_name: adding.contact_name || null,
          email: adding.email.trim(),
          phone: adding.phone || null,
          title: adding.title || null,
          is_default: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to add contact.");
      else {
        setAdding(emptyNew);
        setMissingFields([]);
        await load();
        setToast("Contact added.");
      }
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
        description="Keep a private address book of the right contacts at each vendor."
        benefits={["Save the right person per vendor", "Reused as the default when sending RFQs"]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Contacts</h1>
          <p className="text-muted mt-1 text-sm">
            Your private contact book. The default contact for a vendor pre-fills when you send an RFQ. SAM.gov is used only as a fallback.
          </p>
        </div>
        <Link href="/rfq" className="text-xs text-primary hover:underline whitespace-nowrap">← All RFQs</Link>
      </div>

      {error && <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>}
      {toast && <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">{toast}</div>}

      {/* Add new */}
      <div className="bg-card-bg rounded-lg border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Add a contact</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input className={`${inputClass} ${missingFields.includes("cage_code") ? MISSING_CLASS : ""}`} aria-required="true" aria-invalid={missingFields.includes("cage_code")} placeholder="CAGE / Private Vendor *" value={adding.cage_code} onChange={(e) => setField("cage_code", e.target.value)} />
          <input className={`${inputClass} ${missingFields.includes("contact_name") ? MISSING_CLASS : ""}`} aria-required="true" aria-invalid={missingFields.includes("contact_name")} placeholder="Name *" value={adding.contact_name} onChange={(e) => setField("contact_name", e.target.value)} />
          <input className={`${inputClass} ${missingFields.includes("email") ? MISSING_CLASS : ""}`} type="email" aria-required="true" aria-invalid={missingFields.includes("email")} placeholder="Email *" value={adding.email} onChange={(e) => setField("email", e.target.value)} />
          <input className={inputClass} placeholder="Phone" value={adding.phone} onChange={(e) => setField("phone", e.target.value)} />
          <input className={inputClass} placeholder="Title" value={adding.title} onChange={(e) => setField("title", e.target.value)} />
        </div>
        <Button variant="primary" size="sm" onClick={add} disabled={busy}>Add contact</Button>
      </div>

      <TableCard header={<h2 className="text-sm font-semibold text-foreground">Saved contacts</h2>}>
      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted">No saved contacts yet. Add one above, or enter a contact when composing an RFQ.</p>
        </div>
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={thClass}>CAGE / ID</th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Phone</th>
                <th className={thClass}>Title</th>
                <th className={thClass}>Default</th>
                <th className="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className={rowClass}>
                  <td className={`${tdClass} font-mono text-xs text-foreground`}>
                    {/* CAGE vendors show their CAGE; private-vendor contacts
                        show the vendor's own identifier (which may itself be
                        a CAGE), with the company name on hover. */}
                    {c.cage_code || (
                      <span title={c.vendor_company_name || undefined}>
                        {c.vendor_code || "—"}
                        <span className="ml-1 font-sans text-muted">(private)</span>
                      </span>
                    )}
                  </td>
                  <td className={`${tdClass} text-foreground`}>{c.contact_name || "—"}</td>
                  <td className={`${tdClass} text-foreground`}>{c.email}</td>
                  <td className={`${tdClass} text-foreground`}>{c.phone || "—"}</td>
                  <td className={`${tdClass} text-foreground`}>{c.title || "—"}</td>
                  <td className={tdClass}>
                    {c.is_default ? (
                      <RowBadge tone="green">Default</RowBadge>
                    ) : (
                      <button onClick={() => setDefault(c)} disabled={busy} className="text-xs text-primary hover:underline">
                        Set default
                      </button>
                    )}
                  </td>
                  <td className={`${tdClass} text-right whitespace-nowrap`}>
                    <button onClick={() => setEditingContact(c)} disabled={busy} className="text-xs text-primary hover:underline mr-3">
                      Edit
                    </button>
                    <button onClick={() => remove(c.id)} disabled={busy} className="text-xs text-error hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </TableCard>

      <RfqVendorContactEditModal
        isOpen={editingContact !== null}
        contact={editingContact}
        onClose={() => setEditingContact(null)}
        onSaved={(updated) => {
          setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setEditingContact(null);
          setToast("Contact updated.");
        }}
      />
    </div>
  );
}
