"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { useCodeDefinitions } from "@/lib/hooks/useCodeDefinitions";
import {
  tableWrapClass, tableClass, tableHeadRowClass, thClass, tdClass, rowClass,
} from "@/components/rfq/TableCard";

// ---------------------------------------------------------------------------
// Types (mirror the FastAPI CompanyProfileResponse)
// ---------------------------------------------------------------------------

interface AddressBlock {
  line_1: string | null;
  line_2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country_code: string | null;
}
interface PocBlock {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
}
interface Demographics {
  legal_business_name: string | null;
  dba_name: string | null;
  entity_url: string | null;
  physical_address: AddressBlock;
  mailing_address: AddressBlock;
  poc: PocBlock;
  is_overridden: Record<string, boolean>;
}
interface SamOriginal {
  legal_business_name: string | null;
  dba_name: string | null;
  entity_url: string | null;
  physical_address: AddressBlock;
  mailing_address: AddressBlock;
  poc: PocBlock;
}
interface CompanyContact {
  source: string;
  source_key: string;
  contact_type: string | null;
  is_hidden: boolean;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  is_overridden: boolean;
}
interface CompanyCertification {
  id: number;
  kind: string;
  label: string;
  code: string | null;
  value: string | null;
  issued_date: string | null;
  expires_date: string | null;
  display_order: number;
  is_visible: boolean;
}
interface CompanyProfile {
  customer_id: number;
  cage_code: string;
  demographics: Demographics;
  sam_original: SamOriginal;
  contacts: CompanyContact[];
  certifications: CompanyCertification[];
}

// Both set-asides and certifications come from the canonical `code_definitions`
// table (code_type SET_ASIDE / CERTIFICATION) via useCodeDefinitions — see
// AddCertificationForm.

// ---------------------------------------------------------------------------

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const resp = await fetchWithAuth("/api/company/profile");
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Failed to load company profile");
        return;
      }
      setProfile(data);
      setError(null);
    } catch {
      setError("An unexpected error occurred while loading your company profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return (
    <div className="w-full">
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/account" className="text-muted hover:text-primary transition-colors">
              Account
            </Link>
          </li>
          <li className="text-muted">/</li>
          <li className="text-foreground font-medium">Company Profile</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">Company Profile</h1>
        <p className="text-muted mt-1">
          Correct your SAM.gov demographics, choose which contacts appear in vendor search, and publish
          your certifications. These changes show in our public vendor search — your SAM.gov registration is not modified.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-muted text-sm">Loading…</div>
      ) : profile ? (
        <div className="space-y-10">
          <DemographicsSection profile={profile} onSaved={loadProfile} />
          <ContactsSection profile={profile} onChanged={loadProfile} />
          <CertificationsSection profile={profile} onChanged={loadProfile} />
        </div>
      ) : null}
    </div>
  );
}

// ===========================================================================
// Demographics
// ===========================================================================

// The SAM.gov original, shown only when the field has been overridden away
// from it. It used to print on every field that had a SAM value at all, which
// on an unedited profile means restating the input directly above it — 14
// redundant lines, and the one case that matters (this field no longer matches
// SAM, here is what clearing it reverts to) read the same as the 13 that
// didn't. Comparison is trimmed because ovField trims before deciding whether
// to send an override, so a whitespace-only difference is not one.
function SamHint({ value, current }: { value: string | null; current: string | null }) {
  if (!value) return null;
  if ((current || "").trim() === value.trim()) return null;
  return <p className="text-xs text-muted mt-1">SAM.gov: {value}</p>;
}

