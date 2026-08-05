"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_ENTERPRISE_PRODUCT_KEY, RFQ_SENDER_KEYS } from "@/lib/rfq/tier";
import { Button } from "@/components/ui/Button";
import type { RfqSettings, RfqUserSettings } from "@/lib/rfq/types";

// --- Small presentational helpers matching /account/preferences ---

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-muted-light border border-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 sm:p-4 rounded-lg border border-border">
      <div className="flex-1 min-w-0">
        <div className="text-sm sm:text-base font-medium text-foreground">{label}</div>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

const CheckIcon = (
  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

function SelectableOption({
  selected,
  label,
  description,
  onClick,
  disabled,
}: {
  selected: boolean;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 transition-all text-left touch-manipulation disabled:opacity-50 ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted-light/50 active:bg-primary/10"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm sm:text-base font-medium ${selected ? "text-primary" : "text-foreground"}`}>
            {label}
          </span>
          {selected && CheckIcon}
        </div>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
    </button>
  );
}

const GRANULARITY_OPTIONS: { value: RfqUserSettings["bell_granularity"]; label: string; description: string }[] = [
  { value: "per_response", label: "One alert per response", description: "A separate bell item for each vendor quote." },
  { value: "per_rfq", label: "One alert per RFQ", description: "Responses to the same RFQ collapse into one item with a count." },
  { value: "rolling", label: "A single rolling summary", description: "One item that totals all your new responses." },
];

const AUDIENCE_OPTIONS: { value: RfqSettings["response_alert_audience"]; label: string; description: string }[] = [
  { value: "creator_only", label: "Only the RFQ creator", description: "The user who sent the RFQ is alerted." },
  { value: "all_users", label: "Everyone on the team", description: "All of your company's users are alerted." },
];

export default function RfqSettingsPage() {
  const { user, isLoading: authLoading, hasAnyProductAccess } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;
  const isEnterprise = hasAnyProductAccess([RFQ_ENTERPRISE_PRODUCT_KEY]);
  const [settings, setSettings] = useState<RfqSettings | null>(null);
  const [myPrefs, setMyPrefs] = useState<RfqUserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, meRes] = await Promise.all([
        fetch("/api/rfq/settings"),
        fetch("/api/rfq/settings/me"),
      ]);
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load settings.");
      else setSettings(data as RfqSettings);
      if (meRes.ok) setMyPrefs((await meRes.json()) as RfqUserSettings);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimistically update one or more of the current user's notification prefs.
  const updateMyPrefs = async (patch: Partial<RfqUserSettings>) => {
    const prev = myPrefs;
    setMyPrefs((p) => (p ? { ...p, ...patch } : p));
    try {
      const res = await fetch("/api/rfq/settings/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setMyPrefs(prev);
        const data = await res.json();
        setError(data.error || "Failed to update notification preference.");
      } else {
        setMyPrefs((await res.json()) as RfqUserSettings);
        setToast("Notification preference saved.");
      }
    } catch {
      setMyPrefs(prev);
      setError("Network error saving preference.");
    }
  };

  useEffect(() => {
    if (!authLoading && hasAnyProductAccess(RFQ_SENDER_KEYS)) load();
  }, [authLoading, hasAnyProductAccess, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/rfq/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          // -1 is the backend's "clear" sentinel for the threshold (a JSON
          // null in a PATCH reads as "not provided"). Non-admins send null so
          // an existing threshold is never touched by their echo-back save.
          unassigned_alert_threshold: isAdmin ? (settings.unassigned_alert_threshold ?? -1) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to save.");
      else {
        setSettings(data as RfqSettings);
        setToast("Company settings saved.");
      }
    } catch {
      setError("Network error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;

  if (!hasAnyProductAccess(RFQ_SENDER_KEYS)) {
    return (
      <AccessDeniedPage
        featureName="Request for Quotes"
        featureKey="request_for_quote"
        description="Configure how your RFQs are sent and closed."
        benefits={["Auto-close overdue RFQs", "Default response windows"]}
      />
    );
  }

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/rfq" className="text-muted hover:text-primary transition-colors">RFQs</Link>
          </li>
          <li className="text-muted">/</li>
          <li className="text-foreground font-medium">Settings</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">RFQ Settings</h1>
        <p className="text-muted mt-1">Control your notifications, auto-close behavior, and defaults.</p>
      </div>

      {/* Banners */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>
      )}
      {toast && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-success">{toast}</p>
          </div>
        </div>
      )}

      {loading || !settings || !myPrefs ? (
        <div className="text-sm text-muted">Loading settings…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* My notifications (per-user, saves immediately) */}
          <div className="bg-card-bg rounded-xl border border-border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-secondary mb-1">My notifications</h2>
              <p className="text-sm text-muted">
                How you&apos;re alerted when a vendor responds to an RFQ you receive alerts for. Applies only to you.
              </p>
            </div>

            <div className="space-y-3">
              <ToggleRow
                label="Email me when a vendor responds"
                description="An email per quote. Turn off if you send many."
                checked={myPrefs.notify_on_response}
                onChange={(v) => updateMyPrefs({ notify_on_response: v })}
              />
              <ToggleRow
                label="Show a bell alert when a vendor responds"
                description="A lightweight in-app alert (no email needed)."
                checked={myPrefs.bell_on_response}
                onChange={(v) => updateMyPrefs({ bell_on_response: v })}
              />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-secondary mb-1">How the bell groups response alerts</h3>
              <p className="text-xs text-muted mb-3">Changes how items appear in your notification bell.</p>
              <div className="space-y-3">
                {GRANULARITY_OPTIONS.map((o) => (
                  <SelectableOption
                    key={o.value}
                    selected={myPrefs.bell_granularity === o.value}
                    label={o.label}
                    description={o.description}
                    disabled={!myPrefs.bell_on_response}
                    onClick={() => updateMyPrefs({ bell_granularity: o.value })}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Company settings (saved via the button below) */}
          <div className="bg-card-bg rounded-xl border border-border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-secondary mb-1">Company settings</h2>
              <p className="text-sm text-muted">Applies to everyone in your organization.</p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-secondary mb-1">Who gets response alerts</h3>
                <p className="text-xs text-muted mb-3">Applies to bell and email alerts when a vendor responds.</p>
                <div className="space-y-3">
                  {AUDIENCE_OPTIONS.map((o) => (
                    <SelectableOption
                      key={o.value}
                      selected={settings.response_alert_audience === o.value}
                      label={o.label}
                      description={o.description}
                      onClick={() => setSettings({ ...settings, response_alert_audience: o.value })}
                    />
                  ))}
                </div>
              </div>

              <ToggleRow
                label="Auto-close overdue RFQs"
                description="Automatically close RFQs once their due date (plus grace) passes."
                checked={settings.auto_close_enabled}
                onChange={(v) => setSettings({ ...settings, auto_close_enabled: v })}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Grace period (days)</label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    disabled={!settings.auto_close_enabled}
                    className="w-full px-3 py-2 rounded-md border border-border bg-card-bg text-card-foreground text-sm disabled:opacity-50"
                    value={settings.auto_close_grace_days}
                    onChange={(e) => setSettings({ ...settings, auto_close_grace_days: parseInt(e.target.value || "0", 10) })}
                  />
                  <p className="text-xs text-muted mt-1">Extra days after the due date before auto-closing.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Default response window (days)</label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    className="w-full px-3 py-2 rounded-md border border-border bg-card-bg text-card-foreground text-sm"
                    value={settings.default_response_due_days ?? ""}
                    onChange={(e) =>
                      setSettings({ ...settings, default_response_due_days: e.target.value ? parseInt(e.target.value, 10) : null })
                    }
                  />
                  <p className="text-xs text-muted mt-1">Pre-fills the due date on new RFQs. Blank for none.</p>
                </div>
              </div>

              {/* Enterprise settings — visible only with the Enterprise
                  add-on. Admin-only fields render read-only for non-admins
                  (the backend 403s changes to them either way). */}
              {isEnterprise && (
                <div className="border-t border-border pt-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-secondary mb-1">Enterprise</h3>
                    <p className="text-xs text-muted">
                      Work queue and vendor-book behavior.
                      {!isAdmin && " Marked settings can only be changed by a customer admin."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Vendor quote lead time (days before close)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      className="w-full max-w-[200px] px-3 py-2 rounded-md border border-border bg-card-bg text-card-foreground text-sm"
                      value={settings.default_quote_due_lead_days ?? ""}
                      onChange={(e) =>
                        setSettings({ ...settings, default_quote_due_lead_days: e.target.value ? parseInt(e.target.value, 10) : null })
                      }
                    />
                    <p className="text-xs text-muted mt-1">
                      RFQs sent from the work queue default their vendor due date to the
                      solicitation close date minus this many days — so quotes arrive with
                      room to price and submit. Blank to use the plain response window.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Default markup %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="any"
                      className="w-full max-w-[200px] px-3 py-2 rounded-md border border-border bg-card-bg text-card-foreground text-sm"
                      value={settings.default_markup_percent ?? ""}
                      onChange={(e) =>
                        setSettings({ ...settings, default_markup_percent: e.target.value ? parseFloat(e.target.value) : null })
                      }
                    />
                    <p className="text-xs text-muted mt-1">
                      Pre-fills the markup field when pricing vendor quotes. Blank for none.
                    </p>
                  </div>

                  <ToggleRow
                    label="Allow users to add and edit vendor contacts"
                    description="When off, only admins can change the vendor book (contacts and private vendors). Admin-only setting."
                    checked={settings.allow_user_vendor_book_edits}
                    disabled={!isAdmin}
                    onChange={(v) => setSettings({ ...settings, allow_user_vendor_book_edits: v })}
                  />

                  <ToggleRow
                    label="Remind vendors who haven't responded"
                    description="Automatic email nudges before the quote due date. Admin-only setting."
                    checked={settings.reminder_enabled}
                    disabled={!isAdmin}
                    onChange={(v) => setSettings({ ...settings, reminder_enabled: v })}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Max reminders per vendor</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        disabled={!isAdmin || !settings.reminder_enabled}
                        className="w-full px-3 py-2 rounded-md border border-border bg-card-bg text-card-foreground text-sm disabled:opacity-50"
                        value={settings.reminder_max_count}
                        onChange={(e) => setSettings({ ...settings, reminder_max_count: parseInt(e.target.value || "0", 10) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Hours between reminders</label>
                      <input
                        type="number"
                        min="1"
                        max="720"
                        disabled={!isAdmin || !settings.reminder_enabled}
                        className="w-full px-3 py-2 rounded-md border border-border bg-card-bg text-card-foreground text-sm disabled:opacity-50"
                        value={settings.reminder_cooldown_hours}
                        onChange={(e) => setSettings({ ...settings, reminder_cooldown_hours: parseInt(e.target.value || "48", 10) })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Alert admins when the unassigned pool exceeds
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      disabled={!isAdmin}
                      className="w-full max-w-[200px] px-3 py-2 rounded-md border border-border bg-card-bg text-card-foreground text-sm disabled:opacity-50"
                      value={settings.unassigned_alert_threshold ?? ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          // -1 is the backend's "clear" sentinel; the UI keeps null locally.
                          unassigned_alert_threshold: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                    />
                    <p className="text-xs text-muted mt-1">
                      Daily check: when this many matched solicitations route to nobody, admins get
                      a bell (and email) alert. Blank to disable. Admin-only setting.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save row for company settings — spans both columns like /account/preferences */}
          <div className="lg:col-span-2 flex justify-end">
            <Button onClick={save} disabled={saving} variant="primary" size="md" className="w-full sm:w-auto touch-manipulation">
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save company settings"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
