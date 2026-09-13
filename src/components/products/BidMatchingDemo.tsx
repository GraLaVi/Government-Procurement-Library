"use client";

import { useMemo, useState } from "react";
import { BidMatchDateMenu, type DateSelection } from "@/components/bidmatching/BidMatchDateMenu";
import { BidMatchResultsTable, type BidSortKey } from "@/components/bidmatching/BidMatchResultsTable";
import { DemoSurface } from "@/components/products/DemoSurface";
import {
  DEMO_BID_TERM_DEFINITIONS,
  type DemoBidMatchingData,
  type DemoRow,
} from "@/lib/demo/bidMatching";

/**
 * The clickable /bidmatching mock-up on /products/bid-matching.
 *
 * This is the real results table and the real date menu, driven from a static
 * fixture instead of the API. Filtering, searching, sorting and paging are
 * reimplemented here against an in-memory array — the app does all of that on
 * the server, and a demo that called the server would need an account.
 *
 * The tours matter more than the controls. Most visitors will not go hunting
 * through a twelve-column table, so each tour chip sets the whole demo to a
 * state that answers one question a prospect actually has, in one click.
 */

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const SEARCH_FIELDS = [
  { value: "reason", label: "Match reason", placeholder: "Search match reason…" },
  { value: "description", label: "Description", placeholder: "Search item description…" },
  { value: "nsn", label: "NSN / part #", placeholder: "Search NSN, NIIN or part #…" },
  { value: "solicitation", label: "Solicitation #", placeholder: "Search solicitation #…" },
] as const;
type SearchField = (typeof SEARCH_FIELDS)[number]["value"];

interface DemoState {
  runDate: string;
  source: "dibbs" | "sam";
  issueDate: string | null;
  hardOnly: boolean;
  flaggedOnly: boolean;
  search: string;
  searchField: SearchField;
  sortBy: BidSortKey;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}

interface Tour {
  id: string;
  chip: string;
  /** Shown under the chips once the tour is active: what to look at and why. */
  caption: string;
  apply: (base: DemoState, data: DemoBidMatchingData) => DemoState;
  /** Which rows arrive expanded, picked out of the rows the tour will show. */
  expand?: (rows: DemoRow[]) => string[];
}

/**
 * Every tour starts from the same view — the most recent DIBBS run, unsorted,
 * unfiltered — and then changes the one thing it is about.
 *
 * Without this a tour inherits wherever the visitor had wandered to, and
 * "what the team flagged" clicked from inside the SAM bucket produces an
 * empty table: the flagged rows are DIBBS rows. A tour that can show nothing
 * is worse than no tour.
 */
function baseline(state: DemoState, data: DemoBidMatchingData): DemoState {
  return {
    ...state,
    runDate: data.initialRunDate,
    source: "dibbs",
    issueDate: null,
    hardOnly: false,
    flaggedOnly: false,
    search: "",
    sortBy: "",
    sortDir: "desc",
    page: 1,
  };
}

const rowKey = (r: DemoRow) => `${r.source}-${r.result_id}`;

const TOURS: Tour[] = [
  {
    id: "why",
    chip: "Why did this match?",
    caption:
      "Every match carries its own reason. This one hit two profiles at once — an exact part you stock, and the set-aside you qualify for — and the chips underneath are the profile conditions that fired.",
    apply: baseline,
    expand: (rows) => {
      const hard = rows.find((r) => r.match_strength === "HARD" && r.matches.length > 1);
      return hard ? [rowKey(hard)] : [];
    },
  },
  {
    id: "hard",
    chip: "Just the exact hits",
    caption:
      "Hard hits matched on part identity — an NSN on your watchlist, or a CAGE you are an approved source for. Soft hits matched on a family you sell into. One switch separates them.",
    apply: (base, data) => ({ ...baseline(base, data), hardOnly: true }),
  },
  {
    id: "value",
    chip: "Biggest first",
    caption:
      "Estimated value comes from the quantity on the solicitation and what the item has historically sold for, so a day's matches can be ranked by what they are actually worth chasing.",
    apply: (base, data) => ({
      ...baseline(base, data), sortBy: "estimated_value", sortDir: "desc",
    }),
  },
  {
    id: "sam",
    chip: "The same day on SAM.gov",
    caption:
      "DIBBS is not the whole federal market. The same profiles run against SAM.gov postings, and that bucket sits beside the DIBBS one under the same run date.",
    apply: (base, data) => {
      const samRun = data.dateTree.find((g) => g.sam_bucket)?.run_date ?? base.runDate;
      return { ...baseline(base, data), source: "sam", runDate: samRun };
    },
  },
  {
    id: "flag",
    chip: "What the team flagged",
    caption:
      "Flags are shared across the account, not private to one login. Anyone on the team can star a solicitation to come back to, and everyone else sees it.",
    apply: (base, data) => ({ ...baseline(base, data), flaggedOnly: true }),
  },
];

