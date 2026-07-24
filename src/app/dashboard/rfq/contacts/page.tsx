"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { VendorContact } from "@/lib/rfq/types";

const inputClass =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

const emptyNew = { cage_code: "", contact_name: "", email: "", phone: "", title: "" };

export default function RfqContactsPage() {
  const { isLoading: authLoading, hasProductAccess } = useAuth();
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(emptyNew);

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
    if (!authLoading && hasProductAccess("request_for_quote")) load();
  }, [authLoading, hasProductAccess, load]);

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

  const saveField = async (c: VendorContact, field: string, value: string) => {
    await patch(c.id, { [field]: value });
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

  const add = async () => {
    if (!adding.cage_code.trim() || !adding.email.trim()) {
      setError("CAGE code and email are required.");
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
        await load();
        setToast("Contact added.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;

  if (!hasProductAccess("request_for_quote")) {
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
        <Link href="/dashboard/rfq" className="text-xs text-primary hover:underline whitespace-nowrap">← All RFQs</Link>
      </div>

      {error && <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>}
      {toast && <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">{toast}</div>}

      {/* Add new */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Add a contact</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input className={inputClass} placeholder="CAGE *" value={adding.cage_code} onChange={(e) => setAdding({ ...adding, cage_code: e.target.value })} />
          <input className={inputClass} placeholder="Name" value={adding.contact_name} onChange={(e) => setAdding({ ...adding, contact_name: e.target.value })} />
          <input className={inputClass} type="email" placeholder="Email *" value={adding.email} onChange={(e) => setAdding({ ...adding, email: e.target.value })} />
          <input className={inputClass} placeholder="Phone" value={adding.phone} onChange={(e) => setAdding({ ...adding, phone: e.target.value })} />
          <input className={inputClass} placeholder="Title" value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} />
        </div>
        <Button variant="primary" size="sm" onClick={add} disabled={busy}>Add contact</Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card-bg p-8 text-center">
          <p className="text-sm text-muted">No saved contacts yet. Add one above, or enter a contact when composing an RFQ.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card-bg/60 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">CAGE</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">Phone</th>
                <th className="px-3 py-2 text-left font-medium">Default</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs text-foreground">{c.cage_code}</td>
                  <td className="px-3 py-2">
                    <input className={inputClass} defaultValue={c.contact_name ?? ""} onBlur={(e) => saveField(c, "contact_name", e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <input className={inputClass} type="email" defaultValue={c.email} onBlur={(e) => saveField(c, "email", e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <input className={inputClass} defaultValue={c.phone ?? ""} onBlur={(e) => saveField(c, "phone", e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    {c.is_default ? (
                      <Badge variant="success" size="sm">Default</Badge>
                    ) : (
                      <button onClick={() => setDefault(c)} disabled={busy} className="text-xs text-primary hover:underline">
                        Set default
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => remove(c.id)} disabled={busy} className="text-xs text-error hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
