"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_ENTERPRISE_PRODUCT_KEY } from "@/lib/rfq/tier";
import { SolicitationRowBadges, SolStatusBadge } from "@/components/library/SolicitationRowBadges";
import { rowBadgeClass, ROW_BADGE_BASE, type RowBadgeTone } from "@/components/library/RowBadge";
import { FirstArticleBadge, WinHistoryBadge } from "@/components/library/WinAndFirstArticleBadges";
import { AmendmentTimelineModal } from "@/components/bidmatching/AmendmentTimelineModal";
import { BidTermsPanel } from "@/components/library/BidTermsPanel";
import { RfqComposeModal } from "@/components/rfq/RfqComposeModal";
import { QuoteVendorPickerModal } from "@/components/rfq/QuoteVendorPickerModal";
import { QuoteComparisonModal } from "@/components/rfq/QuoteComparisonModal";
import { SortHeader, TableCard, rowHoverClass, tableHeadRowClass, tdClass, thClass } from "@/components/rfq/TableCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  formatCurrency,
  formatPartIdentity,
  type PartSearchResponse,
  type PartSearchResult,
} from "@/lib/library/types";
import {
  WORK_STATUS_LABELS,
  type RfqBuyer,
  type RfqManufacturerSelection,
  type RfqSettings,
  type RfqWorkItem,
  type RfqWorkStatus,
  type RfqWorklistClaimResponse,
  type RfqWorklistPage,
} from "@/lib/rfq/types";

const PAGE_SIZE = 50;

/**
 * DIBBS represents First Article Test CLINs as placeholder part rows under
 * pseudo-CAGE 0001S ("GOVERNMENT FIRST ARTIC" pn 00000052, "CONTRACTOR FIRST
 * ARTIC" pn 00000053, plus a couple of description-less siblings). They have
 * no NIIN/FSC/price — a testing requirement on the real line item, not a
 * purchasable part — so they are never quotable and are hidden from the
 * expanded parts list.
 */
const DIBBS_PLACEHOLDER_CAGE = "0001S";
function isQuotableLine(p: PartSearchResult): boolean {
  return !(p.mfg_cage === DIBBS_PLACEHOLDER_CAGE && !p.nsn?.trim());
}
const SCOPE_STORAGE_KEY = "rfq-worklist-scope";
const STATUS_FILTER_STORAGE_KEY = "rfq-worklist-status-filter";
const SOL_STATUS_STORAGE_KEY = "rfq-worklist-sol-status";
const AUTO_REFRESH_STORAGE_KEY = "rfq-worklist-auto-refresh";
const REFRESH_MINUTES_STORAGE_KEY = "rfq-worklist-refresh-minutes";

// The queue changes under the buyer as the matcher lands new solicitations and
// teammates claim rows, so it re-polls on a cadence. Five minutes is the
// default: fast enough that a claim race is rare, slow enough to stay cheap.
const REFRESH_MINUTE_OPTIONS = [1, 2, 5, 10, 15, 30] as const;
const DEFAULT_REFRESH_MINUTES = 5;
const SOL_STATUS_OPTIONS = ["open", "awarded", "closed", "cancelled", "removed", "unavailable", "all"] as const;
type SolStatusFilter = (typeof SOL_STATUS_OPTIONS)[number];

type Scope = "mine" | "unassigned" | "all";
type SortKey = "close_date" | "solicitation_number" | "sol_status" | "work_status" | "set_aside" | "assignee" | "estimated_value";

const inputClass =
  "px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

// The two table-header filters. Deliberately smaller than inputClass, which
// the bulk-assign control keeps: that one appears beside a <Button> and has to
// match its height, while these sit above the table all day and read better as
// chrome than as inputs.
const filterSelectClass =
  "px-1.5 py-0.5 rounded border border-border bg-card-bg text-card-foreground text-xs cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString();
}

/** Days until close (floored at 0); null when undated. */
function daysToClose(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const close = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((close.getTime() - today.getTime()) / 86400000));
}

/** ISO date `days` before close, for the default vendor-quote due date. */
function dueDateFromClose(closeIso: string | null, leadDays: number | null): string | null {
  if (!closeIso || leadDays == null) return null;
  const [y, m, d] = closeIso.split("-").map(Number);
  const due = new Date(y, (m || 1) - 1, d || 1);
  due.setDate(due.getDate() - leadDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today) return null; // never default to a past date
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
}

