"use client";

import { useCallback, useMemo, useState } from "react";
import { TableCard } from "@/components/rfq/TableCard";
import { RfqPipelineTable, type PipelineSortKey } from "@/components/rfq/RfqPipelineTable";
import { RfqRecord } from "@/components/rfq/RfqRecord";
import { ToolbarButton } from "@/components/ui/PrintButton";
import { DemoSurface } from "@/components/products/DemoSurface";
import {
  WORK_STATUS_LABELS,
  WORK_STATUS_ORDER,
  rfqStatusLabel,
  type RfqListItem,
  type RfqWorkStatus,
} from "@/lib/rfq/types";
import { formatDateMmDdYyyy } from "@/lib/dates";
import type { DemoRfqData } from "@/lib/demo/rfq";

/**
 * The clickable RFQ mock-up on /products/rfq: the RFQ Pipeline, and the
 * record behind a row.
 *
 * Both screens are the real components — RfqPipelineTable is what /rfq
 * renders and RfqRecord is what /rfq/:id renders — on a static fixture. The
 * page-level plumbing they normally sit in (server-side sort, the created-by
 * filter, the Complete action's PATCH) is reimplemented here against the
 * in-memory rows, so a visitor can sort, filter, move a progress pill and
 * mark a bid sent, and see the same result the app would show.
 */

const ALL = "all";

interface DemoState {
  filterUser: string;
  sortBy: PipelineSortKey;
  sortDir: "asc" | "desc";
  /** RFQ id whose record is open, or null for the pipeline. */
  openId: number | null;
}

interface Tour {
  id: string;
  chip: string;
  caption: string;
  apply: (base: DemoState) => DemoState;
}

const BASELINE: DemoState = { filterUser: ALL, sortBy: "", sortDir: "desc", openId: null };

const TOURS: Tour[] = [
  {
    id: "ready",
    chip: "What's ready to bid",
    caption:
      "Sorted by progress, the RFQs furthest along come first. A green Ready badge means every quoted line that came back has a price to government — the bid can go out. The progress pill is editable here, and it belongs to the solicitation: three vendors quoted for one solicitation are three rows sharing one value.",
    apply: () => ({ ...BASELINE, sortBy: "progress", sortDir: "desc" }),
  },
  {
    id: "record",
    chip: "Open a priced quote",
    caption:
      "The record behind a row: who it went to, what was asked, and the vendor's structured answer — unit price, quantity, lead time, alternates. Under the quoted line, what the buyer did to it: the markup, shipping and the resulting price to government, with a name and a date.",
    apply: () => ({ ...BASELINE, openId: 124 }),
  },
  {
    id: "due",
    chip: "Two dates, closing soonest first",
    caption:
      "Bid due is the government's deadline. Quote due is the vendor's deadline to you, set earlier so there is time to price before the solicitation closes. When a quote window passes with no reply the row goes Stale, and GPH has already sent the vendor two reminders by then.",
    apply: () => ({ ...BASELINE, sortBy: "bid_due", sortDir: "asc" }),
  },
  {
    id: "mine",
    chip: "One buyer's RFQs",
    caption:
      "RFQs belong to the organization. Every buyer sees the whole pipeline, filters down to their own or a teammate's, and the Updated-by column says who last moved a row — so covering for someone on vacation is a filter change, not a forwarded inbox.",
    apply: () => ({ ...BASELINE, filterUser: "1" }),
  },
  {
    id: "bid",
    chip: "After the bid goes out",
    caption:
      "Clicking Complete on a record marks the bid as sent to the government. Because progress is tracked per solicitation, that one click moves every RFQ sent for it — and the quote carries a Bid sent badge from then on.",
    apply: () => ({ ...BASELINE, openId: 117 }),
  },
];

function compare(a: RfqListItem, b: RfqListItem, key: PipelineSortKey): number {
  switch (key) {
    case "vendor":
      return (a.primary_vendor_name ?? "").localeCompare(b.primary_vendor_name ?? "");
    case "updated_by":
      return (a.updated_by_name ?? "").localeCompare(b.updated_by_name ?? "");
    case "progress":
      return (
        WORK_STATUS_ORDER.indexOf(a.work_status ?? "unworked") -
        WORK_STATUS_ORDER.indexOf(b.work_status ?? "unworked")
      );
    case "bid_due":
      return (a.bid_due_date ?? "9999").localeCompare(b.bid_due_date ?? "9999");
    case "sent":
      return (a.sent_at ?? "").localeCompare(b.sent_at ?? "");
    default:
      return 0;
  }
}

