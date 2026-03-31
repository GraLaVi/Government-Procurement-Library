"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface CurrentSubscription {
  frequency: string;
  channel: string;
  is_active: boolean;
}

interface NotificationType {
  id: number;
  type_key: string;
  name: string;
  description: string | null;
  category: string | null;
  available_frequencies: string[] | null;
  default_frequency: string | null;
  requires_product_group: string | null;
  requires_product: string | null;
  entitled: boolean;
  current_subscription: CurrentSubscription | null;
}

// Group types by category
const groupByCategory = (
  types: NotificationType[]
): Record<string, NotificationType[]> => {
  return types.reduce((acc, t) => {
    const cat = t.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, NotificationType[]>);
};

const formatCategory = (category: string): string => {
  const labels: Record<string, string> = {
    alerts: "Alerts",
    reports: "Reports",
    system: "System",
    general: "General",
  };
  return labels[category] || category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const categoryDescriptions: Record<string, string> = {
  alerts: "Time-sensitive notifications about important events",
  reports: "Periodic summaries and reports",
  system: "System updates and maintenance notices",
  general: "General notifications",
};

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [types, setTypes] = useState<NotificationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchTypes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notifications/types", {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch notification types");
        return;
      }

      setTypes(data);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTypes();
    }
  }, [authLoading, user, fetchTypes]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleFrequencyChange = async (
    typeId: number,
    frequency: string
  ) => {
    try {
      setSavingId(typeId);
      const response = await fetch(
        `/api/notifications/subscriptions/${typeId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frequency, channel: "email" }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update subscription");
        return;
      }

      // Update local state
      setTypes((prev) =>
        prev.map((t) => {
          if (t.id !== typeId) return t;
          return {
            ...t,
            current_subscription: {
              frequency: data.frequency,
              channel: data.channel,
              is_active: data.is_active,
            },
          };
        })
      );
      setToast("Preference saved");
    } catch {
      setError("Failed to update subscription");
    } finally {
      setSavingId(null);
    }
  };

  const getEffectiveFrequency = (t: NotificationType): string => {
    if (t.current_subscription) {
      return t.current_subscription.is_active
        ? t.current_subscription.frequency
        : "none";
    }
    return t.default_frequency || "immediate";
  };

  const isLocked = (t: NotificationType): boolean => {
    return !t.entitled;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const grouped = groupByCategory(types);
  const categories = Object.keys(grouped).sort();

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link
              href="/account"
              className="text-muted hover:text-primary transition-colors"
            >
              Account
            </Link>
          </li>
          <li className="text-muted">/</li>
          <li className="text-foreground font-medium">Notifications</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">
          Notification Preferences
        </h1>
        <p className="text-muted mt-1">
          Choose which notifications you&apos;d like to receive and how often
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-success/90 text-white rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-sm text-error">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-error/70 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Empty state */}
      {types.length === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-muted-light rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-secondary mb-2">
            No Notifications Available
          </h3>
          <p className="text-muted max-w-md mx-auto">
            There are no notification types available for your account at this
            time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div
              key={category}
              className="bg-card-bg rounded-xl border border-border overflow-hidden"
            >
              <div className="px-6 py-4 bg-muted-light/50 border-b border-border">
                <h3 className="text-base font-semibold text-secondary">
                  {formatCategory(category)}
                </h3>
                <p className="text-sm text-muted">
                  {categoryDescriptions[category] ||
                    `${grouped[category].length} notification type${grouped[category].length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="divide-y divide-border">
                {grouped[category].map((t) => {
                  const effective = getEffectiveFrequency(t);
                  const locked = isLocked(t);
                  const frequencies = [
                    ...new Set([
                      ...(t.available_frequencies || ["immediate", "digest"]),
                      "none",
                    ]),
                  ];
                  const isDefault = !t.current_subscription;
                  const isSaving = savingId === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`px-6 py-5 ${locked ? "opacity-60" : "hover:bg-muted-light/30"} transition-colors`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground">
                              {t.name}
                            </h4>
                            {locked && t.requires_product && (
                              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-warning/10 text-warning border border-warning/20">
                                Requires: {t.requires_product}
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-sm text-muted mt-1">
                              {t.description}
                            </p>
                          )}
                        </div>

                        {/* Frequency selector */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isSaving && (
                            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin mr-2"></div>
                          )}
                          {frequencies.map((freq) => {
                            const isSelected = effective === freq;
                            const label =
                              freq === "none"
                                ? "Off"
                                : freq.charAt(0).toUpperCase() + freq.slice(1);

                            return (
                              <button
                                key={freq}
                                disabled={locked || isSaving}
                                onClick={() =>
                                  handleFrequencyChange(t.id, freq)
                                }
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                  isSelected
                                    ? freq === "none"
                                      ? "bg-error/10 border-error/30 text-error"
                                      : "bg-primary/10 border-primary/30 text-primary"
                                    : "bg-card-bg border-border text-muted hover:border-primary/30 hover:text-foreground"
                                } ${locked || isSaving ? "cursor-not-allowed" : "cursor-pointer"}`}
                              >
                                {label}
                                {isSelected && isDefault && (
                                  <span className="ml-1 text-[10px] opacity-70">
                                    (default)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info section */}
      <div className="mt-8 p-6 bg-info/5 border border-info/20 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-info"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary">
              About notification frequencies
            </h4>
            <p className="text-sm text-muted mt-1">
              <strong>Immediate</strong> notifications are sent as soon as the
              event occurs. <strong>Digest</strong> notifications are batched and
              sent periodically. Choose <strong>Off</strong> to stop receiving a
              notification type entirely.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
