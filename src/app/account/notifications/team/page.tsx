"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionItem {
  notification_type_id: number;
  notification_type_name: string;
  type_key: string;
  frequency: string;
  stored_frequency?: string;
  effective_frequency?: string;
  source?: "subscription" | "default";
  entitled_frequencies?: string[];
  is_active: boolean;
}

interface UserGroup {
  user_id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  subscriptions: SubscriptionItem[];
}

interface ContactGroup {
  contact_id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  contact_type?: string;
  is_active?: boolean;
  subscriptions: SubscriptionItem[];
}

interface NotificationType {
  id: number;
  type_key: string;
  name: string;
  description?: string | null;
  category?: string | null;
  available_frequencies?: string[];
  default_frequency?: string;
  is_active: boolean;
}

interface TeamResponse {
  customer_id: number;
  users: UserGroup[];
  contacts: ContactGroup[];
  notification_types: NotificationType[];
}

function formatFrequencyLabel(freq: string): string {
  switch (freq) {
    case "none":
      return "Off";
    case "immediate":
      return "Immediate";
    case "daily_digest":
      return "Daily";
    case "weekly_digest":
      return "Weekly";
    default:
      return freq.replace("_", " ");
  }
}

export default function TeamNotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<TeamResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notifications/team", { credentials: "include" });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || "Failed to load team subscriptions");
        return;
      }
      setData(json);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      if (!user.roles?.includes("admin")) {
        router.replace("/account/notifications");
        return;
      }
      fetchTeam();
    } else if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router, fetchTeam]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleUserFrequencyChange = async (
    userId: number,
    typeKey: string,
    frequency: string,
  ) => {
    const key = `user-${userId}-${typeKey}`;
    setSavingKey(key);
    setError(null);
    try {
      const response = await fetch("/api/notifications/team/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type_key: typeKey,
          users: [{ user_id: userId, frequency }],
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error?.error || json.error || "Failed to update subscription");
        return;
      }
      setToast("Updated");
      await fetchTeam();
    } catch {
      setError("Failed to update subscription");
    } finally {
      setSavingKey(null);
    }
  };

  const handleContactFrequencyChange = async (
    contactId: number,
    typeKey: string,
    frequency: string,
  ) => {
    const key = `contact-${contactId}-${typeKey}`;
    setSavingKey(key);
    setError(null);
    try {
      const response = await fetch(
        `/api/notifications/contacts/${contactId}/subscriptions/${encodeURIComponent(typeKey)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frequency, channel: "email" }),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        setError(json.error?.error || json.error || "Failed to update subscription");
        return;
      }
      setToast("Updated");
      await fetchTeam();
    } catch {
      setError("Failed to update subscription");
    } finally {
      setSavingKey(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading team…</p>
        </div>
      </div>
    );
  }

  if (!user || !user.roles?.includes("admin")) return null;
  if (!data) return null;

  const activeTypes = data.notification_types.filter((t) => t.is_active);

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-muted mb-2">
          <Link href="/account" className="hover:text-primary">
            Account
          </Link>
          {" / "}
          <Link href="/account/notifications" className="hover:text-primary">
            Notifications
          </Link>
          {" / "}
          <span className="text-foreground">Team</span>
        </nav>
        <h1 className="text-2xl font-bold text-foreground">Team notifications</h1>
        <p className="text-muted mt-1">
          Manage notification preferences for everyone at your organization. Users are
          login accounts; contacts (AP, HR, billing) receive emails without a login.
        </p>
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

      {activeTypes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card-bg p-8 text-center text-sm text-muted">
          No notification types available.
        </div>
      ) : (
        activeTypes.map((nt) => (
          <section
            key={nt.id}
            className="rounded-xl border border-border bg-white overflow-hidden"
          >
            <header className="px-6 py-4 border-b border-border bg-muted-light/30">
              <h2 className="text-base font-semibold text-foreground">{nt.name}</h2>
              {nt.description && (
                <p className="text-xs text-muted mt-1">{nt.description}</p>
              )}
            </header>

            {/* Users */}
            <div>
              <div className="px-6 py-2 text-[11px] uppercase tracking-wide font-semibold text-muted bg-muted-light/20 border-b border-border">
                Users (login)
              </div>
              {data.users.length === 0 ? (
                <div className="px-6 py-4 text-xs text-muted">No users.</div>
              ) : (
                <div className="divide-y divide-border">
                  {data.users.map((u) => {
                    const sub = u.subscriptions.find((s) => s.notification_type_id === nt.id);
                    const stored = sub?.stored_frequency;
                    const effective = sub?.effective_frequency;
                    const downgraded = stored && effective && stored !== effective;
                    const entitled = sub?.entitled_frequencies || nt.available_frequencies || [];
                    const isDefault = sub?.source === "default";
                    const savingThis = savingKey === `user-${u.user_id}-${nt.type_key}`;
                    return (
                      <RowEditor
                        key={u.user_id}
                        title={`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email}
                        subtitle={u.email}
                        currentFrequency={stored || ""}
                        availableFrequencies={nt.available_frequencies || []}
                        entitled={entitled}
                        isDefault={!!isDefault}
                        downgraded={!!downgraded}
                        effective={effective}
                        defaultFrequency={nt.default_frequency}
                        saving={savingThis}
                        disabled={!u.is_active}
                        onChange={(freq) =>
                          handleUserFrequencyChange(u.user_id, nt.type_key, freq)
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contacts */}
            <div className="border-t border-border">
              <div className="px-6 py-2 text-[11px] uppercase tracking-wide font-semibold text-muted bg-muted-light/20 border-b border-border flex items-center justify-between">
                <span>Contacts (non-login)</span>
                <Link
                  href="/account/contacts"
                  className="text-[11px] font-normal text-primary hover:underline normal-case tracking-normal"
                >
                  Manage contacts →
                </Link>
              </div>
              {data.contacts.length === 0 ? (
                <div className="px-6 py-4 text-xs text-muted">
                  No contacts yet.{" "}
                  <Link href="/account/contacts" className="text-primary hover:underline">
                    Add a contact
                  </Link>{" "}
                  to subscribe AP, HR, or billing recipients.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.contacts.map((c) => {
                    const sub = c.subscriptions.find((s) => s.notification_type_id === nt.id);
                    const stored = sub?.stored_frequency;
                    const effective = sub?.effective_frequency;
                    const downgraded = stored && effective && stored !== effective;
                    const entitled = sub?.entitled_frequencies || nt.available_frequencies || [];
                    const isDefault = sub?.source === "default";
                    const savingThis = savingKey === `contact-${c.contact_id}-${nt.type_key}`;
                    return (
                      <RowEditor
                        key={c.contact_id}
                        title={`${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email || `Contact #${c.contact_id}`}
                        subtitle={
                          c.contact_type
                            ? `${c.email || "—"} · ${c.contact_type}`
                            : c.email || "—"
                        }
                        currentFrequency={stored || ""}
                        availableFrequencies={nt.available_frequencies || []}
                        entitled={entitled}
                        isDefault={!!isDefault}
                        downgraded={!!downgraded}
                        effective={effective}
                        defaultFrequency={nt.default_frequency}
                        saving={savingThis}
                        disabled={!c.is_active}
                        onChange={(freq) =>
                          handleContactFrequencyChange(c.contact_id, nt.type_key, freq)
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

interface RowEditorProps {
  title: string;
  subtitle: string;
  currentFrequency: string;
  availableFrequencies: string[];
  entitled: string[];
  isDefault: boolean;
  downgraded: boolean;
  effective?: string;
  defaultFrequency?: string;
  saving: boolean;
  disabled: boolean;
  onChange: (freq: string) => void;
}

function RowEditor({
  title,
  subtitle,
  currentFrequency,
  availableFrequencies,
  entitled,
  isDefault,
  downgraded,
  effective,
  defaultFrequency,
  saving,
  disabled,
  onChange,
}: RowEditorProps) {
  const frequencies = Array.from(
    new Set([...(availableFrequencies || []), "none"]),
  );
  return (
    <div className="px-6 py-3 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{title}</div>
        <div className="text-xs text-muted truncate">{subtitle}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {isDefault && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-muted-light text-muted">
              inheriting default ({defaultFrequency ? formatFrequencyLabel(defaultFrequency) : "off"})
            </span>
          )}
          {downgraded && effective && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-warning/10 text-warning border border-warning/20"
              title={`Stored as ${currentFrequency} but the worker dispatches at ${effective}`}
            >
              ↓ auto-downgraded → {formatFrequencyLabel(effective)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {saving && (
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        )}
        <select
          value={currentFrequency}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || saving}
          className="text-xs border border-border rounded px-2 py-1 bg-white text-foreground"
        >
          <option value="">
            Default (
            {defaultFrequency ? formatFrequencyLabel(defaultFrequency) : "off"})
          </option>
          {frequencies.map((freq) => {
            const allowed = freq === "none" || entitled.includes(freq);
            return (
              <option
                key={freq}
                value={freq}
                disabled={!allowed}
                title={!allowed ? "Not allowed by your current plan" : undefined}
              >
                {formatFrequencyLabel(freq)}
                {!allowed ? " (locked)" : ""}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
