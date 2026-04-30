"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

interface BidMatchCondition {
  condition_id: number;
  condition_type: string;
  match_value: string;
  match_operator: string;
  is_active: boolean;
  created_at: string;
}

interface BidMatchProfile {
  profile_id: number;
  customer_id: number;
  profile_name: string;
  is_active: boolean;
  match_logic: string;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  notes: string | null;
  conditions: BidMatchCondition[];
}

interface ConditionForm {
  condition_type: string;
  match_value: string;
}

interface BidMatchingAccess {
  has_access: boolean;
  tier: "pro" | "bundled" | null;
  limits: {
    max_profiles: number | null; // null = unlimited
    max_conditions_per_profile: number | null;
  };
  usage: { profile_count: number };
}

const ALLOWED_CONDITION_TYPES = [
  "NIIN",
  "FSC",
  "MFG_PART_NUMBER",
  "PART_DESCRIPTION",
  "SET_ASIDE",
  "CAGE_CODE",
  "STATUS",
];

const CONDITION_TYPE_LABELS: Record<string, string> = {
  NIIN: "NIIN",
  FSC: "FSC Code",
  MFG_PART_NUMBER: "Mfg Part Number",
  PART_DESCRIPTION: "Part Description",
  SET_ASIDE: "Set-Aside",
  CAGE_CODE: "CAGE Code",
  STATUS: "Status",
};

