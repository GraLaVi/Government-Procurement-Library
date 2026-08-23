"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { RowBadge } from "@/components/library/RowBadge";
import type { InventorySettings, InventorySettingsUpdate } from "@/lib/inventory/types";

interface SettingsTabProps {
  /** Non-admins see the whole page read-only so they can understand the
   *  sharing policy without being able to change it. */
  isAdmin: boolean;
}

function Toggle({
  label, hint, checked, disabled, onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`flex items-start gap-3 py-2 ${disabled ? "opacity-70" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function NumberField({
  label, value, min, max, disabled, suffix, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          className="w-20 rounded border border-border bg-card-bg px-2 py-1 text-sm text-foreground text-right"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="text-xs text-muted w-12">{suffix}</span>
      </span>
    </label>
  );
}

/** What another subscriber would see for a sample listing, derived live from
 *  the form state — this preview is what makes admins comfortable enough to
 *  turn sharing on, so it must track every unsaved change. */
function ListingPreview({ form }: { form: InventorySettings }) {
  const supplier = form.show_company_identity && form.public_display_name
    ? form.public_display_name
    : "Authorized distributor · ships from US-East";
  const qty =
    form.share_quantity_mode === "exact" ? "1,240 EA"
    : form.share_quantity_mode === "band" ? "1,000+ EA"
    : "In stock";
  const rows: Array<[string, string | null]> = [
    ["Supplier", supplier],
    ["Quantity", form.share_quantity_mode === "hidden" ? "In stock" : qty],
    ["Condition", form.share_condition ? "A · OEM" : null],
    ["Unit price", form.share_price ? "$12.40" : null],
    ["MOQ", form.share_moq ? "50" : null],
    ["Lead time", form.share_lead_time ? "14 days" : null],
    ["Traceability", form.share_traceability ? "CofC + test reports · US" : null],
    ["Ships from", form.share_location ? "US-East" : null],
    ["Inquiries", form.inquiry_routing === "email"
      ? (form.inquiry_email || "your inquiry email")
      : "through GPH RFQ (identity stays private)"],
  ];
  return (
    <div className="bg-card-bg rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
          What other subscribers will see
        </h4>
        {!form.network_sharing_enabled && (
          <RowBadge tone="slate">sharing off — nothing is visible</RowBadge>
        )}
      </div>
      <dl className="text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-1 border-b border-border/40 last:border-0">
            <dt className="text-muted">{label}</dt>
            <dd className={value ? "text-foreground font-medium" : "text-muted/60 line-through"}>
              {value ?? "not shared"}
            </dd>
          </div>
        ))}
        <div className="flex justify-between py-1">
          <dt className="text-muted">Warehouse / bin</dt>
          <dd className="text-muted/60">never shared</dd>
        </div>
      </dl>
    </div>
  );
}

export function SettingsTab({ isAdmin }: SettingsTabProps) {
  const [form, setForm] = useState<InventorySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Sharing was off when loaded and the admin is turning it on: the terms
  // click-through is required in the same save.
  const [wasSharing, setWasSharing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const disabled = !isAdmin || saving;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/inventory/settings");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load settings.");
          return;
        }
        setForm(data as InventorySettings);
        setWasSharing((data as InventorySettings).network_sharing_enabled);
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const set = useCallback(<K extends keyof InventorySettings>(key: K, value: InventorySettings[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const enablingSharing = !!form && form.network_sharing_enabled && !wasSharing;

  const save = async () => {
    if (!form) return;
    if (enablingSharing && !termsAccepted) {
      setError("Accept the sharing terms to turn network sharing on.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: InventorySettingsUpdate = {
        network_sharing_enabled: form.network_sharing_enabled,
        share_quantity_mode: form.share_quantity_mode,
        share_price: form.share_price,
        share_lead_time: form.share_lead_time,
        share_moq: form.share_moq,
        share_condition: form.share_condition,
        share_traceability: form.share_traceability,
        share_location: form.share_location,
        show_company_identity: form.show_company_identity,
        public_display_name: form.public_display_name || undefined,
        inquiry_routing: form.inquiry_routing,
        inquiry_email: form.inquiry_email || undefined,
        auto_hide_stale_enabled: form.auto_hide_stale_enabled,
        stale_after_days: form.stale_after_days,
        hide_after_days: form.hide_after_days,
        shrink_threshold_pct: form.shrink_threshold_pct,
      };
      if (enablingSharing) body.accept_sharing_terms = true;
      const res = await fetch("/api/inventory/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save settings.");
        return;
      }
      setForm(data as InventorySettings);
      setWasSharing((data as InventorySettings).network_sharing_enabled);
      setTermsAccepted(false);
      setToast("Settings saved.");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!form) {
    return <p className="text-sm text-error py-6">{error || "Failed to load settings."}</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {!isAdmin && (
          <p className="text-xs text-muted bg-muted-light rounded p-3">
            You can review your company&apos;s sharing policy here; only account
            admins can change it.
          </p>
        )}

        {/* Master opt-in */}
        <section className="bg-card-bg rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Network sharing</h3>
          <p className="text-xs text-muted mb-2">
            Off by default. Until enabled, your inventory is visible only inside
            your own company.
          </p>
          <Toggle
            label="Share my inventory with other GPH subscribers"
            hint="Only lines matched to a part record with a condition code appear to others."
            checked={form.network_sharing_enabled}
            disabled={disabled}
            onChange={(v) => set("network_sharing_enabled", v)}
          />
          {enablingSharing && (
            <label className="flex items-start gap-3 mt-2 p-3 rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary"
                checked={termsAccepted}
                disabled={disabled}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span className="text-xs text-foreground">
                I agree that the fields selected below become visible to other GPH
                subscribers, and confirm my company has the right to publish this
                inventory data. Sharing can be turned off at any time and takes
                effect immediately.
              </span>
            </label>
          )}
        </section>

        {/* Per-column exposure */}
        <section className="bg-card-bg rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">What you share</h3>
          <label className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-foreground">Quantity</span>
            <select
              className="rounded border border-border bg-card-bg px-2 py-1 text-sm text-foreground"
              value={form.share_quantity_mode}
              disabled={disabled}
              onChange={(e) => set("share_quantity_mode", e.target.value as InventorySettings["share_quantity_mode"])}
            >
              <option value="exact">Exact quantity</option>
              <option value="band">Range (e.g. 100–499)</option>
              <option value="in_stock_only">In stock / not in stock</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <Toggle label="Unit price" checked={form.share_price} disabled={disabled} onChange={(v) => set("share_price", v)} />
          <Toggle label="Lead time" checked={form.share_lead_time} disabled={disabled} onChange={(v) => set("share_lead_time", v)} />
          <Toggle label="Minimum order quantity" checked={form.share_moq} disabled={disabled} onChange={(v) => set("share_moq", v)} />
          <Toggle
            label="Condition & material source"
            hint="Buyers rarely act on a listing without these."
            checked={form.share_condition}
            disabled={disabled}
            onChange={(v) => set("share_condition", v)}
          />
          <Toggle label="Traceability & country of origin" checked={form.share_traceability} disabled={disabled} onChange={(v) => set("share_traceability", v)} />
          <Toggle
            label="Ship-from region"
            hint="Region/country only — your warehouse and bin locations are never shared."
            checked={form.share_location}
            disabled={disabled}
            onChange={(v) => set("share_location", v)}
          />
        </section>

        {/* Identity & inquiries */}
        <section className="bg-card-bg rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Identity & inquiries</h3>
          <Toggle
            label="Show a company name on listings"
            hint="Off = anonymous listings ('Authorized distributor · ships from US-East')."
            checked={form.show_company_identity}
            disabled={disabled}
            onChange={(v) => set("show_company_identity", v)}
          />
          {form.show_company_identity && (
            <label className="block py-2">
              <span className="block text-xs text-muted mb-1">Public display name</span>
              <input
                type="text"
                className="w-full rounded border border-border bg-card-bg px-2 py-1.5 text-sm text-foreground"
                value={form.public_display_name ?? ""}
                maxLength={255}
                disabled={disabled}
                onChange={(e) => set("public_display_name", e.target.value)}
                placeholder="e.g. ACME Defense Supply"
              />
            </label>
          )}
          <div className="py-2">
            <span className="block text-xs text-muted mb-1">How buyers reach you</span>
            <label className="flex items-center gap-2 py-1 text-sm text-foreground">
              <input
                type="radio"
                name="inquiry_routing"
                className="accent-primary"
                checked={form.inquiry_routing === "rfq"}
                disabled={disabled}
                onChange={() => set("inquiry_routing", "rfq")}
              />
              Through GPH&apos;s RFQ tools (your identity stays private)
            </label>
            <label className="flex items-center gap-2 py-1 text-sm text-foreground">
              <input
                type="radio"
                name="inquiry_routing"
                className="accent-primary"
                checked={form.inquiry_routing === "email"}
                disabled={disabled}
                onChange={() => set("inquiry_routing", "email")}
              />
              Direct email shown on the listing
            </label>
            {form.inquiry_routing === "email" && (
              <input
                type="email"
                className="mt-1 w-full rounded border border-border bg-card-bg px-2 py-1.5 text-sm text-foreground"
                value={form.inquiry_email ?? ""}
                disabled={disabled}
                onChange={(e) => set("inquiry_email", e.target.value)}
                placeholder="sales@yourcompany.com"
              />
            )}
          </div>
        </section>

        {/* Freshness */}
        <section className="bg-card-bg rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Freshness</h3>
          <p className="text-xs text-muted mb-2">
            Every listing shows its as-of date. Stale listings are badged; very
            stale listings are withdrawn from the network (you still see them,
            and one fresh upload restores them).
          </p>
          <NumberField label="Badge listings as stale after" value={form.stale_after_days} min={1} max={365} suffix="days" disabled={disabled} onChange={(v) => set("stale_after_days", v)} />
          <Toggle
            label="Auto-hide very stale listings from the network"
            checked={form.auto_hide_stale_enabled}
            disabled={disabled}
            onChange={(v) => set("auto_hide_stale_enabled", v)}
          />
          {form.auto_hide_stale_enabled && (
            <NumberField label="Hide from network after" value={form.hide_after_days} min={1} max={730} suffix="days" disabled={disabled} onChange={(v) => set("hide_after_days", v)} />
          )}
          <NumberField
            label="Warn when a snapshot would remove more than"
            value={form.shrink_threshold_pct}
            min={1}
            max={100}
            suffix="%"
            disabled={disabled}
            onChange={(v) => set("shrink_threshold_pct", v)}
          />
        </section>

        {error && <p className="text-xs text-error">{error}</p>}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={save} disabled={saving || (enablingSharing && !termsAccepted)}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
            {toast && <span className="text-xs text-success">{toast}</span>}
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-4 self-start">
        <ListingPreview form={form} />
      </div>
    </div>
  );
}
