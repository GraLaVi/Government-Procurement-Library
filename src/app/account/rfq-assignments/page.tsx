"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_ENTERPRISE_PRODUCT_KEY } from "@/lib/rfq/tier";
import { Button } from "@/components/ui/Button";
import { TableCard } from "@/components/rfq/TableCard";
import type { RfqBuyer } from "@/lib/rfq/types";

interface CageAssignmentRow {
  cage_code: string;
  vendor_name: string | null;
  buyers: { user_id: number; name: string; email: string }[];
}

const inputClass =
  "px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

/**
 * RFQ Assignments — CAGE-centric editor: one row per CAGE with its owning
 * buyers as removable chips and an add-buyer dropdown. Matches how the team
 * thinks ("who owns this vendor?") and makes ownerless CAGEs obvious.
 *
 * The original per-buyer-cards view is preserved at
 * src/components/rfq/RfqAssignmentsBuyerCardsView.tsx — re-export it as this
 * page's default to switch back.
 *
 * Data model note: rfq_buyer_cages stores (cage, buyer) PAIRS — a CAGE with
 * no buyers isn't stored, so newly added CAGEs are client-side drafts until
 * their first buyer is assigned, and removing a row's last buyer drops it.
 */
export default function RfqAssignmentsPage() {
  const { user, isLoading: authLoading, hasAnyProductAccess } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;
  const hasEnterprise = hasAnyProductAccess([RFQ_ENTERPRISE_PRODUCT_KEY]);

  const [rows, setRows] = useState<CageAssignmentRow[]>([]);
  const [buyers, setBuyers] = useState<RfqBuyer[]>([]);
  // CAGEs added in the UI that have no pair rows yet.
  const [draftCages, setDraftCages] = useState<string[]>([]);
  const [newCages, setNewCages] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyCage, setBusyCage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, bRes] = await Promise.all([
        fetch("/api/rfq/buyer-cages/by-cage"),
        fetch("/api/rfq/buyers"),
      ]);
      const cData = await cRes.json();
      if (!cRes.ok) {
        setError(cData.error || "Failed to load assignments.");
        return;
      }
      setRows(cData as CageAssignmentRow[]);
      if (bRes.ok) setBuyers((await bRes.json()) as RfqBuyer[]);
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

  const setPair = async (cage: string, userId: number, assigned: boolean) => {
    setBusyCage(cage);
    setError(null);
    try {
      const res = await fetch("/api/rfq/buyer-cages/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cage_code: cage, user_id: userId, assigned }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update assignment.");
        return false;
      }
      // A draft CAGE becomes a real row once its first pair lands.
      setDraftCages((prev) => prev.filter((c) => c !== cage));
      await load();
      return true;
    } catch {
      setError("Network error updating assignment.");
      return false;
    } finally {
      setBusyCage(null);
    }
  };

  const addCages = () => {
    const codes = newCages
      .toUpperCase()
      .split(/[\s,]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (codes.length === 0) return;
    const existing = new Set([...rows.map((r) => r.cage_code), ...draftCages]);
    const fresh = codes.filter((c) => !existing.has(c));
    setDraftCages((prev) => [...prev, ...fresh]);
    setNewCages("");
    if (fresh.length) setToast(`Added ${fresh.length} CAGE${fresh.length !== 1 ? "s" : ""} — now pick a buyer for each.`);
  };

  // Merge real rows + drafts, newest drafts on top, then filter by search.
  const displayRows = useMemo(() => {
    const draftRows: CageAssignmentRow[] = draftCages.map((c) => ({
      cage_code: c, vendor_name: null, buyers: [],
    }));
    const all = [...draftRows, ...rows];
    const q = search.trim().toUpperCase();
    if (!q) return all;
    return all.filter(
      (r) =>
        r.cage_code.includes(q) ||
        (r.vendor_name || "").toUpperCase().includes(q) ||
        r.buyers.some((b) => b.name.toUpperCase().includes(q))
    );
  }, [rows, draftCages, search]);

  const totalPairs = useMemo(() => rows.reduce((n, r) => n + r.buyers.length, 0), [rows]);

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
        featureName="RFQ Assignments"
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
    <div className="w-full">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">RFQ Assignments</h1>
          <p className="text-muted mt-1 text-sm">
            Who owns each CAGE. Matched solicitations whose approved-source manufacturers
            carry an assigned CAGE land in that buyer&apos;s{" "}
            <Link href="/rfq/worklist" className="text-primary hover:underline">Send RFQs</Link>{" "}
            queue. A CAGE can be owned by several buyers.
          </p>
        </div>
        <div className="text-right text-sm text-muted whitespace-nowrap">
          {rows.length} CAGE{rows.length !== 1 ? "s" : ""} · {totalPairs} assignment{totalPairs !== 1 ? "s" : ""}
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
        <TableCard
          header={
            <>
              <input
                className={`${inputClass} w-56`}
                placeholder="Search CAGE, vendor, or buyer"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <form
                className="flex items-center gap-2 ml-auto"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCages();
                }}
              >
                <input
                  className={`${inputClass} w-64`}
                  placeholder="Add CAGE(s) — comma or space separated"
                  value={newCages}
                  onChange={(e) => setNewCages(e.target.value)}
                />
                <Button type="submit" variant="outline" size="sm" disabled={!newCages.trim()}>
                  + Add CAGE(s)
                </Button>
              </form>
            </>
          }
        >
          {displayRows.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">
              {rows.length === 0 && draftCages.length === 0
                ? "No CAGEs assigned yet. Add the CAGE codes your team quotes and pick an owner for each."
                : "Nothing matches your search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-primary/10 text-left text-[10px] font-semibold text-muted uppercase tracking-wide">
                    <th className="px-3 py-2">CAGE</th>
                    <th className="px-3 py-2">Vendor</th>
                    <th className="px-3 py-2">Buyers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayRows.map((r) => {
                    const busy = busyCage === r.cage_code;
                    const unowned = r.buyers.length === 0;
                    const assignableBuyers = buyers.filter(
                      (b) => !r.buyers.some((x) => x.user_id === b.user_id)
                    );
                    return (
                      <tr key={r.cage_code} className={unowned ? "bg-amber-50/50" : undefined}>
                        <td className="px-3 py-2 font-mono font-semibold text-foreground whitespace-nowrap">
                          {r.cage_code}
                        </td>
                        <td className="px-3 py-2 text-card-foreground">
                          {r.vendor_name || <span className="text-muted italic">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.buyers.map((b) => (
                              <span
                                key={b.user_id}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted-light px-2 py-0.5 text-xs text-card-foreground"
                              >
                                {b.name}
                                <button
                                  type="button"
                                  aria-label={`Remove ${b.name} from ${r.cage_code}`}
                                  disabled={busy}
                                  onClick={() => setPair(r.cage_code, b.user_id, false)}
                                  className="text-muted hover:text-error disabled:opacity-50"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            {unowned && (
                              <span className="text-xs font-medium text-warning">nobody</span>
                            )}
                            {assignableBuyers.length > 0 && (
                              <select
                                className="px-1.5 py-0.5 rounded-md border border-border bg-card-bg text-xs text-muted cursor-pointer"
                                value=""
                                disabled={busy}
                                aria-label={`Add a buyer to ${r.cage_code}`}
                                onChange={(e) => {
                                  if (e.target.value) setPair(r.cage_code, Number(e.target.value), true);
                                }}
                              >
                                <option value="">+ Add buyer…</option>
                                {assignableBuyers.map((b) => (
                                  <option key={b.user_id} value={b.user_id}>
                                    {b.name}{!b.is_enterprise_buyer ? " (no Enterprise seat)" : ""}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TableCard>
      )}
    </div>
  );
}
