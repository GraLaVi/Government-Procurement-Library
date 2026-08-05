"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_ENTERPRISE_PRODUCT_KEY } from "@/lib/rfq/tier";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface RfqBuyer {
  user_id: number;
  name: string;
  email: string;
  is_enterprise_buyer: boolean;
}

interface BuyerCageAssignment {
  user_id: number;
  name: string;
  email: string;
  cage_codes: string[];
}

const inputClass =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

/**
 * Admin editor for CAGE -> buyer assignments (RFQ Enterprise).
 *
 * One card per active user; each holds a chip list of assigned CAGE codes
 * with an add field. Saves replace the user's whole set (PUT).
 */
export default function RfqAssignmentsPage() {
  const { user, isLoading: authLoading, hasAnyProductAccess } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;
  const hasEnterprise = hasAnyProductAccess([RFQ_ENTERPRISE_PRODUCT_KEY]);

  const [assignments, setAssignments] = useState<BuyerCageAssignment[]>([]);
  const [buyers, setBuyers] = useState<Record<number, RfqBuyer>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Per-user draft state for the "add CAGE" input.
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, bRes] = await Promise.all([
        fetch("/api/rfq/buyer-cages"),
        fetch("/api/rfq/buyers"),
      ]);
      const aData = await aRes.json();
      if (!aRes.ok) {
        setError(aData.error || "Failed to load assignments.");
        return;
      }
      setAssignments(aData as BuyerCageAssignment[]);
      if (bRes.ok) {
        const bData: RfqBuyer[] = await bRes.json();
        setBuyers(Object.fromEntries(bData.map((b) => [b.user_id, b])));
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && hasEnterprise && isAdmin) load();
  }, [authLoading, hasEnterprise, isAdmin, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const totalAssigned = useMemo(
    () => assignments.reduce((n, a) => n + a.cage_codes.length, 0),
    [assignments]
  );

  const save = async (userId: number, cageCodes: string[]) => {
    setSavingUserId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/rfq/buyer-cages/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cage_codes: cageCodes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save assignment.");
        return false;
      }
      setAssignments((prev) =>
        prev.map((a) => (a.user_id === userId ? { ...a, cage_codes: (data as BuyerCageAssignment).cage_codes } : a))
      );
      return true;
    } catch {
      setError("Network error saving assignment.");
      return false;
    } finally {
      setSavingUserId(null);
    }
  };

  const addCage = async (a: BuyerCageAssignment) => {
    const raw = (drafts[a.user_id] || "").trim().toUpperCase();
    if (!raw) return;
    // Comma/space-separated multi-add supported (paste a list).
    const codes = raw.split(/[\s,]+/).filter(Boolean);
    const next = Array.from(new Set([...a.cage_codes, ...codes]));
    const ok = await save(a.user_id, next);
    if (ok) {
      setDrafts((prev) => ({ ...prev, [a.user_id]: "" }));
      setToast(`Assigned ${codes.length} CAGE${codes.length !== 1 ? "s" : ""} to ${a.name}.`);
    }
  };

  const removeCage = async (a: BuyerCageAssignment, code: string) => {
    const ok = await save(a.user_id, a.cage_codes.filter((c) => c !== code));
    if (ok) setToast(`Removed ${code} from ${a.name}.`);
  };

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
        featureName="RFQ Buyer Assignments"
        featureKey="request_for_quote_enterprise"
        description="Assigning CAGE codes to buyers requires the RFQ Enterprise Add-on."
        benefits={[
          "Disburse matched solicitations to the buyer who owns each CAGE",
          "Give every buyer a default work queue of their own solicitations",
          "Track who is working what across the team",
        ]}
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground mb-2">Admins only</h1>
        <p className="text-sm text-muted">
          CAGE assignments are organization configuration. Ask a customer admin to make changes.
        </p>
        <Link href="/rfq/worklist" className="inline-block mt-4 text-sm text-primary hover:underline">
          Go to Send RFQs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">RFQ Buyer Assignments</h1>
          <p className="text-muted mt-1 text-sm">
            Assign CAGE codes to buyers. Matched solicitations whose approved-source
            manufacturers carry an assigned CAGE land in that buyer&apos;s{" "}
            <Link href="/rfq/worklist" className="text-primary hover:underline">Send RFQs</Link>{" "}
            queue. A CAGE may be assigned to several buyers.
          </p>
        </div>
        <div className="text-right text-sm text-muted whitespace-nowrap">
          {totalAssigned} assignment{totalAssigned !== 1 ? "s" : ""}
        </div>
      </div>

      {toast && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary">{toast}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/5 px-4 py-2.5 text-sm text-error">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => {
            const buyer = buyers[a.user_id];
            const saving = savingUserId === a.user_id;
            return (
              <div key={a.user_id} className="bg-card-bg rounded-xl border border-border p-5">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-sm font-semibold text-card-foreground">{a.name}</span>
                    <span className="ml-2 text-xs text-muted">{a.email}</span>
                    {buyer && !buyer.is_enterprise_buyer && (
                      <span
                        className="ml-2 inline-block"
                        title="This user has no RFQ Enterprise seat — assigned solicitations won't appear for them until a seat is assigned on Manage Users."
                      >
                        <Badge variant="warning" size="sm">No Enterprise seat</Badge>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    {a.cage_codes.length} CAGE{a.cage_codes.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.cage_codes.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted-light px-2 py-0.5 text-xs font-mono text-card-foreground"
                    >
                      {code}
                      <button
                        type="button"
                        aria-label={`Remove ${code}`}
                        disabled={saving}
                        onClick={() => removeCage(a, code)}
                        className="text-muted hover:text-error disabled:opacity-50"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {a.cage_codes.length === 0 && (
                    <span className="text-xs text-muted italic">No CAGEs assigned</span>
                  )}
                </div>

                <form
                  className="mt-3 flex items-center gap-2 max-w-sm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addCage(a);
                  }}
                >
                  <input
                    className={inputClass}
                    placeholder="Add CAGE(s) — comma or space separated"
                    value={drafts[a.user_id] || ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [a.user_id]: e.target.value }))}
                    disabled={saving}
                  />
                  <Button type="submit" variant="outline" size="sm" disabled={saving || !(drafts[a.user_id] || "").trim()}>
                    {saving ? "Saving…" : "Add"}
                  </Button>
                </form>
              </div>
            );
          })}
          {assignments.length === 0 && (
            <div className="text-center py-16 text-sm text-muted">No active users found.</div>
          )}
        </div>
      )}
    </div>
  );
}
