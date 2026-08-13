"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_ENTERPRISE_PRODUCT_KEY } from "@/lib/rfq/tier";
import { Button } from "@/components/ui/Button";
import { RowBadge } from "@/components/library/RowBadge";
import { RfqVendorCapabilitiesModal } from "@/components/rfq/RfqVendorCapabilitiesModal";
import { RfqVendorContactEditModal } from "@/components/rfq/RfqVendorContactEditModal";
import { TableCard, tableHeadRowClass } from "@/components/rfq/TableCard";
import {
  MIN_SENDS_FOR_RESPONSIVENESS,
  type RfqVendor,
  type RfqVendorCapabilities,
  type RfqVendorPage,
  type VendorContact,
  type VendorResponsiveness,
} from "@/lib/rfq/types";

const PAGE_SIZE = 50;

const inputClass =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

interface VendorFormState {
  vendor_code: string;
  company_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  notes: string;
}

const emptyVendor: VendorFormState = {
  vendor_code: "", company_name: "", address_line1: "", address_line2: "",
  city: "", state: "", postal_code: "", country: "", phone: "", notes: "",
};

/** Compact one-line capability summary for the book's at-a-glance column.
 * Counts, not values — lists can hold hundreds of entries; the expanded row
 * shows the real lists. FSCs are the exception (few, short, and the most
 * informative at a glance). */
function capabilitySummary(v: RfqVendor): string | null {
  const c = v.capabilities;
  if (!c) return null;
  const more = (s: { total: number; sample: string[] }) =>
    s.total > s.sample.length ? ` +${s.total - s.sample.length}` : "";
  const parts: string[] = [];
  if (c.cages.total) parts.push(`${c.cages.total} CAGE${c.cages.total !== 1 ? "s" : ""}`);
  if (c.niins.total) parts.push(`${c.niins.total} NSN${c.niins.total !== 1 ? "s" : ""}`);
  if (c.fscs.total) parts.push(`FSC ${c.fscs.sample.join(", ")}${more(c.fscs)}`);
  if (c.keywords.total) parts.push(`${c.keywords.total} keyword${c.keywords.total !== 1 ? "s" : ""}`);
  if (c.statuses.total) parts.push(`${c.statuses.sample.join(", ")}${more(c.statuses)}`);
  return parts.length ? parts.join(" · ") : null;
}

function vendorToForm(v: RfqVendor): VendorFormState {
  return {
    vendor_code: v.vendor_code || "",
    company_name: v.company_name,
    address_line1: v.address_line1 || "",
    address_line2: v.address_line2 || "",
    city: v.city || "",
    state: v.state || "",
    postal_code: v.postal_code || "",
    country: v.country || "",
    phone: v.phone || "",
    notes: v.notes || "",
  };
}

function formToPayload(f: VendorFormState) {
  return {
    vendor_code: f.vendor_code.trim() || null,
    company_name: f.company_name.trim(),
    address_line1: f.address_line1.trim() || null,
    address_line2: f.address_line2.trim() || null,
    city: f.city.trim() || null,
    state: f.state.trim() || null,
    postal_code: f.postal_code.trim() || null,
    country: f.country.trim() || null,
    phone: f.phone.trim() || null,
    notes: f.notes.trim() || null,
  };
}

/**
 * Private vendor book (rfq_vendors — Enterprise): the customer's own vendor
 * list, CAGE or not, with per-vendor contacts. Selectable alongside
 * manufacturers when sending RFQs from the work queue.
 */
