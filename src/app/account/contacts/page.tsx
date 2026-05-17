"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface Contact {
  id: number;
  contact_type?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  is_primary: boolean;
  is_active: boolean;
}

type FormState = {
  contact_type: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  is_primary: boolean;
};

const EMPTY_FORM: FormState = {
  contact_type: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  job_title: "",
  is_primary: false,
};

const CONTACT_TYPES = ["accounting", "hr", "billing", "operations", "other"] as const;

function fullName(c: Contact): string {
  const n = `${c.first_name || ""} ${c.last_name || ""}`.trim();
  return n || c.email || `Contact #${c.id}`;
}

export default function ContactsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notifications/contacts", {
        credentials: "include",
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || "Failed to load contacts");
        return;
      }
      setContacts(json);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      if (!user.roles?.includes("admin")) {
        router.replace("/account");
        return;
      }
      fetchContacts();
    } else if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router, fetchContacts]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({
      contact_type: c.contact_type || "",
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      email: c.email || "",
      phone: c.phone || "",
      job_title: c.job_title || "",
      is_primary: !!c.is_primary,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        contact_type: form.contact_type || null,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        job_title: form.job_title || null,
        is_primary: form.is_primary,
      };
      const url = editing
        ? `/api/notifications/contacts/${editing.id}`
        : "/api/notifications/contacts";
      const method = editing ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const json = await response.json();
        setError(json.error || `Failed to ${editing ? "update" : "create"} contact`);
        return;
      }
      setShowModal(false);
      setToast(editing ? "Contact updated" : "Contact created");
      await fetchContacts();
    } catch {
      setError(`Failed to ${editing ? "update" : "create"} contact`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Contact) => {
    if (!confirm(`Delete contact ${fullName(c)}? This also removes their notification subscriptions.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/notifications/contacts/${c.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.status !== 204 && !response.ok) {
        const json = await response.json().catch(() => ({}));
        setError(json.error || "Failed to delete contact");
        return;
      }
      setToast("Contact deleted");
      await fetchContacts();
    } catch {
      setError("Failed to delete contact");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading contacts…</p>
        </div>
      </div>
    );
  }

  if (!user || !user.roles?.includes("admin")) return null;

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-muted mb-2">
          <Link href="/account" className="hover:text-primary">
            Account
          </Link>
          {" / "}
          <span className="text-foreground">Contacts</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
            <p className="text-muted mt-1">
              Non-login recipients at your organization (accounting, HR, billing).
              Subscribe them to notifications on the{" "}
              <Link href="/account/notifications/team" className="text-primary hover:underline">
                Team
              </Link>{" "}
              page.
            </p>
          </div>
          <Button variant="primary" onClick={openCreate}>
            + Add contact
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {toast}
        </div>
      )}

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {contacts.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted">
            No contacts yet. Add your first one to start subscribing non-login
            recipients to notifications.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted-light/30 border-b border-border">
              <tr>
                <th className="text-left py-2 px-4 font-medium text-muted">Name</th>
                <th className="text-left py-2 px-4 font-medium text-muted">Email</th>
                <th className="text-left py-2 px-4 font-medium text-muted">Type</th>
                <th className="text-left py-2 px-4 font-medium text-muted">Title</th>
                <th className="text-left py-2 px-4 font-medium text-muted w-24">Status</th>
                <th className="py-2 px-4 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-muted-light/20">
                  <td className="py-2 px-4 text-foreground">
                    {fullName(c)}
                    {c.is_primary && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        primary
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-muted">{c.email || "—"}</td>
                  <td className="py-2 px-4 text-muted capitalize">
                    {c.contact_type || "—"}
                  </td>
                  <td className="py-2 px-4 text-muted">{c.job_title || "—"}</td>
                  <td className="py-2 px-4">
                    {c.is_active ? (
                      <span className="text-[11px] text-success">Active</span>
                    ) : (
                      <span className="text-[11px] text-muted">Inactive</span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-xs text-primary hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-xs text-error hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => !saving && setShowModal(false)}
        title={editing ? "Edit contact" : "Add contact"}
        size="md"
        preventClose={saving}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="First name"
              value={form.first_name}
              onChange={(v) => setForm({ ...form, first_name: v })}
            />
            <Field
              label="Last name"
              value={form.last_name}
              onChange={(v) => setForm({ ...form, last_name: v })}
            />
          </div>
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Type
              </label>
              <select
                value={form.contact_type}
                onChange={(e) => setForm({ ...form, contact_type: e.target.value })}
                className="w-full text-sm border border-border rounded px-2 py-1.5 bg-white"
              >
                <option value="">—</option>
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Job title"
              value={form.job_title}
              onChange={(v) => setForm({ ...form, job_title: v })}
            />
          </div>
          <Field
            label="Phone"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
            />
            Primary contact
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create contact"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-border rounded px-2 py-1.5 bg-white"
      />
    </div>
  );
}