function compare(a: DemoRow, b: DemoRow, key: BidSortKey): number {
  const pick = (r: DemoRow): string | number => {
    switch (key) {
      case "interested": return r.interested ? 1 : 0;
      case "solicitation": return r.solicitation_number ?? "";
      case "nsn": return r.nsn ?? r.mfg_part_number ?? "";
      case "quantity": return r.quantity ?? 0;
      case "estimated_value": return r.estimated_value ?? 0;
      case "posted": return r.issue_date;
      case "close_date": return r.close_date;
      default: return r.result_id;
    }
  };
  const av = pick(a);
  const bv = pick(b);
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).localeCompare(String(bv));
}

export function BidMatchingDemo({ data }: { data: DemoBidMatchingData }) {
  const [activeTour, setActiveTour] = useState<string | null>("why");
  const [flagged, setFlagged] = useState<Set<number>>(
    () => new Set(data.rows.filter((r) => r.interested).map((r) => r.result_id)),
  );
  const [state, setState] = useState<DemoState>(() =>
    TOURS[0].apply(
      {
        runDate: data.initialRunDate,
        source: "dibbs",
        issueDate: null,
        hardOnly: false,
        flaggedOnly: false,
        search: "",
        searchField: "reason",
        sortBy: "",
        sortDir: "desc",
        page: 1,
        pageSize: 10,
      },
      data,
    ),
  );

  const set = (patch: Partial<DemoState>) => setState((s) => ({ ...s, ...patch, page: patch.page ?? 1 }));

  // Flags live here rather than on the fixture rows so starring one in the
  // demo actually sticks for the session, the way it would in the app.
  const rows = useMemo(
    () => data.rows.map((r) => ({ ...r, interested: flagged.has(r.result_id) })),
    [data.rows, flagged],
  );

  const filtered = useMemo(() => {
    const term = state.search.trim().toLowerCase();
    const matchesSearch = (r: DemoRow) => {
      if (!term) return true;
      const haystack =
        state.searchField === "reason" ? r.match_reason ?? ""
        : state.searchField === "description" ? r.part_description ?? ""
        : state.searchField === "nsn" ? `${r.nsn ?? ""} ${r.niin ?? ""} ${r.mfg_part_number ?? ""}`
        : r.solicitation_number ?? "";
      return haystack.toLowerCase().includes(term);
    };

    const out = rows.filter(
      (r) =>
        r.run_date === state.runDate &&
        r.source === state.source &&
        (state.source === "sam" || state.issueDate === null || r.issue_date === state.issueDate) &&
        (!state.hardOnly || r.match_strength === "HARD") &&
        (!state.flaggedOnly || r.interested) &&
        matchesSearch(r),
    );

    // Default ordering is newest-first, which for a single run means the order
    // the fixture was authored in.
    if (!state.sortBy) return out;
    const dir = state.sortDir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => compare(a, b, state.sortBy) * dir);
  }, [rows, state]);

  const pageRows = useMemo(() => {
    const start = (state.page - 1) * state.pageSize;
    return filtered.slice(start, start + state.pageSize);
  }, [filtered, state.page, state.pageSize]);

  const tour = TOURS.find((t) => t.id === activeTour) ?? null;

  // Remounting the table on a tour change is what lets defaultExpandedKeys
  // take effect — it is initial state by design, so a tour that wants a row
  // open needs a fresh table rather than a prop change.
  const expandedKeys = tour?.expand?.(filtered) ?? [];
  const tableKey = `${activeTour ?? "none"}-${state.source}-${state.runDate}`;

  const applyTour = (t: Tour) => {
    setActiveTour(t.id);
    setState((s) => t.apply({ ...s }, data));
  };

  const clearTour = () => setActiveTour(null);

  const onDateSelect = (selection: DateSelection) => {
    clearTour();
    set({
      runDate: selection.runDate,
      source: selection.source,
      issueDate: selection.source === "dibbs" ? selection.issueDate : null,
    });
  };

  const searchPlaceholder =
    SEARCH_FIELDS.find((f) => f.value === state.searchField)?.placeholder ?? "Search…";

  return (
    <div className="space-y-4">
      {/* Tours. These are the demo's primary interface: a visitor who clicks
          nothing else still sees five different things the product does. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Show me
        </span>
        {TOURS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => applyTour(t)}
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

      {tour && (
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{tour.caption}</p>
      )}

      {/* The app chrome, rebuilt around the real components. The command bar
          mirrors /bidmatching's — same controls, same order — because the
          point of the demo is that this is what you actually get. */}
      <DemoSurface>
        {/* print-root + print-landscape: the table's toolbar carries a Print
            button, and these are the classes globals.css keys its
            print-just-this-record behaviour off. Without them the button
            would print the entire marketing page around the demo. */}
        <div className="print-root print-landscape rounded-xl border border-border bg-muted-light/40 p-3 dark:bg-background/40 sm:p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Bid-Matching</h3>
              <p className="text-sm text-muted">
                Solicitations matched to your bid-matching profiles.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-card-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Sample data
            </span>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card-bg p-2">
            <BidMatchDateMenu
              dateTree={data.dateTree}
              selectedRunDate={state.runDate}
              selectedIssueDate={state.issueDate}
              selectedSource={state.source}
              onSelect={onDateSelect}
            />
            <div className="w-px self-stretch bg-border" aria-hidden="true" />
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={state.hardOnly}
                onChange={(e) => { clearTour(); set({ hardOnly: e.target.checked }); }}
                className="rounded border-border"
              />
              Hard hits only
            </label>
            <button
              type="button"
              onClick={() => { clearTour(); set({ flaggedOnly: !state.flaggedOnly }); }}
              aria-pressed={state.flaggedOnly}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-colors ${
                state.flaggedOnly
                  ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              <span className={state.flaggedOnly ? "text-amber-500" : "text-muted/50"}>★</span>
              Flagged only
            </button>
            <div className="flex min-w-[260px] max-w-lg flex-1 items-stretch overflow-hidden rounded-lg border border-border focus-within:border-primary">
              <select
                value={state.searchField}
                onChange={(e) => { clearTour(); set({ searchField: e.target.value as SearchField, search: "" }); }}
                aria-label="Search field"
                className="cursor-pointer appearance-none border-0 bg-muted-light px-2 py-1.5 pr-6 text-xs text-foreground focus:outline-none dark:bg-background/60"
              >
                {SEARCH_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <input
                type="search"
                value={state.search}
                onChange={(e) => { clearTour(); set({ search: e.target.value }); }}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 border-0 bg-card-bg px-2 py-1.5 text-sm text-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Twelve columns do not fit a phone. The app puts this behind a
              login and an app shell built for desktop; a marketing page cannot,
              so the table scrolls inside its own box and says so. */}
          <p className="mb-2 text-xs text-muted sm:hidden">
            Swipe the table sideways to see every column.
          </p>

          <BidMatchResultsTable
            key={tableKey}
            results={pageRows}
            bidTermDefinitions={DEMO_BID_TERM_DEFINITIONS}
            isLoading={false}
            total={filtered.length}
            page={state.page}
            pageSize={state.pageSize}
            onPageChange={(page) => setState((s) => ({ ...s, page }))}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(pageSize) => set({ pageSize })}
            onPrint={() => window.print()}
            sortBy={state.sortBy}
            sortDir={state.sortDir}
            onSort={(key) => {
              clearTour();
              setState((s) => ({
                ...s,
                sortBy: key,
                sortDir: s.sortBy === key && s.sortDir === "desc" ? "asc" : "desc",
                page: 1,
              }));
            }}
            onToggleInterest={(result, interested) => {
              clearTour();
              setFlagged((prev) => {
                const next = new Set(prev);
                if (interested) next.add(result.result_id);
                else next.delete(result.result_id);
                return next;
              });
            }}
            defaultExpandedKeys={expandedKeys}
          />
        </div>
      </DemoSurface>

      <p className="text-xs text-muted">
        Solicitation numbers, NSNs, quantities, values and set-asides are real,
        public DIBBS and SAM.gov postings. The profiles and match reasons belong
        to a fictional supplier — in an account they would be yours.
      </p>
    </div>
  );
}