export default function RfqVendorsPage() {
  const { isLoading: authLoading, hasAnyProductAccess } = useAuth();
  const hasEnterprise = hasAnyProductAccess([RFQ_ENTERPRISE_PRODUCT_KEY]);

  const [vendors, setVendors] = useState<RfqVendor[]>([]);
  const [total, setTotal] = useState(0);
  const [showInactive, setShowInactive] = useState(false);
  // Server-side search + paging — the book can hold thousands of vendors.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [capabilitiesVendor, setCapabilitiesVendor] = useState<RfqVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Add/edit vendor form (inline card at top when adding; per-vendor when editing).
  const [addingOpen, setAddingOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [form, setForm] = useState<VendorFormState>(emptyVendor);
  const [busy, setBusy] = useState(false);

  // Per-vendor "add contact" drafts.
  const [contactDrafts, setContactDrafts] = useState<Record<number, { name: string; email: string }>>({});
  // Expanded table rows (contacts + address + inline edit form live there).
  const [expandedVendors, setExpandedVendors] = useState<Set<number>>(new Set());

  // Full capability lists per vendor, lazy-fetched on first expand (the
  // column shows counts only; lists can hold hundreds of entries).
  const [capsByVendor, setCapsByVendor] = useState<Record<number, { loading: boolean; caps: RfqVendorCapabilities | null }>>({});

  const fetchCapabilities = useCallback(async (vendorId: number) => {
    setCapsByVendor((prev) => ({ ...prev, [vendorId]: { loading: true, caps: null } }));
    try {
      const res = await fetch(`/api/rfq/vendors/${vendorId}/capabilities`);
      const body = await res.json().catch(() => null);
      setCapsByVendor((prev) => ({
        ...prev,
        [vendorId]: { loading: false, caps: res.ok ? (body as RfqVendorCapabilities) : null },
      }));
    } catch {
      setCapsByVendor((prev) => ({ ...prev, [vendorId]: { loading: false, caps: null } }));
    }
  }, []);

  const toggleVendor = (id: number) => {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!expandedVendors.has(id) && !capsByVendor[id]) fetchCapabilities(id);
  };
  const [editingContact, setEditingContact] = useState<VendorContact | null>(null);

  // Responsiveness over every vendor the customer has sent to (CAGE and
  // private), most-responsive first.
  const [stats, setStats] = useState<VendorResponsiveness[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (showInactive) params.set("include_inactive", "true");
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/rfq/vendors?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load vendors.");
      } else {
        const pageData = data as RfqVendorPage;
        setVendors(pageData.vendors);
        setTotal(pageData.total);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [showInactive, debouncedSearch, page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [showInactive]);

  useEffect(() => {
    if (!authLoading && hasEnterprise) load();
  }, [authLoading, hasEnterprise, load]);

  useEffect(() => {
    if (authLoading || !hasEnterprise) return;
    (async () => {
      try {
        const res = await fetch("/api/rfq/vendor-stats");
        if (res.ok) setStats((await res.json()) as VendorResponsiveness[]);
      } catch { /* soft */ }
    })();
  }, [authLoading, hasEnterprise]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const saveVendor = async () => {
    if (!form.company_name.trim()) {
      setError("Company name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const isEdit = editingVendorId != null;
      const res = await fetch(isEdit ? `/api/rfq/vendors/${editingVendorId}` : "/api/rfq/vendors", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save vendor.");
        return;
      }
      setToast(isEdit ? "Vendor updated." : "Vendor added.");
      setAddingOpen(false);
      setEditingVendorId(null);
      setForm(emptyVendor);
      load();
    } catch {
      setError("Network error saving vendor.");
    } finally {
      setBusy(false);
    }
  };

  const removeVendor = async (v: RfqVendor) => {
    if (!confirm(`Delete ${v.company_name}? If RFQs were sent to this vendor it is deactivated instead (send history is kept).`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rfq/vendors/${v.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete vendor.");
        return;
      }
      setToast(data.deleted ? "Vendor deleted." : "Vendor deactivated (send history kept).");
      load();
    } catch {
      setError("Network error deleting vendor.");
    } finally {
      setBusy(false);
    }
  };

  const reactivateVendor = async (v: RfqVendor) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/rfq/vendors/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      if (res.ok) {
        setToast("Vendor reactivated.");
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const addContact = async (v: RfqVendor) => {
    const draft = contactDrafts[v.id];
    if (!draft?.email?.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rfq/vendor-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfq_vendor_id: v.id,
          contact_name: draft.name.trim() || null,
          email: draft.email.trim(),
          is_default: v.contacts.length === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add contact.");
        return;
      }
      setContactDrafts((prev) => ({ ...prev, [v.id]: { name: "", email: "" } }));
      setToast("Contact added.");
      load();
    } catch {
      setError("Network error adding contact.");
    } finally {
      setBusy(false);
    }
  };

  const deleteContact = async (c: VendorContact) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/rfq/vendor-contacts/${c.id}`, { method: "DELETE" });
      if (res.ok) {
        setToast("Contact removed.");
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const vendorForm = (title: string, onCancel: () => void) => (
    <div className="bg-card-bg rounded-xl border border-primary/40 p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Company name *</label>
          <input className={inputClass} value={form.company_name}
            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Identifier
            <span className="ml-1 font-normal normal-case">(CAGE, UEI, DUNS, or your own code)</span>
          </label>
          <input className={inputClass} value={form.vendor_code} maxLength={16}
            onChange={(e) => setForm((f) => ({ ...f, vendor_code: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Address line 1</label>
          <input className={inputClass} value={form.address_line1}
            onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Address line 2</label>
          <input className={inputClass} value={form.address_line2}
            onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-muted mb-1">City</label>
            <input className={inputClass} value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">State</label>
            <input className={inputClass} value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">ZIP</label>
            <input className={inputClass} value={form.postal_code}
              onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Country</label>
            <input className={inputClass} value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Phone</label>
            <input className={inputClass} value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Notes</label>
        <textarea className={`${inputClass} min-h-[60px] resize-y`} value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </div>
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={saveVendor} disabled={busy}>
          {busy ? "Saving…" : "Save vendor"}
        </Button>
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasEnterprise) {
    return (
      <AccessDeniedPage
        featureName="Private Vendors"
        featureKey="request_for_quote_enterprise"
        description="Your own private vendor list requires the RFQ Enterprise Add-on."
        benefits={[
          "Track vendors that aren't in SAM.gov — no CAGE required",
          "Keep the right contact per vendor for one-click RFQs",
          "Quote private vendors alongside approved-source manufacturers",
        ]}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Private Vendors</h1>
          <p className="text-muted mt-1 text-sm">
            Your company&apos;s own vendor list. These vendors appear alongside a part&apos;s
            manufacturers when you send RFQs from the work queue.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            className={`${inputClass} !w-56`}
            type="search"
            placeholder="Search name or identifier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show deactivated
          </label>
          {!addingOpen && (
            <Button variant="primary" size="sm" onClick={() => { setForm(emptyVendor); setEditingVendorId(null); setAddingOpen(true); }}>
              + Add Vendor
            </Button>
          )}
        </div>
      </div>

      {toast && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary">{toast}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/5 px-4 py-2.5 text-sm text-error">{error}</div>
      )}

      {addingOpen && vendorForm("New vendor", () => setAddingOpen(false))}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : vendors.length === 0 && !addingOpen ? (
        <div className="text-center py-20 text-sm text-muted">
          {debouncedSearch
            ? `No vendors match "${debouncedSearch}".`
            : "No private vendors yet. Add the suppliers you work with outside SAM.gov."}
        </div>
      ) : (
        <TableCard className="overflow-x-auto mt-4">
          <table className="w-full text-xs">
            <thead>
              <tr className={`${tableHeadRowClass} text-[10px] font-semibold uppercase tracking-wide text-muted`}>
                <th className="px-2 py-2 w-8" aria-label="Expand" />
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Identifier</th>
                <th className="px-3 py-2">Contacts</th>
                <th className="px-3 py-2">Capabilities</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2 text-right" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vendors.map((v) => {
                const isOpen = expandedVendors.has(v.id);
                const defaultContact = v.contacts.find((c) => c.is_default) || v.contacts[0] || null;
                const location = [v.city, v.state].filter(Boolean).join(", ");
                return (
                  <Fragment key={v.id}>
                    <tr className={`hover:bg-primary/8 transition-colors ${!v.is_active ? "opacity-60" : ""}`}>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleVendor(v.id)}
                          className="text-muted hover:text-foreground"
                          aria-label={isOpen ? "Collapse" : "Expand"}
                        >
                          <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => toggleVendor(v.id)}
                          className="text-sm font-medium text-card-foreground hover:text-primary text-left">
                          {v.company_name}
                        </button>
                        {!v.is_active && <RowBadge className="ml-2">Deactivated</RowBadge>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted">{v.vendor_code || "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        {v.contacts.length === 0 ? (
                          <span className="text-amber-700 font-medium">none</span>
                        ) : (
                          <span className="text-card-foreground">
                            {defaultContact?.email}
                            {v.contacts.length > 1 && (
                              <span className="text-muted"> +{v.contacts.length - 1} more</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[260px]">
                        {(() => {
                          const summary = capabilitySummary(v);
                          return (
                            <button
                              type="button"
                              onClick={() => setCapabilitiesVendor(v)}
                              className={`text-left hover:underline ${summary ? "text-card-foreground" : "text-muted italic"}`}
                              title={summary ? `${summary} — click to edit` : "No capabilities yet — click to add. Capabilities drive the suggested-vendor list when sending RFQs."}
                            >
                              <span className="line-clamp-2">{summary || "none — add"}</span>
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">{v.phone || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted">{location || "—"}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap text-xs">
                        {v.is_active ? (
                          <>
                            <button type="button" className="text-primary hover:underline"
                              onClick={() => setCapabilitiesVendor(v)}
                              title="What this vendor can supply — drives the suggested list when sending RFQs">
                              Capabilities
                            </button>
                            <button type="button" className="ml-3 text-primary hover:underline"
                              onClick={() => { setForm(vendorToForm(v)); setEditingVendorId(v.id); setAddingOpen(false); setExpandedVendors((prev) => new Set(prev).add(v.id)); }}>
                              Edit
                            </button>
                            <button type="button" className="ml-3 text-error hover:underline" onClick={() => removeVendor(v)}>
                              Delete
                            </button>
                          </>
                        ) : (
                          <button type="button" className="text-primary hover:underline" onClick={() => reactivateVendor(v)}>
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted-light/30">
                        <td colSpan={8} className="px-6 py-4">
                          {editingVendorId === v.id ? (
                            vendorForm(`Edit ${v.company_name}`, () => { setEditingVendorId(null); setForm(emptyVendor); })
                          ) : (
                            <div className="space-y-3">
                              {(v.address_line1 || v.city || v.notes) && (
                                <div className="text-xs text-muted">
                                  {[v.address_line1, v.address_line2, [v.city, v.state, v.postal_code].filter(Boolean).join(" "), v.country]
                                    .filter(Boolean)
                                    .join(", ")}
                                  {v.notes && <div className="mt-1 italic">{v.notes}</div>}
                                </div>
                              )}

                              <div>
                                <div className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Capabilities</div>
                                {(() => {
                                  const state = capsByVendor[v.id];
                                  if (!state || state.loading) {
                                    return <p className="text-xs text-muted mb-2">Loading…</p>;
                                  }
                                  const caps = state.caps;
                                  const groups: { label: string; values: string[] }[] = caps
                                    ? [
                                        { label: "CAGEs represented", values: caps.cages },
                                        { label: "NSNs / NIINs", values: caps.niins },
                                        { label: "Supply classes", values: caps.fscs },
                                        { label: "Keywords", values: caps.keywords },
                                        { label: "Statuses", values: caps.statuses },
                                      ].filter((g) => g.values.length > 0)
                                    : [];
                                  const MAX_CHIPS = 40;
                                  return (
                                    <div className="space-y-1.5 mb-3">
                                      {groups.length === 0 && (
                                        <p className="text-xs text-muted italic">
                                          None yet — capabilities drive the suggested-vendor list when sending RFQs.
                                        </p>
                                      )}
                                      {groups.map((g) => (
                                        <div key={g.label} className="flex items-baseline gap-2 text-xs">
                                          <span className="text-muted whitespace-nowrap">{g.label}:</span>
                                          <span className="flex flex-wrap gap-1">
                                            {g.values.slice(0, MAX_CHIPS).map((val) => (
                                              <span key={val} className="inline-flex px-1.5 py-0.5 rounded bg-muted/10 text-card-foreground font-mono">
                                                {val}
                                              </span>
                                            ))}
                                            {g.values.length > MAX_CHIPS && (
                                              <span className="text-muted">+{g.values.length - MAX_CHIPS} more</span>
                                            )}
                                          </span>
                                        </div>
                                      ))}
                                      {v.is_active && (
                                        <button
                                          type="button"
                                          className="text-xs text-primary hover:underline"
                                          onClick={() => setCapabilitiesVendor(v)}
                                        >
                                          Edit capabilities
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}

                                <div className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Contacts</div>
                                {v.contacts.length === 0 ? (
                                  <p className="text-xs text-muted italic mb-2">
                                    No contacts — add one so RFQs to this vendor have somewhere to go.
                                  </p>
                                ) : (
                                  <ul className="space-y-1 mb-2">
                                    {v.contacts.map((c) => (
                                      <li key={c.id} className="flex items-center gap-2 text-sm">
                                        <span className="text-card-foreground">
                                          {c.contact_name ? `${c.contact_name} — ` : ""}{c.email}
                                        </span>
                                        {c.is_default && <RowBadge>default</RowBadge>}
                                        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setEditingContact(c)}>
                                          Edit
                                        </button>
                                        <button type="button" className="text-xs text-error hover:underline" onClick={() => deleteContact(c)}>
                                          Remove
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {v.is_active && (
                                  <form
                                    className="flex items-center gap-2 max-w-md"
                                    onSubmit={(e) => { e.preventDefault(); addContact(v); }}
                                  >
                                    <input className={inputClass} placeholder="Name (optional)"
                                      value={contactDrafts[v.id]?.name || ""}
                                      onChange={(e) => setContactDrafts((prev) => ({ ...prev, [v.id]: { name: e.target.value, email: prev[v.id]?.email || "" } }))} />
                                    <input className={inputClass} type="email" placeholder="email@vendor.com"
                                      value={contactDrafts[v.id]?.email || ""}
                                      onChange={(e) => setContactDrafts((prev) => ({ ...prev, [v.id]: { name: prev[v.id]?.name || "", email: e.target.value } }))} />
                                    <Button type="submit" variant="outline" size="sm" disabled={busy || !(contactDrafts[v.id]?.email || "").trim()}>
                                      Add
                                    </Button>
                                  </form>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}

      {!loading && total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            {total.toLocaleString()} vendor{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-muted">Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Vendor responsiveness — every vendor ever sent to (CAGE + private),
          most responsive first. Rows below the minimum-sends floor still
          show, marked as low-signal. */}
      {stats.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-1">Vendor responsiveness</h2>
          <p className="text-xs text-muted mb-3">
            Last 12 months, across all RFQs your team has sent. Who answers, how often, and how fast.
          </p>
          <TableCard className="overflow-x-auto !p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className={`${tableHeadRowClass} text-[10px] font-semibold uppercase tracking-wide text-muted`}>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2 text-right">RFQs sent</th>
                  <th className="px-3 py-2 text-right">Responded</th>
                  <th className="px-3 py-2 text-right">Declined</th>
                  <th className="px-3 py-2 text-right">No answer</th>
                  <th className="px-3 py-2 text-right">Response rate</th>
                  <th className="px-3 py-2 text-right">Median turnaround</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.map((s, i) => (
                  <tr key={i} className={s.rfqs_sent < MIN_SENDS_FOR_RESPONSIVENESS ? "opacity-60" : undefined}>
                    <td className="px-3 py-2">
                      <span className="text-card-foreground">{s.vendor_name || s.cage_code || "Vendor"}</span>
                      {s.cage_code && <span className="ml-2 text-[11px] font-mono text-muted">CAGE {s.cage_code}</span>}
                      {s.rfq_vendor_id != null && <RowBadge className="ml-2">Private</RowBadge>}
                      {s.rfqs_sent < MIN_SENDS_FOR_RESPONSIVENESS && (
                        <span className="ml-2 text-[11px] text-muted italic">low sample</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{s.rfqs_sent}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{s.responded}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{s.declined}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{s.unanswered}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {Math.round(s.response_rate * 100)}%
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {s.median_turnaround_days != null ? `${s.median_turnaround_days}d` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>
      )}

      <RfqVendorContactEditModal
        isOpen={editingContact !== null}
        contact={editingContact}
        onClose={() => setEditingContact(null)}
        onSaved={() => { setEditingContact(null); setToast("Contact updated."); load(); }}
      />

      <RfqVendorCapabilitiesModal
        isOpen={capabilitiesVendor !== null}
        vendor={capabilitiesVendor}
        onClose={() => setCapabilitiesVendor(null)}
        onSaved={(message) => {
          const savedId = capabilitiesVendor?.id;
          setCapabilitiesVendor(null);
          setToast(message);
          load();
          // Refresh the expanded-row lists too, if that vendor is open.
          if (savedId != null) fetchCapabilities(savedId);
        }}
      />
    </div>
  );
}