export function RfqDemo({ data }: { data: DemoRfqData }) {
  const [activeTour, setActiveTour] = useState<string | null>(TOURS[0].id);
  const [state, setState] = useState<DemoState>(() => TOURS[0].apply(BASELINE));
  // Progress overrides by solicitation id — the same key the app stores it
  // under, so moving one row moves its siblings exactly as it does there.
  const [progress, setProgress] = useState<Record<number, RfqWorkStatus>>({});

  const rows = useMemo(
    () =>
      data.rows.map((r) =>
        r.source_solicitation_id && progress[r.source_solicitation_id]
          ? { ...r, work_status: progress[r.source_solicitation_id] }
          : r,
      ),
    [data.rows, progress],
  );

  const visible = useMemo(() => {
    const out = rows.filter(
      (r) => state.filterUser === ALL || String(r.created_by_user_id) === state.filterUser,
    );
    if (!state.sortBy) return out;
    const dir = state.sortDir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => compare(a, b, state.sortBy) * dir);
  }, [rows, state.filterUser, state.sortBy, state.sortDir]);

  const applyTour = (t: Tour) => {
    setActiveTour(t.id);
    setState((s) => t.apply(s));
  };
  const clearTour = () => setActiveTour(null);

  // First click picks the direction each column is actually useful in — the
  // same rule the pipeline page applies.
  const handleSort = (key: PipelineSortKey) => {
    clearTour();
    setState((s) =>
      key === s.sortBy
        ? { ...s, sortDir: s.sortDir === "asc" ? "desc" : "asc" }
        : {
            ...s,
            sortBy: key,
            sortDir: key === "bid_due" || key === "vendor" || key === "updated_by" ? "asc" : "desc",
          },
    );
  };

  const handleProgressChange = (row: RfqListItem, next: RfqWorkStatus) => {
    if (!row.source_solicitation_id) return;
    clearTour();
    setProgress((p) => ({ ...p, [row.source_solicitation_id as number]: next }));
  };

  // Answer the pipeline's own links in place: an RFQ reference the fixture
  // has a record for opens here; anything else falls through to the prompt.
  const onNavigate = useCallback(
    (href: string) => {
      const m = /^\/rfq\/(\d+)$/.exec(href);
      if (!m) return false;
      const id = Number(m[1]);
      if (!data.records[id]) return false;
      setActiveTour(null);
      setState((s) => ({ ...s, openId: id }));
      return true;
    },
    [data.records],
  );

  const record = state.openId !== null ? data.records[state.openId] : null;
  const recordWork =
    record && record.rfq.source_solicitation_id && progress[record.rfq.source_solicitation_id]
      ? progress[record.rfq.source_solicitation_id]
      : record?.rfq.work_status ?? null;

  return (
    <div className="space-y-4">
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

      {activeTour && (
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          {TOURS.find((t) => t.id === activeTour)?.caption}
        </p>
      )}

      <DemoSurface
        onNavigate={onNavigate}
        prompt="RFQs are an add-on on any paid plan."
        cta={{ href: "/pricing#add-ons", label: "See pricing →" }}
      >
        <div className="rounded-xl border border-border bg-muted-light/40 p-3 dark:bg-background/40 sm:p-4 lg:p-6">
          {record ? (
            <div className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => { clearTour(); setState((s) => ({ ...s, openId: null })); }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-card-foreground hover:border-primary/50 hover:text-primary"
                >
                  ← All RFQs
                </button>
                <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="data-field text-sm font-semibold text-muted">
                      RFQ-{record.rfq.reference_number}
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">{record.rfq.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      Created {formatDateMmDdYyyy(record.rfq.created_at)}
                      {record.rfq.response_due_date
                        ? ` · Quote due ${formatDateMmDdYyyy(record.rfq.response_due_date)}`
                        : ""}
                      {record.rfq.status !== "sent" ? ` · ${rfqStatusLabel(record.rfq.status)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {recordWork === "bid" ? (
                      <ToolbarButton
                        disabled
                        title="A bid has been sent to the government for this solicitation. Change it from the RFQ Pipeline if that was wrong."
                      >
                        <svg className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {WORK_STATUS_LABELS.bid}
                      </ToolbarButton>
                    ) : (
                      <ToolbarButton
                        tone="primary"
                        onClick={() => {
                          const solId = record.rfq.source_solicitation_id;
                          if (!solId) return;
                          clearTour();
                          setProgress((p) => ({ ...p, [solId]: "bid" }));
                        }}
                        title="Mark the bid as sent to the government. Progress is tracked per solicitation, so this also moves any other RFQs you sent for it."
                      >
                        Complete
                      </ToolbarButton>
                    )}
                  </div>
                </div>
              </div>
              <RfqRecord rfq={{ ...record.rfq, work_status: recordWork }} responses={record.responses} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">RFQ Pipeline</h3>
                  <p className="mt-1 text-sm text-muted">
                    Every RFQ your team has sent, where it stands, and whether it&apos;s priced and ready to bid.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-card-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Sample data
                </span>
              </div>

              <TableCard
                header={
                  <>
                    <label className="text-xs text-muted">Created by</label>
                    <select
                      className="rounded-md border border-border bg-card-bg px-2.5 py-1.5 text-sm text-card-foreground"
                      value={state.filterUser}
                      onChange={(e) => { clearTour(); setState((s) => ({ ...s, filterUser: e.target.value })); }}
                    >
                      <option value={ALL}>Everyone</option>
                      {data.contributors.map((c) => (
                        <option key={c.user_id} value={String(c.user_id)}>
                          {c.name} ({c.rfq_count})
                        </option>
                      ))}
                    </select>
                  </>
                }
              >
                <p className="mb-2 text-xs text-muted sm:hidden">
                  Swipe the table sideways to see every column.
                </p>
                <RfqPipelineTable
                  rfqs={visible}
                  sortBy={state.sortBy}
                  sortDir={state.sortDir}
                  onSort={handleSort}
                  onProgressChange={handleProgressChange}
                />
              </TableCard>
            </div>
          )}
        </div>
      </DemoSurface>

      <p className="text-xs text-muted">
        Solicitation numbers, NSNs, descriptions and quantities are real,
        public DIBBS postings. The buyers, vendors, quotes and prices belong to
        a fictional supplier — in an account they would be yours, and private.
      </p>
    </div>
  );
}
