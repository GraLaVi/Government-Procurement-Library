"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { VendorContact } from "@/lib/rfq/types";

interface RfqVendorContactEditModalProps {
  isOpen: boolean;
  contact: VendorContact | null;
  onClose: () => void;
  onSaved: (updated: VendorContact) => void;
}

const inputClass =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

/**
 * Thin wrapper: unmounts the form when closed and remounts per contact
 * (key), so the form initializes from props in useState — no reset effect
 * (react-hooks/set-state-in-effect).
 */
export function RfqVendorContactEditModal({ isOpen, contact, onClose, onSaved }: RfqVendorContactEditModalProps) {
  if (!isOpen || !contact) return null;
  return <ContactEditForm key={contact.id} contact={contact} onClose={onClose} onSaved={onSaved} />;
}

function ContactEditForm({ contact, onClose, onSaved }: {
  contact: VendorContact; onClose: () => void; onSaved: (updated: VendorContact) => void;
}) {
  const [contactName, setContactName] = useState(contact.contact_name || "");
  const [email, setEmail] = useState(contact.email || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [title, setTitle] = useState(contact.title || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rfq/vendor-contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: contactName || null,
          email: email.trim(),
          phone: phone || null,
          title: title || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update contact.");
        setSubmitting(false);
        return;
      }
      onSaved(data as VendorContact);
    } catch {
      setError("Network error updating contact.");
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit contact" size="md" preventClose={submitting}>
      <div className="space-y-4">
        <div className="text-xs font-mono text-muted">
          {contact.cage_code ? `CAGE ${contact.cage_code}` : "Private vendor contact"}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Name</label>
          <input className={inputClass} value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Email *</label>
          <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Phone</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Title</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
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
