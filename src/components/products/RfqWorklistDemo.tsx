"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { SolicitationRowBadges, SolStatusBadge } from "@/components/library/SolicitationRowBadges";
import { ROW_BADGE_BASE } from "@/components/library/RowBadge";
import { WinHistoryBadge } from "@/components/library/WinAndFirstArticleBadges";
import { BidTermsPanel } from "@/components/library/BidTermsPanel";
import { WorkStatusSelect } from "@/components/rfq/WorkStatusSelect";
import {
  SortHeader, TableCard, filterSelectClass, rowClass, tableClass, tableHeadRowClass,
  tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";
import { Button } from "@/components/ui/Button";
import { StockCoverageGlyph } from "@/components/inventory/StockCoverageGlyph";
import { DemoSurface } from "@/components/products/DemoSurface";
import { formatContractDate, formatCurrency, formatPartIdentity } from "@/lib/library/types";
import { WORK_STATUS_LABELS, WORK_STATUS_ORDER, type RfqWorkItem, type RfqWorkStatus } from "@/lib/rfq/types";
import type { MyStockSummary } from "@/lib/inventory/types";
import type { DemoWorklistData } from "@/lib/demo/rfqWorklist";

/**
 * The Send RFQs work queue (RFQ Enterprise) mock-up on /products/rfq.
 *
 * The queue page itself is one large stateful screen with no extracted row
 * component, so this composes the same pieces it is built from — the status
 * and win-history badges, the stock-coverage glyph, the bid-terms panel, the
 * progress select, the table tokens — in the same columns, on a fixture. The
 * plumbing a row normally reaches into (claiming, selection, expanding,
 * moving progress) is reimplemented here against the in-memory rows, so a
 * visitor can do all four and see what the queue would show.
 */

type Scope = "mine" | "unassigned" | "all";
type SortKey = "" | "close_date" | "estimated_value" | "work_status" | "solicitation_number";

interface DemoState {
  scope: Scope;
  statusFilter: string;
  search: string;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  expanded: number | null;
}

interface Tour {
  id: string;
  chip: string;
  caption: string;
  apply: (s: DemoState) => DemoState;
}

const BASELINE: DemoState = { scope: "mine", statusFilter: "", search: "", sortBy: "", sortDir: "desc", expanded: null };

const TOURS: Tour[] = [
  {
    id: "mine",
    chip: "My queue",
    caption:
      "Matched solicitations land with the buyer who owns the approved-source CAGE on them — no triage meeting. Each row carries the deadline with days left, the estimated value, the set-aside, and a progress pill the whole team can see.",
    apply: () => BASELINE,
  },
  {
    id: "inside",
    chip: "Inside a solicitation",
    caption:
      "Expanding a row shows the bid terms that decide whether it is worth quoting, the quotable lines, and — when your company uploads its inventory — what you already have on the shelf, with a Use my stock button beside Get quotes.",
    apply: () => ({ ...BASELINE, expanded: 501 }),
  },
  {
    id: "unassigned",
    chip: "The unassigned pool",
    caption:
      "Solicitations whose approved sources match nobody's CAGEs wait here, counted on the tab so the backlog is never invisible. Anyone can assign them, and sending an RFQ from one makes it yours.",
    apply: () => ({ ...BASELINE, scope: "unassigned" }),
  },
  {
    id: "claim",
    chip: "Claim before you quote",
    caption:
      "A CAGE can belong to several buyers, so the same row can sit in two queues. Claim it and it leaves everyone else's default view with your name on it. Get quotes claims automatically, and warns you if a teammate already owns the row.",
    apply: () => ({ ...BASELINE, scope: "all", sortBy: "work_status", sortDir: "asc" }),
  },
  {
    id: "progress",
    chip: "Where the quotes are",
    caption:
      "Sorted by progress: RFQ Sent and Quotes In advance on their own as vendors answer, Priced arrives once every line has a price to government, and the speech-bubble pill counts quotes back — it opens the side-by-side comparison in the app.",
    apply: () => ({ ...BASELINE, scope: "all", sortBy: "work_status", sortDir: "desc" }),
  },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysToClose(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const close = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((close.getTime() - today.getTime()) / 86400000));
}

/** The queue's "Your stock" cell, as the app renders it in the expanded row. */
function MyStockCell({ summary, solicitedQty }: { summary: MyStockSummary | undefined; solicitedQty: number | null | undefined }) {
  if (!summary) return <span className="text-muted">—</span>;
  const partial = solicitedQty != null && summary.totalQuantity < solicitedQty;
  return (
    <div>
      <div className="flex items-center gap-1.5 font-semibold text-green-800 dark:text-green-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
        {summary.totalQuantity.toLocaleString()} {summary.unitOfMeasure}
        {summary.conditionCode ? ` · cond ${summary.conditionCode}` : ""}
        {partial && (
          <span
            className={`${ROW_BADGE_BASE} bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30`}
            title={`Covers ${summary.totalQuantity.toLocaleString()} of the ${solicitedQty?.toLocaleString()} solicited — you would need to source the balance.`}
          >
            partial
          </span>
        )}
      </div>
      <div className={`text-[11px] ${summary.isStale ? "text-amber-700 dark:text-amber-300" : "text-muted"}`}>
        {summary.warehouse || "—"}
        {summary.otherLocations > 0 && ` +${summary.otherLocations} more`}
        {" · as of "}
        {formatContractDate(summary.asOfDate)}
        {summary.isStale && " — stale, recount before quoting"}
      </div>
    </div>
  );
}

export function RfqWorklistDemo({ data }: { data: DemoWorklistData }) {
  const me = data.currentUser;
  const [activeTour, setActiveTour] = useState<string | null>(TOURS[0].id);
  const [state, setState] = useState<DemoState>(BASELINE);
  const [claims, setClaims] = useState<Record<number, { id: number; name: string }>>({});
  const [progress, setProgress] = useState<Record<number, RfqWorkStatus>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const clearTour = () => setActiveTour(null);
  const set = (patch: Partial<DemoState>) => { clearTour(); setState((s) => ({ ...s, ...patch })); };

  const items = useMemo(
    () =>
      data.items.map((it) => {
        const claim = claims[it.solicitation_id];
        return {
          ...it,
          work_status: progress[it.solicitation_id] ?? it.work_status,
          assigned_user_id: claim ? claim.id : it.assigned_user_id,
          assigned_user_name: claim ? claim.name : it.assigned_user_name,
        };
      }),
    [data.items, claims, progress],
  );

  const unassignedCount = items.filter((i) => i.assigned_user_id == null && i.derived_user_ids.length === 0).length;

  const visible = useMemo(() => {
    const term = state.search.trim().toLowerCase();
    let out = items.filter((i) => {
      if (state.scope === "mine" && !(i.assigned_user_id === me.id || (i.assigned_user_id == null && i.derived_user_ids.includes(me.id)))) return false;
      if (state.scope === "unassigned" && !(i.assigned_user_id == null && i.derived_user_ids.length === 0)) return false;
      if (state.statusFilter && i.work_status !== state.statusFilter) return false;
      if (term) {
        const parts = data.partsBySol[i.solicitation_id] ?? [];
        const hay = `${i.solicitation_number ?? ""} ${parts.map((p) => `${p.nsn} ${p.description ?? ""}`).join(" ")}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    if (state.sortBy) {
      const dir = state.sortDir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        switch (state.sortBy) {
          case "close_date": return (a.close_date ?? "").localeCompare(b.close_date ?? "") * dir;
          case "estimated_value": return ((a.estimated_value ?? 0) - (b.estimated_value ?? 0)) * dir;
          case "work_status": return (WORK_STATUS_ORDER.indexOf(a.work_status) - WORK_STATUS_ORDER.indexOf(b.work_status)) * dir;
          case "solicitation_number": return (a.solicitation_number ?? "").localeCompare(b.solicitation_number ?? "") * dir;
          default: return 0;
        }
      });
    }
    return out;
  }, [items, state, me.id, data.partsBySol]);

  const toggleSort = (key: SortKey) =>
    set({ sortBy: key, sortDir: state.sortBy === key && state.sortDir === "desc" ? "asc" : "desc" });

  const claim = (item: RfqWorkItem) => {
    clearTour();
    setClaims((c) => ({ ...c, [item.solicitation_id]: me }));
    setToast(`Claimed ${item.solicitation_number}. It has left every other buyer's queue.`);
    setTimeout(() => setToast(null), 5000);
  };

  const scopes: Array<{ id: Scope; label: string; count?: number }> = [
    { id: "mine", label: "My solicitations" },
    { id: "unassigned", label: "Unassigned", count: unassignedCount },
    { id: "all", label: "All" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Show me</span>
        {TOURS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setActiveTour(t.id); setState((s) => t.apply(s)); }}
            aria-pressed={activeTour === t.id}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTour === t.id
                ? "border-primary bg-primary text-white"
                : "border-border bg-card-bg text-foreground hover:border-primary/40 hover:text-primary"
            }`}
          >
            {t.chip}
          </button>
        ))}
      </div>

      {activeTour && (
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          {TOURS.find((t) => t.id === activeTour)?.caption}
        </p>
      )}

      <DemoSurface
        prompt="The Send RFQs queue is part of the RFQ Enterprise add-on."
        cta={{ href: "/pricing#add-ons", label: "See pricing →" }}
      >
        <div className="rounded-xl border border-border bg-muted-light/40 p-3 dark:bg-background/40 sm:p-4 lg:p-6">
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-2xl font-bold text-foreground">Send RFQs</h3>
              <p className="text-muted mt-1 text-sm">
                Matched solicitations routed to the buyer who owns the CAGE. Work them through to a bid, and see what everyone else is working.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-card-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Sample data · signed in as {me.name}
            </span>
          </div>

          {/* Scope tabs */}
          <div className="mb-4 flex items-center gap-1 border-b border-border">
            {scopes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => set({ scope: s.id, expanded: null })}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  state.scope === s.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {s.label}
                {s.count != null && s.count > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold px-1.5 py-0.5 dark:bg-amber-500/10 dark:text-amber-300">
                    {s.count.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>

          {toast && <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary">{toast}</div>}

          {selected.size > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 flex-wrap">
              <span className="text-sm text-foreground">{selected.size} selected</span>
              <Button variant="primary" size="sm" onClick={() => { setSelected(new Set()); setToast("In the app this opens the buyer picker and re-routes every selected row."); setTimeout(() => setToast(null), 5000); }}>
                Assign to buyer
              </Button>
              <button type="button" className="text-xs text-muted hover:underline" onClick={() => setSelected(new Set())}>Clear selection</button>
            </div>
          )}

          <TableCard
            header={
              <>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-muted whitespace-nowrap">
                  Sol. status
                  <select className={filterSelectClass} value="open" onChange={() => undefined} title="Open solicitations. The app also lets you switch to awarded, closed and cancelled ones.">
                    <option value="open">Open</option>
                  </select>
                </label>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-muted whitespace-nowrap">
                  RFQ progress
                  <select className={filterSelectClass} value={state.statusFilter} onChange={(e) => set({ statusFilter: e.target.value })}>
                    <option value="">All</option>
                    {(Object.keys(WORK_STATUS_LABELS) as RfqWorkStatus[]).map((st) => (
                      <option key={st} value={st}>{WORK_STATUS_LABELS[st]}</option>
                    ))}
                  </select>
                </label>
                <div className="flex-1 min-w-[200px] max-w-md flex items-stretch rounded-lg border border-border overflow-hidden focus-within:border-primary">
                  <input
                    type="text"
                    value={state.search}
                    onChange={(e) => set({ search: e.target.value })}
                    placeholder="Search solicitation #, NSN or description…"
                    className="flex-1 min-w-0 border-0 bg-card-bg text-foreground text-xs px-2.5 py-1 focus:outline-none"
                  />
                </div>
                <span className="ml-auto text-xs text-muted">
                  {visible.length.toLocaleString()} solicitation{visible.length !== 1 ? "s" : ""}
                </span>
              </>
            }
          >
            <p className="mb-2 text-xs text-muted sm:hidden">Swipe the table sideways to see every column.</p>
            {visible.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted">Nothing here with those filters.</div>
            ) : (
              <div className={tableWrapClass}>
                <table className={tableClass}>
                  <thead>
                    <tr className={tableHeadRowClass}>
                      <th className={`${thClass} w-8`}>
                        <input
                          type="checkbox"
                          checked={visible.length > 0 && visible.every((i) => selected.has(i.solicitation_id))}
                          onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((i) => i.solicitation_id)) : new Set())}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="px-2 py-2 w-8" aria-label="Expand" />
                      <SortHeader label="Solicitation" sortKey="solicitation_number" sortBy={state.sortBy} sortDir={state.sortDir} onSort={toggleSort} />
                      <th className={`${thClass} whitespace-nowrap`}>PR #</th>
                      <SortHeader label="RFQ Progress" sortKey="work_status" sortBy={state.sortBy} sortDir={state.sortDir} onSort={toggleSort} />
                      <th className={`${thClass} whitespace-nowrap`}>Posted</th>
                      <SortHeader label="Close date" sortKey="close_date" sortBy={state.sortBy} sortDir={state.sortDir} onSort={toggleSort} className="whitespace-nowrap" />
                      <th className={thClass}>Set-aside</th>
                      <SortHeader label="Est. value" sortKey="estimated_value" sortBy={state.sortBy} sortDir={state.sortDir} onSort={toggleSort} className="whitespace-nowrap" />
                      <th className={thClass}>Sol. Status</th>
                      <th className={thClass}>Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item) => {
                      const dtc = daysToClose(item.close_date);
                      const isOpen = state.expanded === item.solicitation_id;
                      const parts = data.partsBySol[item.solicitation_id] ?? [];
                      const stockEntries = parts
                        .filter((p) => data.myStockByPart[p.id])
                        .map((p) => ({ key: p.id, identity: formatPartIdentity(p), summary: data.myStockByPart[p.id] }));
                      return (
                        <Fragment key={item.solicitation_id}>
                          <tr className={rowClass}>
                            <td className={tdClass}>
                              <input
                                type="checkbox"
                                checked={selected.has(item.solicitation_id)}
                                onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(item.solicitation_id)) n.delete(item.solicitation_id); else n.add(item.solicitation_id); return n; })}
                                aria-label={`Select ${item.solicitation_number}`}
                              />
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => set({ expanded: isOpen ? null : item.solicitation_id })}
                                className="text-muted hover:text-foreground"
                                aria-label={isOpen ? "Collapse parts" : "Show parts"}
                              >
                                <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </td>
                            <td className={tdClass}>
                              <div className="flex flex-wrap items-center gap-1.5 font-medium">
                                <button
                                  type="button"
                                  onClick={() => set({ expanded: isOpen ? null : item.solicitation_id })}
                                  className="text-primary font-medium hover:underline cursor-pointer"
                                  title="Show the solicited parts"
                                >
                                  {item.solicitation_number || "-"}
                                </button>
                                <StockCoverageGlyph
                                  stocked={item.stocked_part_count}
                                  quotable={item.quotable_part_count}
                                  entries={stockEntries}
                                />
                                <SolicitationRowBadges
                                  hasAmendmentIndicator={item.has_amendment_indicator}
                                  hasPostMatchAmendment={item.has_post_match_amendment}
                                  latestPostMatchAmendmentAt={item.latest_post_match_amendment_at}
                                  solicitationType={null}
                                  solicitationTypeLabel={null}
                                  idcBadge={false}
                                />
                                <WinHistoryBadge
                                  count={item.won_part_count ?? 0}
                                  lastWonOn={item.last_won_on}
                                  awards={item.won_parts ?? []}
                                  mode="solicitation"
                                />
                                {(item.rfq_count > 0 || item.quote_count > 0) && (
                                  <Link
                                    href="/rfq/worklist"
                                    aria-label={`View quotes (${item.quote_count})`}
                                    className={`${ROW_BADGE_BASE} border-primary/40 text-primary hover:bg-primary/10 cursor-pointer transition-colors`}
                                    title={`${item.rfq_count} vendor RFQ${item.rfq_count !== 1 ? "s" : ""} sent · ${item.quote_count} quote${item.quote_count !== 1 ? "s" : ""} — open the side-by-side comparison`}
                                  >
                                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    {item.quote_count}
                                  </Link>
                                )}
                                {item.staged_count > 0 && (
                                  <Link
                                    href="/rfq/batch"
                                    className={`${ROW_BADGE_BASE} border-amber-500/50 text-amber-700 hover:bg-amber-500/10 transition-colors`}
                                    title={`${item.staged_count} item${item.staged_count !== 1 ? "s" : ""} staged in the batch cart by ${item.staged_by_names.join(", ")} — RFQs not sent yet`}
                                  >
                                    In cart ({item.staged_count})
                                  </Link>
                                )}
                              </div>
                            </td>
                            <td className={`${tdClass} font-mono whitespace-nowrap`}>{item.pr_numbers[0] ?? "—"}</td>
                            <td className={tdClass}>
                              <WorkStatusSelect
                                value={item.work_status}
                                sharedCount={item.rfq_count}
                                onChange={(next) => { clearTour(); setProgress((p) => ({ ...p, [item.solicitation_id]: next })); }}
                              />
                            </td>
                            <td className={`${tdClass} whitespace-nowrap text-muted`}>{formatDate(item.issue_date)}</td>
                            <td className={`${tdClass} whitespace-nowrap`}>
                              <span className={dtc != null && dtc <= 3 ? "text-error font-semibold" : "text-foreground"}>
                                {formatDate(item.close_date)}
                              </span>
                              {dtc != null && (
                                <div className="text-[11px] text-muted">{dtc === 0 ? "closes today" : `${dtc}d left`}</div>
                              )}
                            </td>
                            <td className={tdClass}>{item.set_aside_label || item.set_aside || "—"}</td>
                            <td className={`${tdClass} text-right font-mono tabular-nums whitespace-nowrap`}>{formatCurrency(item.estimated_value)}</td>
                            <td className={`${tdClass} whitespace-nowrap`}><SolStatusBadge status={item.status} /></td>
                            <td className={tdClass}>
                              {item.assigned_user_name ? (
                                <span className="text-foreground">
                                  {item.assigned_user_name}
                                  {item.assigned_user_id === me.id && <span className="text-muted"> (you)</span>}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
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
                              <td colSpan={11} className="px-6 py-3">
                                <div className="space-y-4">
                                  <BidTermsPanel
                                    terms={item.bid_terms}
                                    definitions={data.bidTermDefinitions}
                                    firstArticle={item.first_article}
                                    solicitationType={null}
                                  />
                                  {item.solicitation_type_label && (
                                    <p className="text-[11px] text-muted">DLA type: {item.solicitation_type_label}.</p>
                                  )}
                                  <table className={tableClass}>
                                    <thead>
                                      <tr className={tableHeadRowClass}>
                                        <th className={thClass}>NSN</th>
                                        <th className={thClass}>Description</th>
                                        <th className={`${thClass} !text-right whitespace-nowrap`}>Qty / Unit</th>
                                        <th className={`${thClass} whitespace-nowrap`}>Your stock</th>
                                        <th className={`${thClass} !text-right`}>Unit Price</th>
                                        <th className={`${thClass} !text-right`} aria-label="Actions" />
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {parts.map((p) => (
                                        <tr key={p.id} className={rowClass}>
                                          <td className={`${tdClass} font-mono font-semibold whitespace-nowrap`}>
                                            <a
                                              href={`/library/parts?search_type=nsn_niin&q=${encodeURIComponent(p.nsn)}`}
                                              className="inline-flex items-center gap-1 text-primary hover:underline"
                                              title="Open in Parts Search"
                                            >
                                              {formatPartIdentity(p)}
                                            </a>
                                          </td>
                                          <td className={`${tdClass} text-foreground truncate max-w-[380px]`} title={p.description || undefined}>{p.description || "—"}</td>
                                          <td className={`${tdClass} text-right whitespace-nowrap font-mono tabular-nums`}>
                                            {p.quantity != null ? `${p.quantity.toLocaleString()}${p.unit_of_issue ? `/${p.unit_of_issue}` : ""}` : p.unit_of_issue || "—"}
                                          </td>
                                          <td className={`${tdClass} whitespace-nowrap`}>
                                            <MyStockCell summary={data.myStockByPart[p.id]} solicitedQty={p.quantity} />
                                          </td>
                                          <td className={`${tdClass} text-right whitespace-nowrap font-mono tabular-nums`}>{formatCurrency(p.unit_price)}</td>
                                          <td className={`${tdClass} text-right whitespace-nowrap`}>
                                            <span className="inline-flex items-center gap-1.5">
                                              {data.myStockByPart[p.id] && (
                                                <Button variant="outline" size="sm" href="/rfq/worklist">Use my stock</Button>
                                              )}
                                              <Button variant="primary" size="sm" href="/rfq/worklist">Get quotes</Button>
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>
        </div>
      </DemoSurface>

      <p className="text-xs text-muted">
        Solicitation numbers, NSNs, quantities, values, set-asides and bid terms
        are real, public DIBBS postings. The buyers, assignments, quotes and
        stock belong to a fictional supplier — in an account they would be
        your team&apos;s.
      </p>
    </div>
  );
}
