"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { ChipInput } from "@/components/ui/ChipInput";
import { normalizeNiin, previewNiin } from "@/lib/niin";
import { useCodeDefinitions } from "@/lib/hooks/useCodeDefinitions";
import type { CodeDefinition } from "@/lib/codeDefinitions";

interface BidMatchCondition {
  condition_id: number;
  condition_type: string;
  match_value: string;
  match_operator: string;
  is_negated: boolean;
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

// In-form representation of a condition row. `chips` is the
// canonical list state for `match_operator === 'in'`; we serialize it
// to a comma-separated `match_value` at save time. For other operators
// `chips` is ignored and `match_value` is the source of truth.
interface ConditionForm {
  condition_type: string;
  match_value: string;
  match_operator: string;
  is_negated: boolean;
  chips: string[];
}

interface BidMatchingAccess {
  has_access: boolean;
  tier: "advanced" | "bundled" | null;
  limits: {
    max_profiles: number | null; // null = unlimited
    max_conditions_per_profile: number | null;
    // null = no restriction; otherwise the dropdown is filtered to this list.
    allowed_condition_types?: string[] | null;
  };
  usage: {
    // Total profiles (active + inactive). Kept for display/debug.
    profile_count: number;
    // The count that gates max_profiles. Inactive profiles don't count.
    active_profile_count: number;
  };
}

// The condition vocabulary the worker actually matches on, split into the
// two families it evaluates. Full-text (tsquery) keyword types always use
// the 'tsquery' operator; identifier/code types use eq|like|ilike|in. A
// type or operator outside this contract is stored happily by the DB and
// then SILENTLY never matches, so the API enforces the same matrix.
// Source of truth: ALAN-FastAPI-Web/src/bid_matching/models.py.
const TSQUERY_CONDITION_TYPES = [
  "PART_DESCRIPTION",
  "PID",
  "TECHNICAL_CHARACTERISTICS",
  "SAM_KEYWORD",
];

const IDENTIFIER_CONDITION_TYPES = [
  "NIIN",
  "FSC",
  "MFG_PART_NUMBER",
  "CAGE_CODE",
  "NAICS_CODE",
  "SET_ASIDE_CODE",
  "PSC_CODE",
];

const ALLOWED_CONDITION_TYPES = [
  ...TSQUERY_CONDITION_TYPES,
  ...IDENTIFIER_CONDITION_TYPES,
];

function isKeywordType(condition_type: string): boolean {
  return TSQUERY_CONDITION_TYPES.includes(condition_type);
}

// Types offered when adding a new condition row. The retired types
// (STATUS / SET_ASIDE / DEPARTMENT / NOTICE_TYPE) are gone; any legacy row
// still carrying one keeps its value in the dropdown via the typeOptions
// fallback in the render below.
const NEW_CONDITION_TYPE_OPTIONS = ALLOWED_CONDITION_TYPES;

const CONDITION_TYPE_LABELS: Record<string, string> = {
  // Keyword match (tsquery)
  PART_DESCRIPTION: "Part description keyword",
  PID: "Procurement Item Description",
  TECHNICAL_CHARACTERISTICS: "Technical characteristics",
  SAM_KEYWORD: "SAM keyword (Navy/Army/AF)",
  // Identifier / code match
  NIIN: "NIIN",
  FSC: "FSC",
  MFG_PART_NUMBER: "Mfr part #",
  CAGE_CODE: "CAGE code",
  NAICS_CODE: "NAICS code",
  SET_ASIDE_CODE: "Set-Aside",
  PSC_CODE: "PSC",
  // Retired — kept only so a not-yet-migrated legacy row renders a name.
  SET_ASIDE: "Set-Aside (legacy — remove)",
  STATUS: "Status (retired — remove)",
};

// Human-readable group labels for the picker optgroups.
const CONDITION_GROUP_LABELS = {
  keyword: "Keyword match",
  identifier: "Identifier / code match",
} as const;

// Operators the worker SQL actually evaluates per condition_type.
// Anything outside the per-type set silently never matches — the API
// enforces this server-side too. Source of truth:
// ALAN-FastAPI-Web/src/bid_matching/models.py.
const CONDITION_TYPE_OPERATOR_MATRIX: Record<string, string[]> = {
  NIIN: ["eq", "like", "ilike", "in"],
  FSC: ["eq", "like", "ilike", "in"],
  MFG_PART_NUMBER: ["eq", "like", "ilike", "in"],
  CAGE_CODE: ["eq", "like", "ilike", "in"],
  NAICS_CODE: ["eq", "like", "ilike", "in"],
  SET_ASIDE_CODE: ["eq", "like", "ilike", "in"],
  PSC_CODE: ["eq", "like", "ilike", "in"],
  PART_DESCRIPTION: ["tsquery"],
  PID: ["tsquery"],
  TECHNICAL_CHARACTERISTICS: ["tsquery"],
  SAM_KEYWORD: ["tsquery"],
};

const CONDITION_TYPE_DEFAULT_OPERATOR: Record<string, string> = {
  NIIN: "eq",
  FSC: "eq",
  MFG_PART_NUMBER: "eq",
  CAGE_CODE: "eq",
  NAICS_CODE: "eq",
  SET_ASIDE_CODE: "eq",
  PSC_CODE: "eq",
  PART_DESCRIPTION: "tsquery",
  PID: "tsquery",
  TECHNICAL_CHARACTERISTICS: "tsquery",
  SAM_KEYWORD: "tsquery",
};

const OPERATOR_LABELS: Record<string, string> = {
  eq: "is exactly",
  like: "matches pattern (case-sensitive)",
  ilike: "matches pattern (case-insensitive)",
  in: "is any of",
  tsquery: "full-text match",
};

function operatorsFor(condition_type: string): string[] {
  return CONDITION_TYPE_OPERATOR_MATRIX[condition_type] ?? ["eq"];
}

function defaultOperatorFor(condition_type: string): string {
  return CONDITION_TYPE_DEFAULT_OPERATOR[condition_type] ?? "eq";
}

// Short description of each condition type — used in the per-row hint
// so customers know what the field actually represents.
const CONDITION_TYPE_HINTS: Record<string, string> = {
  // Keyword match (tsquery) — DIBBS + SAM unless noted.
  PART_DESCRIPTION: "Keyword(s) in the part's description. DIBBS + SAM.",
  PID: "Keyword(s) in the part's CTDF procurement item description. DIBBS + SAM.",
  TECHNICAL_CHARACTERISTICS: "Keyword(s) in the part's technical characteristics (material, color, finish, …). DIBBS + SAM.",
  SAM_KEYWORD: "Keyword(s) in the SAM notice title/description — Navy/Army/Air-Force notices only.",
  // Identifier / code match.
  NIIN: "The part's 9-digit NIIN. Paste a full 13-digit NSN and we'll strip the FSC for you. DIBBS + SAM.",
  FSC: "The part's Federal Supply Class. DIBBS + SAM.",
  MFG_PART_NUMBER: "The part's manufacturer part number. DIBBS + SAM.",
  CAGE_CODE: "The part's mfg CAGE, or any CAGE linked to the part (approved manufacturer / prior supplier). DIBBS + SAM.",
  NAICS_CODE: "NAICS classification of a vendor tied to the part (via the part's CAGEs) — not the solicitation's own NAICS. DIBBS + SAM.",
  SET_ASIDE_CODE: "The solicitation/opportunity set-aside code (e.g. SDVOSB, HUBZone, WOSB). DIBBS + SAM.",
  PSC_CODE: "The SAM opportunity's Product Service Code. SAM only.",
  // Retired — displayed only for not-yet-migrated legacy rows.
  SET_ASIDE: "Retired condition — the worker no longer matches it. Delete it and add a current Set-Aside condition.",
  STATUS: "Retired condition — the worker no longer matches it. Delete it.",
};

// Per-operator example value, parameterized by condition type. Keeps the
// example concrete so customers don't guess at format.
function operatorExample(condition_type: string, operator: string): string {
  if (operator === "in") {
    if (condition_type === "NIIN") return "01-234-5678, 999-888-777";
    if (condition_type === "FSC") return "5945, 5950, 5955";
    if (condition_type === "NAICS_CODE") return "332710, 336413";
    if (condition_type === "PSC_CODE") return "5945, 5950";
    if (condition_type === "SET_ASIDE_CODE") return "HZC, SDVOSBC, WOSB";
    return "value1, value2, value3";
  }
  if (operator === "like" || operator === "ilike") {
    if (condition_type === "MFG_PART_NUMBER") return "MS27%";
    return "%pattern%";
  }
  if (operator === "tsquery") return "pump relay";
  // eq examples
  if (condition_type === "NIIN") return "01-234-5678";
  if (condition_type === "FSC") return "5945";
  if (condition_type === "CAGE_CODE") return "1ABC2";
  if (condition_type === "NAICS_CODE") return "332710";
  if (condition_type === "PSC_CODE") return "5945";
  if (condition_type === "SET_ASIDE_CODE") return "SDVOSBC";
  return "value";
}

// Short description of each operator's behavior on the selected type.
function operatorHint(operator: string): string {
  switch (operator) {
    case "eq": return "Matches one exact value.";
    case "like": return "Wildcard pattern, case-sensitive. You supply '%'.";
    case "ilike": return "Wildcard pattern, case-insensitive. You supply '%'.";
    case "in": return "Matches any value in your list.";
    case "tsquery": return "Full-text search. Enter one or more words; all must appear.";
    default: return "";
  }
}

// Render selected canonical set-aside codes as chips + a dropdown to add
// more. Drives the SET_ASIDE_CODE condition when operator === 'in'.
function SetAsideCodeChipPicker({
  codes,
  byCode,
  selectedCodes,
  onChange,
}: {
  codes: CodeDefinition[];
  byCode: Map<string, CodeDefinition>;
  selectedCodes: string[];
  onChange: (next: string[]) => void;
}) {
  const remaining = codes.filter((c) => !selectedCodes.includes(c.code));
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {selectedCodes.length === 0 && (
          <span className="text-xs text-muted italic">No set-asides selected.</span>
        )}
        {selectedCodes.map((code) => {
          const def = byCode.get(code);
          return (
            <span
              key={code}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-accent/10 text-accent-foreground border border-accent/20"
              title={def?.description ?? undefined}
            >
              {def?.label ?? code}
              <button
                type="button"
                onClick={() => onChange(selectedCodes.filter((c) => c !== code))}
                className="text-muted hover:text-foreground"
                aria-label={`Remove ${def?.label ?? code}`}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      <select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v) onChange([...selectedCodes, v]);
        }}
        disabled={remaining.length === 0}
        className="w-full text-sm border border-border bg-card-bg text-foreground rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary disabled:opacity-60"
      >
        <option value="">
          {remaining.length === 0 ? "All set-asides selected" : "Add a set-aside…"}
        </option>
        {remaining.map((c) => (
          <option key={c.code} value={c.code} title={c.description ?? undefined}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function BidMatchingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<BidMatchProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [access, setAccess] = useState<BidMatchingAccess | null>(null);

  // Canonical set-aside vocab — one fetch per session via module cache.
  // Powers the SET_ASIDE_CODE condition dropdown and chip-picker.
  const { codes: setAsideCodes, byCode: setAsideByCode } = useCodeDefinitions("SET_ASIDE");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BidMatchProfile | null>(null);
  const [formName, setFormName] = useState("");
  const [formLogic, setFormLogic] = useState("AND");
  const [formNotes, setFormNotes] = useState("");
  const [formConditions, setFormConditions] = useState<ConditionForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [showOperatorHelp, setShowOperatorHelp] = useState(false);
  // Anchor at the end of the conditions list + a one-shot flag so that
  // adding a condition (from either the top or bottom button) scrolls the
  // newly appended row into view — otherwise on a long list the new row
  // lands off-screen and the user has to hunt for it.
  const conditionsEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToNewCondition = useRef(false);

  const isAdmin = user?.roles?.includes("admin");

  useEffect(() => {
    if (scrollToNewCondition.current) {
      scrollToNewCondition.current = false;
      conditionsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [formConditions.length]);

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
      profile.conditions.map((c) => {
        const op = c.match_operator || defaultOperatorFor(c.condition_type);
        return {
          condition_type: c.condition_type,
          match_value: c.match_value,
          match_operator: op,
          is_negated: !!c.is_negated,
          chips: op === "in" ? c.match_value.split(",").map((s) => s.trim()).filter(Boolean) : [],
        };
      })
    );
    setShowModal(true);
  };

  // Serialize a ConditionForm row into the API request shape. For `in`
  // rows we join chips with a bare comma; the API rejects whitespace in
  // the in-list (the worker SQL splits on `,` directly).
  const serializeCondition = (c: ConditionForm) => ({
    condition_type: c.condition_type,
    match_value: c.match_operator === "in" ? c.chips.join(",") : c.match_value.trim(),
    match_operator: c.match_operator,
    is_negated: c.is_negated,
  });

  const validateConditions = (): string | null => {
    if (formConditions.length === 0) return null;
    if (formConditions.every((c) => c.is_negated)) {
      return "A profile needs at least one non-excluded condition to produce matches. Turn off Exclude on at least one row.";
    }
    for (const c of formConditions) {
      const isIn = c.match_operator === "in";
      const empty = isIn ? c.chips.length === 0 : !c.match_value.trim();
      if (empty) return `Each ${CONDITION_TYPE_LABELS[c.condition_type] || c.condition_type} condition needs a value.`;
    }
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const validationError = validateConditions();
    if (validationError) {
      setError(validationError);
      setSaving(false);
      return;
    }
    try {
      const serialized = formConditions.map(serializeCondition);
      if (editingProfile) {
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
          setError(d.error || d.detail || "Failed to update profile");
          return;
        }
        const condRes = await fetch(
          `/api/bid-matching/profiles/${editingProfile.profile_id}/conditions`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(serialized),
          }
        );
        if (!condRes.ok) {
          const d = await condRes.json();
          setError(d.error || d.detail || "Failed to update conditions");
          return;
        }
        setToast("Profile updated");
      } else {
        const createRes = await fetch("/api/bid-matching/profiles", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile_name: formName,
            match_logic: formLogic,
            notes: formNotes || undefined,
            conditions: serialized,
          }),
        });
        if (!createRes.ok) {
          const d = await createRes.json();
          setError(d.error || d.detail || "Failed to create profile");
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

  const handleToggleActive = async (profile: BidMatchProfile) => {
    const next = !profile.is_active;
    const delta = next ? 1 : -1;
    // Optimistic update so both the badge and the "Active profiles: X / N"
    // header counter flip immediately; rollback on failure.
    setProfiles((prev) =>
      prev.map((p) =>
        p.profile_id === profile.profile_id ? { ...p, is_active: next } : p,
      ),
    );
    setAccess((prev) =>
      prev
        ? {
            ...prev,
            usage: {
              ...prev.usage,
              active_profile_count: prev.usage.active_profile_count + delta,
            },
          }
        : prev,
    );
    const rollback = () => {
      setProfiles((prev) =>
        prev.map((p) =>
          p.profile_id === profile.profile_id ? { ...p, is_active: !next } : p,
        ),
      );
      setAccess((prev) =>
        prev
          ? {
              ...prev,
              usage: {
                ...prev.usage,
                active_profile_count: prev.usage.active_profile_count - delta,
              },
            }
          : prev,
      );
    };
    try {
      const res = await fetch(`/api/bid-matching/profiles/${profile.profile_id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to update profile status");
        rollback();
        return;
      }
      setToast(next ? "Profile activated" : "Profile deactivated");
    } catch {
      setError("An unexpected error occurred");
      rollback();
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
    const defaultType = access?.limits.allowed_condition_types?.[0] ?? "NIIN";
    scrollToNewCondition.current = true;
    setFormConditions((prev) => [
      ...prev,
      {
        condition_type: defaultType,
        match_value: "",
        match_operator: defaultOperatorFor(defaultType),
        is_negated: false,
        chips: [],
      },
    ]);
  };

  const removeCondition = (idx: number) => {
    setFormConditions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Mutate a single condition row. When condition_type changes we may
  // need to reset the operator (the new type might not support the
  // current operator) and clear chips/value if the row was an in-list.
  const updateCondition = (idx: number, patch: Partial<ConditionForm>) => {
    setFormConditions((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const next = { ...c, ...patch };
        if (patch.condition_type && patch.condition_type !== c.condition_type) {
          const allowed = operatorsFor(next.condition_type);
          if (!allowed.includes(next.match_operator)) {
            next.match_operator = defaultOperatorFor(next.condition_type);
          }
        }
        if (patch.match_operator && patch.match_operator !== c.match_operator) {
          // Switching to/from `in` swaps the value representation. Keep
          // a best-effort conversion so the user doesn't lose what they
          // typed: chips -> comma-joined, or comma-joined -> chips.
          if (patch.match_operator === "in" && c.match_operator !== "in") {
            const parts = c.match_value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
            next.chips = parts;
            next.match_value = parts.join(",");
          } else if (patch.match_operator !== "in" && c.match_operator === "in") {
            next.match_value = c.chips.join(",");
            next.chips = [];
          }
        }
        return next;
      }),
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
            disabled={!!access && access.has_access && access.limits.max_profiles !== null && access.usage.active_profile_count >= access.limits.max_profiles}
            title={
              !!access && access.has_access && access.limits.max_profiles !== null && access.usage.active_profile_count >= access.limits.max_profiles
                ? "You're at the active-profile cap — upgrade to Advanced for more profiles, or deactivate or delete an existing profile."
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
            access.tier === "advanced"
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
                  {access.tier === "advanced"
                    ? "Bid Matching Advanced"
                    : access.tier === "bundled"
                      ? "Bid Matching (bundled with your plan)"
                      : "No active plan"}
                </span>
                {access.tier === "advanced" && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    ADVANCED
                  </span>
                )}
              </div>
              {access.has_access ? (
                <p className="text-xs text-muted mt-1">
                  Active profiles:{" "}
                  <span className="font-medium text-foreground">
                    {access.usage.active_profile_count}
                    {access.limits.max_profiles !== null
                      ? ` / ${access.limits.max_profiles}`
                      : " (unlimited)"}
                  </span>
                  {access.usage.profile_count > access.usage.active_profile_count && (
                    <span className="text-muted">
                      {" · "}
                      {access.usage.profile_count - access.usage.active_profile_count}
                      {" inactive (doesn't count toward cap)"}
                    </span>
                  )}
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
            {access.tier !== "advanced" &&
              (() => {
                if (!access.has_access) {
                  return (
                    <Link
                      href="/pricing"
                      className="text-xs text-primary hover:underline whitespace-nowrap"
                    >
                      View plans →
                    </Link>
                  );
                }
                const atCap =
                  access.limits.max_profiles !== null &&
                  access.usage.active_profile_count >= access.limits.max_profiles;
                if (!atCap) return null;
                return (
                  <Link
                    href="/pricing"
                    className="text-xs text-primary hover:underline whitespace-nowrap"
                  >
                    Need more? Upgrade to Advanced →
                  </Link>
                );
              })()}
          </div>
          {access.has_access &&
            access.limits.max_profiles !== null &&
            access.usage.active_profile_count >= access.limits.max_profiles && (
              <p className="mt-3 text-xs text-warning">
                You&apos;ve reached your active-profile cap. Deactivate or
                delete an existing profile, or upgrade to Advanced for more
                profiles.
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

      {/* Page-level error — only shown when the modal is closed. When the
          modal is open the same error renders inside the modal body so it
          stays visible (the modal overlay z-50 covers anything on the page). */}
      {error && !showModal && (
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
                    {profile.conditions.length > 0 && (() => {
                      const excluded = profile.conditions.filter((c) => c.is_negated).length;
                      const positive = profile.conditions.length - excluded;
                      return (
                        <span className="text-xs text-muted">
                          {positive} positive
                          {excluded > 0 && `, ${excluded} excluded`}
                        </span>
                      );
                    })()}
                  </div>
                  {profile.notes && (
                    <p className="text-sm text-muted mt-2">{profile.notes}</p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(profile)}
                    >
                      {profile.is_active ? "Deactivate" : "Activate"}
                    </Button>
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
                          Operator
                        </th>
                        <th className="text-left py-2 px-4 font-medium text-muted">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {profile.conditions.map((cond) => (
                        <tr
                          key={cond.condition_id}
                          className={cond.is_negated ? "border-l-4 border-l-red-400" : ""}
                        >
                          <td className="py-2 px-4 text-card-foreground font-medium">
                            {cond.is_negated && (
                              <span className="inline-block mr-1.5 text-[10px] font-bold text-red-600">NOT</span>
                            )}
                            {CONDITION_TYPE_LABELS[cond.condition_type] || cond.condition_type}
                          </td>
                          <td className="py-2 px-4 text-muted text-xs">
                            {OPERATOR_LABELS[cond.match_operator] || cond.match_operator}
                          </td>
                          <td className={`py-2 px-4 text-card-foreground ${cond.is_negated ? "line-through opacity-70" : ""}`}>
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
              {/* In-modal error banner — surfaces backend failures (e.g.
                  per-tier condition limit, allowed-types rejection) right
                  next to the form where the user is working. */}
              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start justify-between gap-3">
                  <span>{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                    aria-label="Dismiss"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

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
                {(() => {
                  const maxConditions = access?.limits.max_conditions_per_profile ?? null;
                  const atCap = maxConditions !== null && formConditions.length >= maxConditions;
                  return (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          Conditions
                          <button
                            type="button"
                            onClick={() => setShowOperatorHelp((v) => !v)}
                            className="w-4 h-4 rounded-full bg-muted/10 text-muted hover:bg-primary/10 hover:text-primary text-[10px] font-bold flex items-center justify-center"
                            aria-label="Operator reference"
                            title="Show operator reference"
                          >
                            ?
                          </button>
                          {maxConditions !== null && (
                            <span className="ml-1 text-xs text-muted font-normal">
                              {formConditions.length} / {maxConditions}
                            </span>
                          )}
                        </label>
                        <button
                          onClick={addCondition}
                          disabled={atCap}
                          title={
                            atCap
                              ? `Up to ${maxConditions} conditions per profile on this tier. Upgrade for more.`
                              : undefined
                          }
                          className={`text-sm font-medium ${
                            atCap
                              ? "text-muted cursor-not-allowed"
                              : "text-primary hover:text-primary/80 cursor-pointer"
                          }`}
                        >
                          + Add Condition
                        </button>
                      </div>
                      {/* Layer 1: short intro for newcomers, always visible.
                          Links out to the full guide. */}
                      <p className="text-xs text-muted mb-2 leading-relaxed">
                        Each row is one rule. Pick a <span className="text-foreground font-medium">type</span>{" "}
                        (the field to check), an <span className="text-foreground font-medium">operator</span>{" "}
                        (how to compare), and a <span className="text-foreground font-medium">value</span>. Combine
                        multiple rows with the AND/OR setting above.{" "}
                        <a
                          href="/docs/features/bid_matching_user_guide"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Full guide →
                        </a>
                      </p>
                      {/* Layer 3: collapsible operator quick-reference. */}
                      {showOperatorHelp && (
                        <div className="mb-3 rounded-lg border border-border bg-muted/5 p-3 text-xs">
                          <div className="font-medium text-foreground mb-1.5">Operators</div>
                          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
                            <dt className="text-foreground">is exactly</dt>
                            <dd className="text-muted">Matches one literal value. <span className="text-foreground">5945</span></dd>
                            <dt className="text-foreground">matches pattern</dt>
                            <dd className="text-muted">Wildcard with <code className="text-foreground">%</code>. Case-sensitive variant of below. <span className="text-foreground">5945%</span></dd>
                            <dt className="text-foreground">matches pattern (i)</dt>
                            <dd className="text-muted">Wildcard, case-insensitive. <span className="text-foreground">%pump%</span></dd>
                            <dt className="text-foreground">is any of</dt>
                            <dd className="text-muted">List of values; add with Enter or comma. <span className="text-foreground">5945, 5950</span></dd>
                            <dt className="text-foreground">full-text match</dt>
                            <dd className="text-muted">Search across long text. Word order doesn&apos;t matter. <span className="text-foreground">pump relay</span></dd>
                          </dl>
                        </div>
                      )}
                      {atCap && (
                        <p className="text-xs text-muted mb-2">
                          You&apos;ve reached your plan&apos;s {maxConditions}-condition limit.{" "}
                          <a href="/pricing" className="text-primary hover:underline">
                            Upgrade
                          </a>{" "}
                          to add more.
                        </p>
                      )}
                    </>
                  );
                })()}
                {formConditions.length === 0 && (
                  <p className="text-sm text-muted italic">
                    No conditions added yet.
                  </p>
                )}
                <div className="space-y-3">
                  {formConditions.map((cond, idx) => {
                    const allowedOps = operatorsFor(cond.condition_type);
                    const isKeyword = isKeywordType(cond.condition_type);
                    const isNiin = cond.condition_type === "NIIN";
                    const isIn = cond.match_operator === "in";
                    const isSetAsideCode = cond.condition_type === "SET_ASIDE_CODE";
                    const isLegacySetAside = cond.condition_type === "SET_ASIDE";
                    const niinPreview = isNiin && !isIn ? previewNiin(cond.match_value) : null;
                    // Build the type-picker options. Tier-restricted users
                    // keep their allowed list; everyone else gets the full
                    // allowed set. A row still carrying a retired type keeps
                    // its current value in the dropdown so the editor doesn't
                    // silently rewrite it. Split into keyword vs identifier
                    // groups for the optgroups below; any leftover (legacy)
                    // value renders as a standalone option.
                    const baseTypeOptions =
                      access?.limits.allowed_condition_types ?? NEW_CONDITION_TYPE_OPTIONS;
                    const typeOptions = baseTypeOptions.includes(cond.condition_type)
                      ? baseTypeOptions
                      : [cond.condition_type, ...baseTypeOptions];
                    const keywordOptions = typeOptions.filter((t) =>
                      TSQUERY_CONDITION_TYPES.includes(t),
                    );
                    const identifierOptions = typeOptions.filter((t) =>
                      IDENTIFIER_CONDITION_TYPES.includes(t),
                    );
                    const legacyOptions = typeOptions.filter(
                      (t) =>
                        !TSQUERY_CONDITION_TYPES.includes(t) &&
                        !IDENTIFIER_CONDITION_TYPES.includes(t),
                    );
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg border ${
                          cond.is_negated ? "border-red-200 border-l-4 border-l-red-400" : "border-border"
                        } p-2 space-y-2`}
                      >
                        {/* Row 1: condition type + operator + delete. The
                            value input is its own row below so all three
                            controls fit in a max-w-lg modal. */}
                        <div className="flex items-center gap-2">
                          <select
                            value={cond.condition_type}
                            onChange={(e) => updateCondition(idx, { condition_type: e.target.value })}
                            className="flex-1 min-w-0 text-sm border border-border bg-card-bg text-foreground rounded-lg px-2 py-2 focus:ring-2 focus:ring-primary"
                          >
                            {legacyOptions.map((ct) => (
                              <option key={ct} value={ct}>
                                {CONDITION_TYPE_LABELS[ct] || ct}
                              </option>
                            ))}
                            {keywordOptions.length > 0 && (
                              <optgroup label={CONDITION_GROUP_LABELS.keyword}>
                                {keywordOptions.map((ct) => (
                                  <option key={ct} value={ct}>
                                    {CONDITION_TYPE_LABELS[ct] || ct}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {identifierOptions.length > 0 && (
                              <optgroup label={CONDITION_GROUP_LABELS.identifier}>
                                {identifierOptions.map((ct) => (
                                  <option key={ct} value={ct}>
                                    {CONDITION_TYPE_LABELS[ct] || ct}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          {/* Keyword types are always tsquery — hide the
                              operator selector entirely for them. */}
                          {!isKeyword && (
                            <select
                              value={cond.match_operator}
                              onChange={(e) => updateCondition(idx, { match_operator: e.target.value })}
                              disabled={allowedOps.length === 1}
                              className="flex-1 min-w-0 text-sm border border-border bg-card-bg text-foreground rounded-lg px-2 py-2 focus:ring-2 focus:ring-primary disabled:opacity-60"
                              title={allowedOps.length === 1 ? "Only one operator is supported for this type." : undefined}
                            >
                              {allowedOps.map((op) => (
                                <option key={op} value={op}>
                                  {OPERATOR_LABELS[op] || op}
                                </option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => removeCondition(idx)}
                            className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                            aria-label="Remove condition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        {/* Row 2: value input — full width so chips and
                            paste-friendly inputs have room to breathe. */}
                        {isSetAsideCode && isIn ? (
                          <SetAsideCodeChipPicker
                            codes={setAsideCodes}
                            byCode={setAsideByCode}
                            selectedCodes={cond.chips}
                            onChange={(next) =>
                              updateCondition(idx, { chips: next, match_value: next.join(",") })
                            }
                          />
                        ) : isSetAsideCode ? (
                          <select
                            value={cond.match_value}
                            onChange={(e) => updateCondition(idx, { match_value: e.target.value })}
                            className="w-full text-sm border border-border bg-card-bg text-foreground rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                          >
                            <option value="" disabled>
                              Select a set-aside…
                            </option>
                            {setAsideCodes.map((c) => (
                              <option
                                key={c.code}
                                value={c.code}
                                title={c.description ?? undefined}
                              >
                                {c.label}
                              </option>
                            ))}
                          </select>
                        ) : isIn ? (
                          <ChipInput
                            value={cond.chips}
                            onChange={(next) => updateCondition(idx, { chips: next, match_value: next.join(",") })}
                            placeholder={isNiin ? "01-234-5678, 999-888-777, …" : "value1, value2, …"}
                            normalize={isNiin ? (raw) => { const r = normalizeNiin(raw); return r.ok ? r.niin : null; } : undefined}
                          />
                        ) : (
                          <input
                            type="text"
                            value={cond.match_value}
                            onChange={(e) => updateCondition(idx, { match_value: e.target.value })}
                            onBlur={() => {
                              if (isNiin) {
                                const r = normalizeNiin(cond.match_value);
                                if (r.ok) updateCondition(idx, { match_value: r.niin });
                              }
                            }}
                            className="w-full text-sm border border-border bg-card-bg text-foreground rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                            placeholder={
                              cond.match_operator === "like" || cond.match_operator === "ilike"
                                ? "%pattern%"
                                : cond.match_operator === "tsquery"
                                  ? "search terms"
                                  : "Match value"
                            }
                          />
                        )}
                        {isSetAsideCode && (cond.match_operator === "like" || cond.match_operator === "ilike") && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300">
                            ⚠ Most users want “is exactly” or “is any of” for set-asides. Pattern operators
                            only match values that look like a canonical code.
                          </p>
                        )}
                        {isLegacySetAside && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300">
                            This condition uses the retired DIBBS set-aside vocabulary. Delete it and add
                            a new “Set-Aside” condition to switch to the canonical codes.
                          </p>
                        )}
                        {/* Layer 2: contextual hint that updates with the
                            selected type + operator. Concrete example
                            included so customers don't guess at format. */}
                        <p className="text-[11px] text-muted leading-snug">
                          <span className="text-foreground">{CONDITION_TYPE_HINTS[cond.condition_type] ?? ""}</span>{" "}
                          {operatorHint(cond.match_operator)}{" "}
                          <span className="text-muted">Example: </span>
                          <code className="text-foreground bg-muted/10 px-1 rounded">{operatorExample(cond.condition_type, cond.match_operator)}</code>
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <label className="inline-flex items-center gap-1.5 text-muted cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cond.is_negated}
                              onChange={(e) => updateCondition(idx, { is_negated: e.target.checked })}
                              className="rounded border-border"
                            />
                            <span className={cond.is_negated ? "text-red-600 font-medium" : ""}>
                              {cond.is_negated ? "Excluded — drops matches that fire this" : "Exclude matches"}
                            </span>
                          </label>
                          {niinPreview && (
                            <span className="text-muted">Saving as NIIN <span className="text-foreground font-medium">{niinPreview}</span></span>
                          )}
                          {isNiin && isIn && cond.chips.length > 0 && (
                            <span className="text-muted">{cond.chips.length} NIIN{cond.chips.length === 1 ? "" : "s"}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Bottom add button — mirrors the one in the header so the
                    user doesn't have to scroll back up after building a long
                    list. Only shown once there's at least one row (the header
                    button + empty state cover the zero-condition case). */}
                {formConditions.length > 0 && (() => {
                  const maxConditions = access?.limits.max_conditions_per_profile ?? null;
                  const atCap = maxConditions !== null && formConditions.length >= maxConditions;
                  return (
                    <button
                      type="button"
                      onClick={addCondition}
                      disabled={atCap}
                      title={
                        atCap
                          ? `Up to ${maxConditions} conditions per profile on this tier. Upgrade for more.`
                          : undefined
                      }
                      className={`mt-3 w-full rounded-lg border border-dashed py-2 text-sm font-medium transition-colors ${
                        atCap
                          ? "border-border text-muted cursor-not-allowed"
                          : "border-primary/40 text-primary hover:bg-primary/5 cursor-pointer"
                      }`}
                    >
                      + Add Condition
                    </button>
                  );
                })()}
                {/* Scroll target so a freshly added row lands in view. */}
                <div ref={conditionsEndRef} />
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