function DemographicsSection({ profile, onSaved }: { profile: CompanyProfile; onSaved: () => void }) {
  const d = profile.demographics;
  const sam = profile.sam_original;

  const [form, setForm] = useState(d);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setForm(profile.demographics), [profile]);

  const setTop = (k: "legal_business_name" | "dba_name" | "entity_url", v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setAddr = (group: "physical_address" | "mailing_address", k: keyof AddressBlock, v: string) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [k]: v } }));
  const setPoc = (k: keyof PocBlock, v: string) =>
    setForm((f) => ({ ...f, poc: { ...f.poc, [k]: v } }));

  // Emit an override field only when it differs from the SAM original; equal or
  // empty -> null (clears the override so it reverts to SAM).
  const ovField = (current: string | null, original: string | null): string | null => {
    const c = (current || "").trim();
    if (!c || c === (original || "").trim()) return null;
    return c;
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setErr(null);
    const payload: Record<string, string | null> = {
      override_legal_business_name: ovField(form.legal_business_name, sam.legal_business_name),
      override_dba_name: ovField(form.dba_name, sam.dba_name),
      override_entity_url: ovField(form.entity_url, sam.entity_url),
      override_physical_address_line_1: ovField(form.physical_address.line_1, sam.physical_address.line_1),
      override_physical_address_line_2: ovField(form.physical_address.line_2, sam.physical_address.line_2),
      override_physical_address_city: ovField(form.physical_address.city, sam.physical_address.city),
      override_physical_address_state: ovField(form.physical_address.state, sam.physical_address.state),
      override_physical_address_zip: ovField(form.physical_address.zip, sam.physical_address.zip),
      override_physical_address_country_code: ovField(form.physical_address.country_code, sam.physical_address.country_code),
      override_mailing_address_line_1: ovField(form.mailing_address.line_1, sam.mailing_address.line_1),
      override_mailing_address_line_2: ovField(form.mailing_address.line_2, sam.mailing_address.line_2),
      override_mailing_address_city: ovField(form.mailing_address.city, sam.mailing_address.city),
      override_mailing_address_state: ovField(form.mailing_address.state, sam.mailing_address.state),
      override_mailing_address_zip: ovField(form.mailing_address.zip, sam.mailing_address.zip),
      override_mailing_address_country_code: ovField(form.mailing_address.country_code, sam.mailing_address.country_code),
      override_poc_first_name: ovField(form.poc.first_name, sam.poc.first_name),
      override_poc_last_name: ovField(form.poc.last_name, sam.poc.last_name),
      override_poc_email: ovField(form.poc.email, sam.poc.email),
      override_poc_phone: ovField(form.poc.phone, sam.poc.phone),
      override_poc_title: ovField(form.poc.title, sam.poc.title),
    };
    try {
      const resp = await fetchWithAuth("/api/company/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErr(data.error || "Failed to save demographics");
        return;
      }
      setSuccess(true);
      onSaved();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setErr("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-secondary">Demographics</h2>
          <p className="text-sm text-muted">CAGE {profile.cage_code} · leave a field matching SAM.gov to keep the original.</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-sm font-medium text-success">
          Demographics saved.
        </div>
      )}
      {err && <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{err}</div>}

      <div className="bg-card-bg rounded-xl border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <Input label="Legal Business Name" value={form.legal_business_name || ""} onChange={(e) => setTop("legal_business_name", e.target.value)} disabled={saving} />
            <SamHint value={sam.legal_business_name} current={form.legal_business_name} />
          </div>
          <div>
            <Input label="DBA Name" value={form.dba_name || ""} onChange={(e) => setTop("dba_name", e.target.value)} disabled={saving} />
            <SamHint value={sam.dba_name} current={form.dba_name} />
          </div>
          <div>
            <Input label="Website" placeholder="https://example.com" value={form.entity_url || ""} onChange={(e) => setTop("entity_url", e.target.value)} disabled={saving} />
            <SamHint value={sam.entity_url} current={form.entity_url} />
          </div>
        </div>

        <AddressFields title="Physical Address" group="physical_address" addr={form.physical_address} sam={sam.physical_address} onChange={setAddr} disabled={saving} />
        <AddressFields title="Mailing Address" group="mailing_address" addr={form.mailing_address} sam={sam.mailing_address} onChange={setAddr} disabled={saving} />

        <div>
          <h3 className="text-sm font-semibold text-secondary mb-2">Point of Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Input label="First Name" value={form.poc.first_name || ""} onChange={(e) => setPoc("first_name", e.target.value)} disabled={saving} /><SamHint value={sam.poc.first_name} current={form.poc.first_name} /></div>
            <div><Input label="Last Name" value={form.poc.last_name || ""} onChange={(e) => setPoc("last_name", e.target.value)} disabled={saving} /><SamHint value={sam.poc.last_name} current={form.poc.last_name} /></div>
            <div><Input label="Title" value={form.poc.title || ""} onChange={(e) => setPoc("title", e.target.value)} disabled={saving} /><SamHint value={sam.poc.title} current={form.poc.title} /></div>
            <div><Input label="Email" type="email" value={form.poc.email || ""} onChange={(e) => setPoc("email", e.target.value)} disabled={saving} /></div>
            <div><Input label="Phone" value={form.poc.phone || ""} onChange={(e) => setPoc("phone", e.target.value)} disabled={saving} /></div>
          </div>
        </div>

        <div className="pt-1">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Demographics"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function AddressFields({
  title, group, addr, sam, onChange, disabled,
}: {
  title: string;
  group: "physical_address" | "mailing_address";
  addr: AddressBlock;
  sam: AddressBlock;
  onChange: (group: "physical_address" | "mailing_address", k: keyof AddressBlock, v: string) => void;
  disabled: boolean;
}) {
  return (
    // Four across on lg: the two street lines pair off on one row and
    // city/state/ZIP/country fill the next, so an address block is two rows
    // instead of four. State, ZIP and country are short enough that a quarter
    // column is more than they need.
    <div>
      <h3 className="text-sm font-semibold text-secondary mb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sm:col-span-2"><Input label="Address Line 1" value={addr.line_1 || ""} onChange={(e) => onChange(group, "line_1", e.target.value)} disabled={disabled} /><SamHint value={sam.line_1} current={addr.line_1} /></div>
        <div className="sm:col-span-2"><Input label="Address Line 2" value={addr.line_2 || ""} onChange={(e) => onChange(group, "line_2", e.target.value)} disabled={disabled} /></div>
        <div><Input label="City" value={addr.city || ""} onChange={(e) => onChange(group, "city", e.target.value)} disabled={disabled} /><SamHint value={sam.city} current={addr.city} /></div>
        <div><Input label="State" value={addr.state || ""} onChange={(e) => onChange(group, "state", e.target.value)} disabled={disabled} /><SamHint value={sam.state} current={addr.state} /></div>
        <div><Input label="ZIP" value={addr.zip || ""} onChange={(e) => onChange(group, "zip", e.target.value)} disabled={disabled} /><SamHint value={sam.zip} current={addr.zip} /></div>
        <div><Input label="Country Code" value={addr.country_code || ""} onChange={(e) => onChange(group, "country_code", e.target.value)} disabled={disabled} /><SamHint value={sam.country_code} current={addr.country_code} /></div>
      </div>
    </div>
  );
}