// The RFQ Progress control is a <select> wearing a row badge, so it takes its
// colour from the same tone set every other pill in the row uses.
const statusPillTone: Record<RfqWorkStatus, RowBadgeTone> = {
  unworked: "neutral",
  rfq_sent: "sky",
  quotes_in: "indigo",
  priced: "amber",
  bid: "green",
  no_bid: "red",
  passed: "slate",
};

export default function RfqWorklistPage() {
  const { isLoading: authLoading, hasAnyProductAccess, user } = useAuth();
  const hasEnterprise = hasAnyProductAccess([RFQ_ENTERPRISE_PRODUCT_KEY]);

  const [scope, setScope] = useState<Scope>("mine");
  const [scopeInitialized, setScopeInitialized] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [solStatus, setSolStatus] = useState<SolStatusFilter>("open");
  const [sortBy, setSortBy] = useState<SortKey>("close_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RfqWorklistPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshMinutes, setRefreshMinutes] = useState<number>(DEFAULT_REFRESH_MINUTES);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const [buyers, setBuyers] = useState<RfqBuyer[]>([]);
  const [settings, setSettings] = useState<RfqSettings | null>(null);
  const [myMinEst, setMyMinEst] = useState<number | null>(null);

  // Row selection for the bulk bar.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState<string>("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // Amendment timeline modal.
  const [amendmentSolId, setAmendmentSolId] = useState<number | null>(null);
  const [amendmentSolNumber, setAmendmentSolNumber] = useState<string | null>(null);

  // Solicitation PDF viewer — same modal shape as the parts-search
  // Solicitations tab (has_pdf gates the glyph; the file streams from the
  // library endpoint).
  const [pdfFor, setPdfFor] = useState<{ id: number; number: string | null } | null>(null);

  // Quote flow: part picked from the solicitation modal -> vendor picker ->
  // compose modal.
  const [quoteContext, setQuoteContext] = useState<{ part: PartSearchResult; item: RfqWorkItem } | null>(null);
  const [composeSelections, setComposeSelections] = useState<RfqManufacturerSelection[] | null>(null);

  // Quote comparison modal (opened from the "N RFQs" pill).
  const [quotesFor, setQuotesFor] = useState<RfqWorkItem | null>(null);

  // Inline row expansion: the solicitation's parts (NSN, description,
  // qty/unit, unit price, Quote) render in a dropdown under the row —
  // mirrors the bid-matching page's matched-conditions expander.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [partsBySol, setPartsBySol] = useState<Record<number, { loading: boolean; error: string | null; parts: PartSearchResult[] }>>({});

  const toggleExpanded = (item: RfqWorkItem) => {
    const id = item.solicitation_id;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Lazy-fetch the parts on first expand; cached afterward.
    if (partsBySol[id] || !item.solicitation_number) return;
    setPartsBySol((prev) => ({ ...prev, [id]: { loading: true, error: null, parts: [] } }));
    (async () => {
      try {
        const params = new URLSearchParams({ solicitation: item.solicitation_number as string, limit: "50", offset: "0" });
        const res = await fetch(`/api/library/parts/search?${params.toString()}`);
        const body = await res.json();
        if (!res.ok) {
          setPartsBySol((prev) => ({ ...prev, [id]: { loading: false, error: body.error || "Failed to load parts.", parts: [] } }));
          return;
        }
        const data = body as PartSearchResponse;
        setPartsBySol((prev) => ({ ...prev, [id]: { loading: false, error: null, parts: data.results.filter(isQuotableLine) } }));
      } catch {
        setPartsBySol((prev) => ({ ...prev, [id]: { loading: false, error: "Network error loading parts.", parts: [] } }));
      }
    })();
  };

  // Initial scope: an explicit ?scope= wins (coverage tiles and the
  // unassigned-backlog alert link here), else the persisted choice.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("scope");
      if (fromUrl === "mine" || fromUrl === "unassigned" || fromUrl === "all") {
        setScope(fromUrl);
      } else {
        const stored = localStorage.getItem(SCOPE_STORAGE_KEY);
        if (stored === "mine" || stored === "unassigned" || stored === "all") setScope(stored);
      }
      const storedFilter = localStorage.getItem(STATUS_FILTER_STORAGE_KEY);
      if (storedFilter && storedFilter in WORK_STATUS_LABELS) setStatusFilter(storedFilter);
      const storedSol = localStorage.getItem(SOL_STATUS_STORAGE_KEY);
      if (storedSol && (SOL_STATUS_OPTIONS as readonly string[]).includes(storedSol)) {
        setSolStatus(storedSol as SolStatusFilter);
      }
      const storedAuto = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
      if (storedAuto === "0") setAutoRefresh(false);
      const storedMinutes = Number(localStorage.getItem(REFRESH_MINUTES_STORAGE_KEY));
      if ((REFRESH_MINUTE_OPTIONS as readonly number[]).includes(storedMinutes)) {
        setRefreshMinutes(storedMinutes);
      }
    } catch { /* ignore */ }
    setScopeInitialized(true);
  }, []);
  useEffect(() => {
    if (!scopeInitialized) return;
    try {
      localStorage.setItem(SCOPE_STORAGE_KEY, scope);
      localStorage.setItem(STATUS_FILTER_STORAGE_KEY, statusFilter);
      localStorage.setItem(SOL_STATUS_STORAGE_KEY, solStatus);
      localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, autoRefresh ? "1" : "0");
      localStorage.setItem(REFRESH_MINUTES_STORAGE_KEY, String(refreshMinutes));
    } catch { /* ignore */ }
  }, [scope, statusFilter, solStatus, autoRefresh, refreshMinutes, scopeInitialized]);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [scope, statusFilter, solStatus, sortBy, sortDir]);

  // Server-side sort (client-side would only sort the visible page).
  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  // silent skips the full-page spinner — an auto-refresh replaces the rows in
  // place, leaving selection, expanded rows and scroll position alone.
  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        scope, page: String(page), page_size: String(PAGE_SIZE),
        sort_by: sortBy, sort_dir: sortDir, sol_status: solStatus,
      });
      if (statusFilter) params.set("work_status", statusFilter);
      const res = await fetch(`/api/rfq/worklist?${params.toString()}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to load the work queue.");
        return;
      }
      setData(body as RfqWorklistPage);
      setLastRefreshedAt(new Date());
    } catch {
      setError("Network error loading the work queue.");
    } finally {
      setLoading(false);
    }
  }, [scope, statusFilter, solStatus, page, sortBy, sortDir]);

  useEffect(() => {
    if (scopeInitialized && !authLoading && hasEnterprise) load();
  }, [scopeInitialized, authLoading, hasEnterprise, load]);

  // Held in a ref so opening/closing a modal doesn't restart the interval.
  const suspendRefreshRef = useRef(false);
  useEffect(() => {
    suspendRefreshRef.current = Boolean(
      quoteContext || composeSelections || quotesFor || pdfFor || amendmentSolId != null || bulkBusy
    );
  }, [quoteContext, composeSelections, quotesFor, pdfFor, amendmentSolId, bulkBusy]);

  useEffect(() => {
    if (!autoRefresh || !scopeInitialized || authLoading || !hasEnterprise) return;
    const id = setInterval(() => {
      // Skip the tick when the tab is in the background or the buyer is mid-
      // task in a modal — re-rendering rows underneath an open dialog buys
      // nothing and can yank a row out from under the flow.
      if (document.visibilityState !== "visible" || suspendRefreshRef.current) return;
      load({ silent: true });
    }, refreshMinutes * 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshMinutes, scopeInitialized, authLoading, hasEnterprise, load]);

  // Buyers + settings once.
  useEffect(() => {
    if (authLoading || !hasEnterprise) return;
    (async () => {
      try {
        const res = await fetch("/api/rfq/buyers");
        if (res.ok) setBuyers((await res.json()) as RfqBuyer[]);
      } catch { /* soft */ }
      try {
        const res = await fetch("/api/rfq/settings");
        if (res.ok) setSettings((await res.json()) as RfqSettings);
      } catch { /* soft */ }
      try {
        const res = await fetch("/api/rfq/settings/me");
        if (res.ok) {
          const me = await res.json();
          setMyMinEst(me.worklist_min_est_value ?? null);
        }
      } catch { /* soft */ }
    })();
  }, [authLoading, hasEnterprise]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const allOnPageSelected = items.length > 0 && items.every((i) => selected.has(i.solicitation_id));

  const toggleAll = () =>
    setSelected(allOnPageSelected ? new Set() : new Set(items.map((i) => i.solicitation_id)));

  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const postBulkAssign = async (override: boolean): Promise<{ changed: number; skipped: number } | null> => {
    const res = await fetch("/api/rfq/worklist/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        solicitation_ids: Array.from(selected),
        assigned_user_id: bulkAssignee ? Number(bulkAssignee) : null,
        override,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || "Failed to assign.");
      return null;
    }
    return body as { changed: number; skipped: number };
  };

  const bulkAssign = async () => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      // Rows another buyer holds are skipped server-side; taking them over is
      // a deliberate second step with the current owner situation spelled out.
      let body = await postBulkAssign(false);
      if (!body) return;
      let changed = body.changed;
      if (body.skipped > 0) {
        const ok = window.confirm(
          `${body.skipped} solicitation${body.skipped !== 1 ? "s are" : " is"} already assigned to another buyer. Reassign ${body.skipped !== 1 ? "them" : "it"} too?`
        );
        if (ok) {
          body = await postBulkAssign(true);
          if (!body) return;
          changed += body.changed;
        }
      }
      const target = bulkAssignee
        ? buyers.find((b) => b.user_id === Number(bulkAssignee))?.name || "buyer"
        : "nobody (unassigned)";
      setToast(`Assigned ${changed} solicitation${changed !== 1 ? "s" : ""} to ${target}.`);
      setSelected(new Set());
      load();
    } catch {
      setError("Network error assigning.");
    } finally {
      setBulkBusy(false);
    }
  };

  // Race-safe self-assignment. The endpoint always answers 200: claimed=false
  // with a name means another buyer got (or already had) it. silent suppresses
  // the success toast (used when claiming as a side effect of starting work);
  // the "already claimed" heads-up always shows.
  const claim = async (item: RfqWorkItem, opts?: { silent?: boolean }) => {
    try {
      const res = await fetch(`/api/rfq/worklist/${item.solicitation_id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ takeover: false }),
      });
      const body = (await res.json()) as RfqWorklistClaimResponse & { error?: string };
      if (!res.ok) {
        if (!opts?.silent) setError(body.error || "Failed to claim.");
        return;
      }
      const label = item.solicitation_number || "this solicitation";
      if (body.claimed || body.already_yours) {
        if (!opts?.silent) setToast(`Claimed ${label} — it's yours now.`);
      } else if (body.assigned_user_name) {
        setToast(`${body.assigned_user_name} is already working on ${label}.`);
      }
      load();
    } catch {
      if (!opts?.silent) setError("Network error claiming.");
    }
  };

  const patchStatus = async (item: RfqWorkItem, work_status: RfqWorkStatus) => {
    // Optimistic pill update; reload on failure.
    setData((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.solicitation_id === item.solicitation_id ? { ...i, work_status } : i)) }
        : prev
    );
    try {
      const res = await fetch(`/api/rfq/worklist/${item.solicitation_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_status }),
      });
      if (!res.ok) load();
    } catch {
      load();
    }
  };

  const defaultDueDateFor = (item: RfqWorkItem): string | null =>
    dueDateFromClose(item.close_date, settings?.default_quote_due_lead_days ?? null);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

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
        featureName="Send RFQs"
        featureKey="request_for_quote_enterprise"
        description="The solicitation work queue requires the RFQ Enterprise Add-on."
        benefits={[
          "Matched solicitations disbursed to buyers by approved-source CAGE",
          "Work status from unworked through bid/no-bid across the team",
          "Send RFQs to manufacturers and your private vendors from one queue",
        ]}
      />
    );
  }

  const scopes: Array<{ id: Scope; label: string; count?: number }> = [
    { id: "mine", label: "My solicitations" },
    { id: "unassigned", label: "Unassigned", count: data?.unassigned_count },
    { id: "all", label: "All" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Send RFQs</h1>
          <p className="text-muted mt-1 text-sm">
            Matched solicitations as a work queue. Click a solicitation for its parts, then
            Quote to request vendor pricing.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {/* Toggle pill + compact interval, mirroring the admin
                dashboard's /monitoring/tasks header: the dot pulses while the
                timer is live, and the interval only shows when it can act. */}
            <button
              type="button"
              onClick={() => setAutoRefresh((on) => !on)}
              aria-pressed={autoRefresh}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-muted/10 text-muted hover:bg-muted/20"
              }`}
              title={
                autoRefresh
                  ? `Re-checking the queue every ${refreshMinutes} min so new matches and teammates' claims appear without a page reload.`
                  : "Auto-refresh is off — the queue only updates when you hit Refresh."
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted/50"}`}
                aria-hidden="true"
              />
              Auto-refresh: {autoRefresh ? "ON" : "OFF"}
            </button>
            {autoRefresh && (
              <select
                className="px-1.5 py-1 rounded border border-border bg-card-bg text-card-foreground text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={refreshMinutes}
                onChange={(e) => setRefreshMinutes(Number(e.target.value))}
                aria-label="Auto-refresh interval"
                title="How often the queue re-checks for new matches and claims"
              >
                {REFRESH_MINUTE_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}m</option>
                ))}
              </select>
            )}
            {/* Not <Button size="sm"> — its smallest size stands a head
                taller than the toggle pill, and a className override loses to
                the component's own padding in Tailwind's source order. */}
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center px-3 py-1 rounded border border-primary text-primary text-xs font-medium transition-colors hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Refresh
            </button>
          </div>
          <span className="text-[11px] text-muted h-4">
            {lastRefreshedAt
              ? `Updated ${lastRefreshedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : ""}
          </span>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-border">
        {scopes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScope(s.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              scope === s.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {s.label}
            {s.count != null && s.count > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold px-1.5 py-0.5">
                {s.count.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>

      {toast && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary">{toast}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/5 px-4 py-2.5 text-sm text-error">{error}</div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 flex-wrap">
          <span className="text-sm text-card-foreground font-medium">
            {selected.size} selected
          </span>
          <select
            className={inputClass}
            value={bulkAssignee}
            onChange={(e) => setBulkAssignee(e.target.value)}
            aria-label="Assign to buyer"
          >
            <option value="">Unassign</option>
            {buyers.map((b) => (
              <option key={b.user_id} value={b.user_id}>
                {b.name}{!b.is_enterprise_buyer ? " (no Enterprise seat)" : ""}
              </option>
            ))}
          </select>
          <Button variant="primary" size="sm" onClick={bulkAssign} disabled={bulkBusy}>
            {bulkBusy ? "Assigning…" : bulkAssignee ? "Assign to buyer" : "Unassign"}
          </Button>
          <button type="button" className="text-xs text-muted hover:underline" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-sm text-muted">
          {scope === "mine"
            ? "No solicitations in your queue. Check the Unassigned tab, or ask an admin to assign CAGE codes to you."
            : scope === "unassigned"
            ? "Nothing unassigned — every matched solicitation routes to a buyer."
            : "No matched solicitations. Bid-matching results feed this queue."}
        </div>
      ) : (
        <TableCard
          className="overflow-x-auto"
          header={
            <>
              {/* Label and control are one <label> element rather than two
                  siblings: the header's gap-3 was separating each caption from
                  its own select as widely as it separated the two filters, so
                  the pair never read as one control. Wrapping also gives the
                  select a real accessible name, which the detached <label>
                  (no htmlFor) never did. */}
              <label className="inline-flex items-center gap-1.5 text-[11px] text-muted whitespace-nowrap">
                Sol. status
                <select
                  className={filterSelectClass}
                  value={solStatus}
                  onChange={(e) => setSolStatus(e.target.value as SolStatusFilter)}
                  title="Picking a status other than Open also includes solicitations past their close date — closed, cancelled, and awarded ones almost always are."
                >
                  <option value="open">Open</option>
                  <option value="awarded">Awarded</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="removed">Removed</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="all">All</option>
                </select>
              </label>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-muted whitespace-nowrap">
                RFQ progress
                <select
                  className={filterSelectClass}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {(Object.keys(WORK_STATUS_LABELS) as RfqWorkStatus[]).map((st) => (
                    <option key={st} value={st}>{WORK_STATUS_LABELS[st]}</option>
                  ))}
                </select>
              </label>
              <span className="ml-auto text-xs text-muted">
                {myMinEst != null && (
                  <span
                    className="mr-3 text-amber-700"
                    title="Your personal filter in RFQ Settings hides solicitations with an estimated value below this floor (rows with no estimate stay visible)."
                  >
                    Hiding under {myMinEst.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                  </span>
                )}
                {data ? `${data.total.toLocaleString()} solicitation${data.total !== 1 ? "s" : ""}` : ""}
              </span>
            </>
          }
        >
          <table className="w-full text-xs">
            <thead>
              <tr className={tableHeadRowClass}>
                <th className="px-3 py-2 w-8">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="px-2 py-2 w-8" aria-label="Expand" />
                <SortHeader label="Solicitation" sortKey="solicitation_number" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <th className={`${thClass} whitespace-nowrap`}>PR #</th>
                <SortHeader label="RFQ Progress" sortKey="work_status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Close date" sortKey="close_date" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="whitespace-nowrap" />
                <SortHeader label="Set-aside" sortKey="set_aside" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Est. value" sortKey="estimated_value" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="whitespace-nowrap" />
                <SortHeader label="Sol. Status" sortKey="sol_status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Assignee" sortKey="assignee" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const dtc = daysToClose(item.close_date);
                const isOpen = expanded.has(item.solicitation_id);
                const partsState = partsBySol[item.solicitation_id];
                return (
                  <Fragment key={item.solicitation_id}>
                    <tr className={rowHoverClass}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(item.solicitation_id)}
                          onChange={() => toggleOne(item.solicitation_id)}
                          aria-label={`Select ${item.solicitation_number}`}
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        {/* Expand for the solicited parts — same affordance as
                            the bid-matching page's matched-conditions arrow. */}
                        <button
                          type="button"
                          onClick={() => toggleExpanded(item)}
                          className="text-muted hover:text-foreground"
                          aria-label={isOpen ? "Collapse parts" : "Show parts"}
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap items-center gap-1.5 font-medium">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(item)}
                            className="text-primary font-medium hover:underline cursor-pointer"
                            title="Show the solicited parts"
                          >
                            {item.solicitation_number || "-"}
                          </button>
                          {item.has_pdf && (
                            // The number itself expands the row, so the PDF
                            // opens from a separate document glyph — same
                            // viewer as the parts-search Solicitations tab.
                            <button
                              type="button"
                              onClick={() => setPdfFor({ id: item.solicitation_id, number: item.solicitation_number })}
                              className="text-primary/70 hover:text-primary cursor-pointer"
                              title={`Open solicitation ${item.solicitation_number} (PDF)`}
                              aria-label={`Open solicitation ${item.solicitation_number} (PDF)`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                              </svg>
                            </button>
                          )}
                          {/* One "Amended" pill, not two. The separate
                              "Updated <n>d ago" badge said much the same thing
                              and made an already-crowded column unreadable.
                              Folding the post-match signal in rather than
                              dropping it keeps rows amended ONLY after the
                              match from losing their badge entirely; the
                              timeline behind the pill still shows every
                              change, before and after. */}
                          <SolicitationRowBadges
                            hasAmendmentIndicator={
                              item.has_amendment_indicator || item.has_post_match_amendment
                            }
                            onShowAmendments={() => {
                              setAmendmentSolId(item.solicitation_id);
                              setAmendmentSolNumber(item.solicitation_number);
                            }}
                            solicitationType={item.solicitation_type}
                            solicitationTypeLabel={item.solicitation_type_label}
                          />
                          {/* The quotable-items list hides First Article
                              placeholder lines, so this badge is the only
                              place the requirement surfaces on this page. */}
                          <FirstArticleBadge firstArticle={item.first_article} />
                          {/* Counted per part: a row here is a whole
                              solicitation, so this reads "you have made N of
                              these lines before". */}
                          <WinHistoryBadge
                            count={item.won_part_count ?? 0}
                            lastWonOn={item.last_won_on}
                            awards={item.won_parts ?? []}
                            mode="solicitation"
                          />
                          {item.rfq_count > 0 && (
                            <button
                              type="button"
                              onClick={() => setQuotesFor(item)}
                              className={`${ROW_BADGE_BASE} border-primary/40 text-primary hover:bg-primary/10 cursor-pointer transition-colors`}
                              title={`${item.rfq_count} RFQ${item.rfq_count !== 1 ? "s" : ""} sent · ${item.quote_count} quote${item.quote_count !== 1 ? "s" : ""} received — open the side-by-side comparison`}
                            >
                              View quotes ({item.quote_count})
                            </button>
                          )}
                          {item.staged_count > 0 && (
                            <Link
                              href="/rfq/batch"
                              className={`${ROW_BADGE_BASE} border-amber-500/50 text-amber-700 hover:bg-amber-500/10 transition-colors`}
                              title={`${item.staged_count} item${item.staged_count !== 1 ? "s" : ""} staged in the batch cart${item.staged_by_names.length > 0 ? ` by ${item.staged_by_names.join(", ")}` : ""} — RFQs not sent yet`}
                            >
                              In cart ({item.staged_count})
                            </Link>
                          )}
                        </div>
                        {item.agency_code && (
                          <div className="text-xs text-muted mt-0.5">{item.agency_code}</div>
                        )}
                      </td>
                      <td className={`${tdClass} font-mono whitespace-nowrap`}>
                        {item.pr_numbers.length === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span title={item.pr_numbers.length > 1 ? item.pr_numbers.join(", ") : undefined}>
                            {item.pr_numbers[0]}
                            {item.pr_numbers.length > 1 && (
                              <span className="text-muted"> +{item.pr_numbers.length - 1}</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className={tdClass}>
                        <select
                          className={rowBadgeClass(statusPillTone[item.work_status], { className: "cursor-pointer" })}
                          title="Your RFQ progress on this solicitation. RFQ Sent and Quotes In advance automatically; set the rest as you work."
                          value={item.work_status}
                          onChange={(e) => patchStatus(item, e.target.value as RfqWorkStatus)}
                          aria-label="Work status"
                        >
                          {(Object.keys(WORK_STATUS_LABELS) as RfqWorkStatus[]).map((s) => (
                            <option key={s} value={s}>{WORK_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <span className={dtc != null && dtc <= 3 ? "text-error font-semibold" : "text-foreground"}>
                          {formatDate(item.close_date)}
                        </span>
                        {dtc != null && (
                          <div className="text-[11px] text-muted">{dtc === 0 ? "closes today" : `${dtc}d left`}</div>
                        )}
                      </td>
                      <td className={tdClass}>
                        {item.set_aside_label || item.set_aside || "—"}
                      </td>
                      <td className={`${tdClass} text-right font-mono tabular-nums whitespace-nowrap`}>
                        {formatCurrency(item.estimated_value)}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <SolStatusBadge status={item.status} />
                      </td>
                      <td className={tdClass}>
                        {item.assigned_user_name ? (
                          <span className="text-foreground">
                            {item.assigned_user_name}
                            {user && item.assigned_user_id === user.id && (
                              <span className="text-muted"> (you)</span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            {/* The lone amber Claim button IS the unassigned
                                signal — no label next to it. */}
                            {item.derived_user_names.length > 0 && (
                              <span className="text-muted" title="Derived from CAGE assignment — no explicit assignee yet">
                                {item.derived_user_names.join(", ")}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => claim(item)}
                              className="px-1.5 py-0.5 rounded border border-amber-500/60 text-amber-700 text-[11px] font-medium hover:bg-amber-500/10 cursor-pointer"
                              title="Nobody owns this yet — claim it to remove it from other buyers' queues"
                            >
                              Claim
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted-light/30">
                        <td colSpan={10} className="px-6 py-3">
                          <div className="space-y-4">
                          {/* Whether this solicitation is biddable at all, and
                              what bidding costs — above the parts, because it
                              decides whether the parts are worth quoting.
                              Renders nothing when no terms are stated. */}
                          <BidTermsPanel
                            terms={item.bid_terms}
                            definitions={data?.bid_term_definitions}
                          />

                          {!partsState || partsState.loading ? (
                            <div className="flex items-center gap-2 py-2 text-xs text-muted">
                              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                              Loading parts…
                            </div>
                          ) : partsState.error ? (
                            <p className="text-xs text-error py-1">{partsState.error}</p>
                          ) : partsState.parts.length === 0 ? (
                            <p className="text-xs text-muted italic py-1">No quotable line items on this solicitation.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-[10px] font-semibold text-muted uppercase tracking-wide border-b border-border">
                                  <th className="px-3 py-1.5">NSN</th>
                                  <th className="px-3 py-1.5">Description</th>
                                  <th className="px-3 py-1.5 text-right whitespace-nowrap">Qty / Unit</th>
                                  <th className="px-3 py-1.5 text-right">Unit Price</th>
                                  <th className="px-3 py-1.5 text-right" aria-label="Actions" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {partsState.parts.map((p) => (
                                  <tr key={p.id}>
                                    <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                                      {p.nsn?.trim() ? (
                                        <a
                                          href={`/library/parts?search_type=nsn_niin&q=${encodeURIComponent(p.nsn)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-primary hover:underline"
                                          title="Open in Parts Search (new tab)"
                                        >
                                          {formatPartIdentity(p)}
                                          <svg
                                            className="w-3 h-3 shrink-0"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                            />
                                          </svg>
                                        </a>
                                      ) : (
                                        <span className="text-foreground">{formatPartIdentity(p)}</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-foreground truncate max-w-[380px]" title={p.description || undefined}>
                                      {p.description || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap font-mono tabular-nums">
                                      {p.quantity != null
                                        ? `${p.quantity.toLocaleString()}${p.unit_of_issue ? `/${p.unit_of_issue}` : ""}`
                                        : p.unit_of_issue || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap font-mono tabular-nums">
                                      {formatCurrency(p.unit_price)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => {
                                          setQuoteContext({ part: p, item });
                                          // Starting a quote is starting the work:
                                          // claim an unowned solicitation right away
                                          // (not at send), and warn when another
                                          // buyer already holds it.
                                          if (item.assigned_user_id == null) {
                                            claim(item, { silent: true });
                                          } else if (user && item.assigned_user_id !== user.id) {
                                            setToast(`Heads up: ${item.assigned_user_name || "another buyer"} is already working on this solicitation.`);
                                          }
                                        }}
                                      >
                                        Quote
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            {data.total.toLocaleString()} solicitation{data.total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-muted">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {quotesFor && (
        <QuoteComparisonModal
          isOpen={true}
          onClose={() => setQuotesFor(null)}
          solicitationId={quotesFor.solicitation_id}
          solicitationNumber={quotesFor.solicitation_number}
        />
      )}

      {pdfFor && (
        <Modal
          isOpen={true}
          onClose={() => setPdfFor(null)}
          title={`Solicitation ${pdfFor.number ?? ""}`}
          size="full"
        >
          <div className="flex flex-col gap-2">
            <a
              href={`/api/library/solicitations/${pdfFor.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Open in new tab
            </a>
            <iframe
              src={`/api/library/solicitations/${pdfFor.id}/pdf`}
              title={`Solicitation ${pdfFor.number ?? ""}`}
              className="w-full border border-border rounded min-h-[70vh]"
            />
          </div>
        </Modal>
      )}

      <AmendmentTimelineModal
        solicitationId={amendmentSolId}
        solicitationNumber={amendmentSolNumber}
        onClose={() => {
          setAmendmentSolId(null);
          setAmendmentSolNumber(null);
        }}
      />

      {/* Quote flow: vendor picker -> compose modal */}
      {quoteContext && !composeSelections && (
        <QuoteVendorPickerModal
          isOpen={true}
          onClose={() => setQuoteContext(null)}
          part={quoteContext.part}
          solicitationId={quoteContext.item.solicitation_id}
          onContinue={(selections) => setComposeSelections(selections)}
        />
      )}
      {quoteContext && composeSelections && (
        <RfqComposeModal
          isOpen={true}
          onClose={() => {
            setComposeSelections(null);
            setQuoteContext(null);
          }}
          nsn={quoteContext.part.nsn || null}
          selections={composeSelections}
          sourceSolicitationId={quoteContext.item.solicitation_id}
          defaultResponseDueDate={defaultDueDateFor(quoteContext.item)}
          onSent={(result) => {
            setToast(`Sent ${result.rfq_count} RFQ${result.rfq_count !== 1 ? "s" : ""} to ${result.vendor_count} vendor${result.vendor_count !== 1 ? "s" : ""}.`);
            setComposeSelections(null);
            setQuoteContext(null);
            load();
          }}
          onStaged={(count) => {
            setToast(`Staged ${count} item${count !== 1 ? "s" : ""} to the batch cart.`);
            setComposeSelections(null);
            setQuoteContext(null);
            // Staging claims the solicitation and lights the "In cart" badge.
            load();
          }}
        />
      )}
    </div>
  );
}