export default function BidMatchingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<BidMatchProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [access, setAccess] = useState<BidMatchingAccess | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BidMatchProfile | null>(null);
  const [formName, setFormName] = useState("");
  const [formLogic, setFormLogic] = useState("AND");
  const [formNotes, setFormNotes] = useState("");
  const [formConditions, setFormConditions] = useState<ConditionForm[]>([]);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.roles?.includes("admin");

  const fetchAccess = useCallback(async () => {
    try {
      const resp = await fetch("/api/bid-matching/access", { credentials: "include" });
      if (resp.ok) {
        setAccess(await resp.json());
      } else {
        setAccess(null);
      }
    } catch {
      setAccess(null);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/bid-matching/profiles", {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch profiles");
        return;
      }

      setProfiles(data);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchAccess();
      fetchProfiles();
    }
  }, [authLoading, user, fetchAccess, fetchProfiles]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const openCreateModal = () => {
    setEditingProfile(null);
    setFormName("");
    setFormLogic("AND");
    setFormNotes("");
    setFormConditions([]);
    setShowModal(true);
  };

  const openEditModal = (profile: BidMatchProfile) => {
    setEditingProfile(profile);
    setFormName(profile.profile_name);
    setFormLogic(profile.match_logic);
    setFormNotes(profile.notes || "");
    setFormConditions(
      profile.conditions.map((c) => ({
        condition_type: c.condition_type,
        match_value: c.match_value,
      }))
    );
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingProfile) {
        // Update profile
        const updateRes = await fetch(
          `/api/bid-matching/profiles/${editingProfile.profile_id}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile_name: formName,
              match_logic: formLogic,
              notes: formNotes || undefined,
            }),
          }
        );
        if (!updateRes.ok) {
          const d = await updateRes.json();
          setError(d.error || "Failed to update profile");
          return;
        }
        // Update conditions
        const condRes = await fetch(
          `/api/bid-matching/profiles/${editingProfile.profile_id}/conditions`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formConditions),
          }
        );
        if (!condRes.ok) {
          const d = await condRes.json();
          setError(d.error || "Failed to update conditions");
          return;
        }
        setToast("Profile updated");
      } else {
        // Create profile
        const createRes = await fetch("/api/bid-matching/profiles", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile_name: formName,
            match_logic: formLogic,
            notes: formNotes || undefined,
            conditions: formConditions,
          }),
        });
        if (!createRes.ok) {
          const d = await createRes.json();
          setError(d.error || "Failed to create profile");
          return;
        }
        setToast("Profile created");
      }
      setShowModal(false);
      fetchProfiles();
      fetchAccess();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profileId: number) => {
    if (!confirm("Are you sure you want to delete this profile? All conditions will be removed.")) return;
    try {
      const res = await fetch(`/api/bid-matching/profiles/${profileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        const d = await res.json();
        setError(d.error || "Failed to delete profile");
        return;
      }
      setToast("Profile deleted");
      fetchProfiles();
      fetchAccess();
    } catch {
      setError("An unexpected error occurred");
    }
  };

  const addCondition = () => {
    setFormConditions((prev) => [...prev, { condition_type: "NIIN", match_value: "" }]);
  };

  const removeCondition = (idx: number) => {
    setFormConditions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, field: keyof ConditionForm, value: string) => {
    setFormConditions((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading bid-matching profiles...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

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
          <li className="text-foreground font-medium">Bid-Matching Profile</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bid-Matching Profile
          </h1>
          <p className="text-muted mt-1">
            {isAdmin
              ? "Create and manage automated bid-matching profiles for your organization"
              : "View your organization's bid-matching profiles"}
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            disabled={!!access && access.has_access && access.limits.max_profiles !== null && access.usage.profile_count >= access.limits.max_profiles}
            title={
              !!access && access.has_access && access.limits.max_profiles !== null && access.usage.profile_count >= access.limits.max_profiles
                ? "You're at the profile cap — upgrade to Pro for unlimited profiles, or delete an existing profile."
                : undefined
            }
          >
            Create Profile
          </Button>
        )}
      </div>

      {/* Tier + limits card */}
      {access && (
        <div
          className={`mb-6 rounded-xl border p-4 ${
            access.tier === "pro"
              ? "bg-primary/5 border-primary/30"
              : access.has_access
                ? "bg-card-bg border-border"
                : "bg-warning/5 border-warning/30"
          }`}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {access.tier === "pro"
                    ? "Bid Matching Pro"
                    : access.tier === "bundled"
                      ? "Bid Matching (bundled with your plan)"
                      : "No active plan"}
                </span>
                {access.tier === "pro" && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    PRO
                  </span>
                )}
              </div>
              {access.has_access ? (
                <p className="text-xs text-muted mt-1">
                  Profiles:{" "}
                  <span className="font-medium text-foreground">
                    {access.usage.profile_count}
                    {access.limits.max_profiles !== null
                      ? ` / ${access.limits.max_profiles}`
                      : " (unlimited)"}
                  </span>
                  {access.limits.max_conditions_per_profile !== null && (
                    <>
                      {" · Up to "}
                      <span className="font-medium text-foreground">
                        {access.limits.max_conditions_per_profile}
                      </span>{" "}
                      conditions per profile
                    </>
                  )}
                </p>
              ) : (
                <p className="text-xs text-muted mt-1">
                  An active subscription unlocks bundled bid-matching.
                </p>
              )}
            </div>
            {access.tier !== "pro" && (
              <Link
                href="/pricing"
                className="text-xs text-primary hover:underline whitespace-nowrap"
              >
                {access.has_access
                  ? "Need more? Upgrade to Pro →"
                  : "View plans →"}
              </Link>
            )}
          </div>
          {access.has_access &&
            access.limits.max_profiles !== null &&
            access.usage.profile_count >= access.limits.max_profiles && (
              <p className="mt-3 text-xs text-warning">
                You&apos;ve reached your profile cap. Delete an existing
                profile or upgrade to Pro for unlimited profiles.
              </p>
            )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {toast}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Profiles */}
      {profiles.length === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-8 text-center">
          <p className="text-muted">No bid-matching profiles configured yet.</p>
          {isAdmin && (
            <p className="text-muted mt-2 text-sm">
              Create a profile to start receiving automated bid match notifications.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <div
              key={profile.profile_id}
              className="bg-card-bg rounded-xl border border-border p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">
                    {profile.profile_name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        profile.match_logic === "AND"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {profile.match_logic}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        profile.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {profile.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-muted">
                      Created {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {profile.notes && (
                    <p className="text-sm text-muted mt-2">{profile.notes}</p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(profile)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(profile.profile_id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Conditions table */}
              {profile.conditions.length > 0 ? (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-4 font-medium text-muted">
                          Type
                        </th>
                        <th className="text-left py-2 px-4 font-medium text-muted">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {profile.conditions.map((cond) => (
                        <tr key={cond.condition_id}>
                          <td className="py-2 px-4 text-card-foreground font-medium">
                            {CONDITION_TYPE_LABELS[cond.condition_type] || cond.condition_type}
                          </td>
                          <td className="py-2 px-4 text-card-foreground">
                            {cond.match_value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted italic">No conditions configured.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-card-bg rounded-xl border border-border shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">
                  {editingProfile ? "Edit Profile" : "Create Profile"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-muted hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Profile Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-sm border border-border bg-card-bg text-foreground rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., My FSC 5935 Alerts"
                />
              </div>

              {/* Match Logic */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Match Logic
                </label>
                <div className="flex gap-2">
                  {["AND", "OR"].map((logic) => (
                    <button
                      key={logic}
                      onClick={() => setFormLogic(logic)}
                      className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                        formLogic === logic
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-foreground hover:bg-gray-200"
                      }`}
                    >
                      {logic}
                    </button>
                  ))}
                  <span className="text-sm text-muted self-center ml-2">
                    {formLogic === "AND"
                      ? "All conditions must match"
                      : "Any condition can match"}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-sm border border-border bg-card-bg text-foreground rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={2}
                  placeholder="Optional notes about this profile"
                />
              </div>

              {/* Conditions */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-foreground">
                    Conditions
                  </label>
                  <button
                    onClick={addCondition}
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    + Add Condition
                  </button>
                </div>
                {formConditions.length === 0 && (
                  <p className="text-sm text-muted italic">
                    No conditions added yet.
                  </p>
                )}
                <div className="space-y-2">
                  {formConditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={cond.condition_type}
                        onChange={(e) => updateCondition(idx, "condition_type", e.target.value)}
                        className="text-sm border border-border bg-card-bg text-foreground rounded-lg px-2 py-2 focus:ring-2 focus:ring-primary"
                      >
                        {ALLOWED_CONDITION_TYPES.map((ct) => (
                          <option key={ct} value={ct}>
                            {CONDITION_TYPE_LABELS[ct] || ct}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={cond.match_value}
                        onChange={(e) => updateCondition(idx, "match_value", e.target.value)}
                        className="flex-1 text-sm border border-border bg-card-bg text-foreground rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                        placeholder="Match value"
                      />
                      <button
                        onClick={() => removeCondition(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || !formName.trim()}
              >
                {saving
                  ? "Saving..."
                  : editingProfile
                  ? "Save Changes"
                  : "Create Profile"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