// ===========================================================================
// Contacts
// ===========================================================================

// Row actions are inline text links, matching /account/contacts and
// /account/users — a table row is too tight for the Button component's md
// padding, and three of them per row was most of why these sections read as a
// different product. `disabled` is styled here because these fire requests and
// go inert while one is in flight.
const rowActionClass =
  "text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed";
const rowActionDangerClass =
  "text-error hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed";

// colSpan for the contact edit form. Keep in step with the <thead> below.
const CONTACT_COLUMNS = 7;


function ContactsSection({ profile, onChanged }: { profile: CompanyProfile; onChanged: () => void }) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const mutate = async (key: string, fn: () => Promise<Response>) => {
    setBusyKey(key);
    setErr(null);
    try {
      const resp = await fn();
      if (!resp.ok && resp.status !== 204) {
        const data = await resp.json().catch(() => ({}));
        setErr(data.error || "Operation failed");
        return false;
      }
      onChanged();
      return true;
    } catch {
      setErr("An unexpected error occurred");
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const toggleHidden = (c: CompanyContact) =>
    mutate(c.source_key, () =>
      fetchWithAuth(`/api/company/contacts/${encodeURIComponent(c.source_key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_hidden: !c.is_hidden }),
      }),
    );

  const removeContact = (c: CompanyContact) =>
    mutate(c.source_key, () =>
      fetchWithAuth(`/api/company/contacts/${encodeURIComponent(c.source_key)}`, { method: "DELETE" }),
    );

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-secondary">Contacts in Vendor Search</h2>
          <p className="text-sm text-muted">Hide outdated contacts, edit details, or add your own. Hidden contacts never appear in vendor search.</p>
        </div>
        <Button variant="outline" onClick={() => setAdding((a) => !a)}>{adding ? "Cancel" : "Add Contact"}</Button>
      </div>

      {err && <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{err}</div>}

      {adding && <AddContactForm onAdded={() => { setAdding(false); onChanged(); }} onError={setErr} />}

      <div className={`${tableWrapClass} bg-card-bg`}>
        {profile.contacts.length === 0 ? (
          <div className="px-2.5 py-8 text-center text-sm text-muted">
            No contacts yet. SAM.gov contacts will appear here automatically.
          </div>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={thClass}>Name</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Title</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Phone</th>
                <th className={`${thClass} w-24`}>Status</th>
                <th className={`${thClass} w-32`}></th>
              </tr>
            </thead>
            <tbody>
              {profile.contacts.map((c) => (
                <ContactRow
                  key={c.source_key}
                  contact={c}
                  busy={busyKey === c.source_key}
                  onToggleHidden={() => toggleHidden(c)}
                  onRemove={() => removeContact(c)}
                  onSaved={onChanged}
                  onError={setErr}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function ContactRow({
  contact, busy, onToggleHidden, onRemove, onSaved, onError,
}: {
  contact: CompanyContact;
  busy: boolean;
  onToggleHidden: () => void;
  onRemove: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(contact);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(contact), [contact]);

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "(no name)";

  const save = async () => {
    setSaving(true);
    try {
      const resp = await fetchWithAuth(`/api/company/contacts/${encodeURIComponent(contact.source_key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          title: form.title,
          phone: form.phone,
          email: form.email,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        onError(data.error || "Failed to save contact");
        return;
      }
      setEditing(false);
      onSaved();
    } catch {
      onError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  // The edit form replaces the row's cells with one full-width cell, the same
  // expanded-row shape BidMatchResultsTable uses, so the table's columns are
  // never asked to hold a five-field form.
  if (editing) {
    return (
      <tr className="border-b border-border last:border-0 bg-muted-light">
        <td className="px-2.5 py-3" colSpan={CONTACT_COLUMNS}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="First Name" value={form.first_name || ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              <Input label="Last Name" value={form.last_name || ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              <Input label="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input label="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(contact); }} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  // Hidden contacts stay dimmed, composed onto rowClass rather than replacing
  // it, so they keep the standard separator and hover.
  return (
    <tr className={`${rowClass} ${contact.is_hidden ? "opacity-50" : ""}`}>
      <td className={`${tdClass} text-foreground`}>{name}</td>
      <td className={tdClass}>
        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted-light text-muted">
          {contact.source === "manual" ? "added" : contact.contact_type || "sam"}
        </span>
      </td>
      <td className={`${tdClass} text-muted`}>{contact.title || "—"}</td>
      <td className={`${tdClass} text-muted`}>{contact.email || "—"}</td>
      <td className={`${tdClass} text-muted whitespace-nowrap`}>{contact.phone || "—"}</td>
      <td className={tdClass}>
        {contact.is_hidden ? (
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-warning/15 text-warning">hidden</span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className={`${tdClass} text-right whitespace-nowrap`}>
        <button type="button" onClick={onToggleHidden} disabled={busy} className={rowActionClass}>
          {contact.is_hidden ? "Show" : "Hide"}
        </button>
        <button type="button" onClick={() => setEditing(true)} disabled={busy} className={`ml-3 ${rowActionClass}`}>
          Edit
        </button>
        {(contact.source === "manual" || contact.is_overridden || contact.is_hidden) && (
          <button type="button" onClick={onRemove} disabled={busy} className={`ml-3 ${rowActionDangerClass}`}>
            {contact.source === "manual" ? "Remove" : "Reset"}
          </button>
        )}
      </td>
    </tr>
  );
}

function AddContactForm({ onAdded, onError }: { onAdded: () => void; onError: (m: string) => void }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", title: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const resp = await fetchWithAuth("/api/company/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        onError(data.error || "Failed to add contact");
        return;
      }
      onAdded();
    } catch {
      onError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 p-4 bg-card-bg border border-border rounded-xl space-y-3">
      <h3 className="text-sm font-semibold text-secondary">New Contact</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="First Name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <Input label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <Button variant="primary" onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add Contact"}</Button>
    </div>
  );
}

// ===========================================================================
// Certifications & Set-Asides
// ===========================================================================

function CertificationsSection({ profile, onChanged }: { profile: CompanyProfile; onChanged: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const remove = async (cert: CompanyCertification) => {
    setBusyId(cert.id);
    setErr(null);
    try {
      const resp = await fetchWithAuth(`/api/company/certifications/${cert.id}`, { method: "DELETE" });
      if (!resp.ok && resp.status !== 204) {
        const data = await resp.json().catch(() => ({}));
        setErr(data.error || "Failed to delete");
        return;
      }
      onChanged();
    } catch {
      setErr("An unexpected error occurred");
    } finally {
      setBusyId(null);
    }
  };

  const toggleVisible = async (cert: CompanyCertification) => {
    setBusyId(cert.id);
    setErr(null);
    try {
      const resp = await fetchWithAuth(`/api/company/certifications/${cert.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: !cert.is_visible }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setErr(data.error || "Failed to update");
        return;
      }
      onChanged();
    } catch {
      setErr("An unexpected error occurred");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-secondary">Certifications &amp; Set-Asides</h2>
          <p className="text-sm text-muted">Publish your set-asides and certifications. Visible items show in your vendor-search profile.</p>
        </div>
        <Button variant="outline" onClick={() => setAdding((a) => !a)}>{adding ? "Cancel" : "Add"}</Button>
      </div>

      {err && <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{err}</div>}

      {adding && <AddCertificationForm onAdded={() => { setAdding(false); onChanged(); }} onError={setErr} />}

      <div className={`${tableWrapClass} bg-card-bg`}>
        {profile.certifications.length === 0 ? (
          <div className="px-2.5 py-8 text-center text-sm text-muted">
            No certifications or set-asides added yet.
          </div>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={thClass}>Label</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Detail / Number</th>
                <th className={thClass}>Expires</th>
                <th className={`${thClass} w-24`}>Status</th>
                <th className={`${thClass} w-32`}></th>
              </tr>
            </thead>
            <tbody>
              {/* Hidden entries stay dimmed, composed onto rowClass so they
                  keep the standard separator and hover. */}
              {profile.certifications.map((cert) => (
                <tr key={cert.id} className={`${rowClass} ${cert.is_visible ? "" : "opacity-50"}`}>
                  <td className={`${tdClass} text-foreground`}>{cert.label}</td>
                  <td className={tdClass}>
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted-light text-muted">
                      {cert.kind === "set_aside" ? "set-aside" : "certification"}
                    </span>
                  </td>
                  <td className={`${tdClass} text-muted`}>{cert.value || "—"}</td>
                  <td className={`${tdClass} text-muted whitespace-nowrap`}>{cert.expires_date || "—"}</td>
                  <td className={tdClass}>
                    {cert.is_visible ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-warning/15 text-warning">hidden</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-right whitespace-nowrap`}>
                    <button type="button" onClick={() => toggleVisible(cert)} disabled={busyId === cert.id} className={rowActionClass}>
                      {cert.is_visible ? "Hide" : "Show"}
                    </button>
                    <button type="button" onClick={() => remove(cert)} disabled={busyId === cert.id} className={`ml-3 ${rowActionDangerClass}`}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

// Sentinel for the "Other (custom)" choice in the Standard picklist. It has to
// be distinct from "" (nothing picked yet) — sharing the empty string made the
// form open on custom entry, since the unselected state matched that option.
const CUSTOM_LABEL_OPTION = "__other__";

function AddCertificationForm({ onAdded, onError }: { onAdded: () => void; onError: (m: string) => void }) {
  const [kind, setKind] = useState<"set_aside" | "certification">("certification");
  const [picklistValue, setPicklistValue] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [value, setValue] = useState("");
  const [expires, setExpires] = useState("");
  const [saving, setSaving] = useState(false);

  // Canonical vocabularies (shared, cached) from code_definitions.
  const { codes: setAsideCodes, loading: setAsideLoading } = useCodeDefinitions("SET_ASIDE");
  const { codes: certCodes, loading: certLoading } = useCodeDefinitions("CERTIFICATION");
  const loadingCodes = kind === "set_aside" ? setAsideLoading : certLoading;
  const picklist = (kind === "set_aside" ? setAsideCodes : certCodes)
    .map((c) => ({ value: c.code, label: c.label }));
  const isOther = picklistValue === CUSTOM_LABEL_OPTION;
  const resolvedLabel = isOther ? customLabel.trim() : (picklist.find((p) => p.value === picklistValue)?.label || "");

  const submit = async () => {
    if (!resolvedLabel) {
      onError("Choose a standard option, or pick \u201cOther (custom)\u201d and enter a label.");
      return;
    }
    setSaving(true);
    try {
      const resp = await fetchWithAuth("/api/company/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          label: resolvedLabel,
          code: isOther ? null : picklistValue,
          value: value.trim() || null,
          expires_date: expires || null,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        onError(data.error || "Failed to add");
        return;
      }
      onAdded();
    } catch {
      onError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 p-4 bg-card-bg border border-border rounded-xl space-y-3">
      <h3 className="text-sm font-semibold text-secondary">New Certification / Set-Aside</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Type"
          value={kind}
          onChange={(e) => { setKind(e.target.value as "set_aside" | "certification"); setPicklistValue(""); }}
          options={[{ value: "certification", label: "Certification" }, { value: "set_aside", label: "Set-Aside" }]}
        />
        <Select
          label="Standard"
          value={picklistValue}
          onChange={(e) => setPicklistValue(e.target.value)}
          placeholder={loadingCodes ? "Loading…" : "Select a standard option…"}
          disabled={loadingCodes}
          options={[...picklist, { value: CUSTOM_LABEL_OPTION, label: "Other (custom)…" }]}
        />
        {isOther && (
          <Input label="Custom Label" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="e.g. State MBE Certification" />
        )}
        <Input label="Detail / Number (optional)" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Cert #12345" />
        <Input label="Expires (optional)" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </div>
      <Button variant="primary" onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add"}</Button>
    </div>
  );
}
