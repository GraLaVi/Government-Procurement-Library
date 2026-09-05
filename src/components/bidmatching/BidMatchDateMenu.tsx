"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface IssueDateEntry {
  issue_date: string;
  match_count: number;
}

interface SamBucket {
  match_count: number;
}

interface RunDateGroup {
  run_date: string;
  total_count: number;
  issue_dates: IssueDateEntry[];
  sam_bucket?: SamBucket | null;
}

// issueDate is null for a whole-run selection — one match run's entire DIBBS
// output, however long ago the solicitations were posted. That is what the run
// date row itself selects; the posted dates nested under it narrow it down.
export type DateSelection =
  | { source: "dibbs"; runDate: string; issueDate: string | null }
  | { source: "sam"; runDate: string };

interface BidMatchDateMenuProps {
  dateTree: RunDateGroup[];
  selectedRunDate: string | null;
  selectedIssueDate: string | null;
  selectedSource: "dibbs" | "sam";
  onSelect: (selection: DateSelection) => void;
}

const PANEL_WIDTH = 320;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// The DIBBS half of a run. total_count also carries the SAM bucket, which the
// whole-run row does not open, so it is the wrong number to badge that row
// with — the badge has to equal the list the row produces.
function dibbsTotal(group: RunDateGroup): number {
  return group.issue_dates.reduce((sum, e) => sum + e.match_count, 0);
}

// What clicking a run date means. Runs are usually DIBBS (the whole run,
// every posted date), but a run can be pure SAM, and then the row is the only
// way to reach its bucket.
function runWideSelection(group: RunDateGroup): DateSelection {
  return group.issue_dates.length > 0
    ? { source: "dibbs", runDate: group.run_date, issueDate: null }
    : { source: "sam", runDate: group.run_date };
}

function runWideCount(group: RunDateGroup): number {
  return group.issue_dates.length > 0
    ? dibbsTotal(group)
    : group.sam_bucket?.match_count ?? 0;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toString();
}

// Compact date selector for the bid-matching page. Replaces the former 288px
// left-hand BidMatchDatePanel column: the run-date / posted-date tree is
// unchanged, it just lives in a dropdown now so the results table gets the
// full page width. The trigger reads back the current selection so the chosen
// date stays visible without opening anything.
//
// The panel is portaled to <body> and fixed-positioned so the surrounding
// toolbar's overflow can't clip it, matching SamDocumentsButton.
export function BidMatchDateMenu({
  dateTree,
  selectedRunDate,
  selectedIssueDate,
  selectedSource,
  onSelect,
}: BidMatchDateMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [expandedRunDate, setExpandedRunDate] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click, Escape, or the page scrolling out from under the
  // fixed-positioned panel. Scrolls that originate inside the panel are
  // ignored so its own list stays scrollable.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  if (dateTree.length === 0) return null;

  const activeGroup = dateTree.find((g) => g.run_date === selectedRunDate) ?? null;
  const activeCount =
    activeGroup == null
      ? null
      : selectedSource === "sam"
        ? activeGroup.sam_bucket?.match_count ?? 0
        : selectedIssueDate === null
          ? dibbsTotal(activeGroup)
          : activeGroup.issue_dates.find((e) => e.issue_date === selectedIssueDate)?.match_count ?? 0;

  const leafLabel =
    activeGroup == null
      ? "Select a date"
      : selectedSource === "sam"
        ? "SAM opportunities"
        : selectedIssueDate
          ? `Posted ${formatDate(selectedIssueDate)}`
          : activeGroup.issue_dates.length === 1
            // "All posted dates" over a single date reads as a summary of
            // something bigger than it is; name the date instead.
            ? `Posted ${formatDate(activeGroup.issue_dates[0].issue_date)}`
            : "All posted dates";

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // Open the panel on whichever run is currently selected.
      setExpandedRunDate(selectedRunDate ?? dateTree[0].run_date);
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) {
        setCoords({
          top: rect.bottom + 4,
          left: Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8)),
        });
      }
    }
  };

  const choose = (selection: DateSelection) => {
    onSelect(selection);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer
          ${open
            ? "border-primary bg-primary/5"
            : "border-border bg-muted-light hover:border-primary"
          }
        `}
      >
        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {activeGroup ? formatDateFull(activeGroup.run_date) : "Match history"}
          <span className="font-normal text-muted" aria-hidden="true">›</span>
          {leafLabel}
        </span>
        {activeCount !== null && (
          <span className="text-xs font-medium text-white bg-primary px-2 py-0.5 rounded-full flex-shrink-0">
            {formatCount(activeCount)}
          </span>
        )}
        <svg
          className={`w-3 h-3 text-muted transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: PANEL_WIDTH, zIndex: 60 }}
          className="max-h-[340px] overflow-y-auto rounded-lg border border-border bg-card-bg shadow-lg"
        >
          <div className="sticky top-0 bg-card-bg px-4 py-2.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Match History</h3>
            <p className="text-xs text-muted mt-0.5">Browse by run date</p>
          </div>

          {dateTree.map((group) => {
            const isExpanded = expandedRunDate === group.run_date;
            const isActiveRun = selectedRunDate === group.run_date;
            const runSelection = runWideSelection(group);
            // The run row IS the whole-run view, so it only reads as selected
            // when the selection is the run itself rather than one of its
            // children. A child selection keeps the softer container tint.
            const wholeRunSelected =
              isActiveRun &&
              selectedSource === runSelection.source &&
              (runSelection.source === "sam" || selectedIssueDate === null);
            // Nothing to drill into unless there is more than one child; a run
            // with a single posted date (or only a SAM bucket) already shows
            // everything it has on the row itself.
            const childCount = group.issue_dates.length + (group.sam_bucket?.match_count ? 1 : 0);
            const expandable = childCount > 1;

            return (
              <div key={group.run_date}>
                {/* Two controls, one row: the chevron opens the posted-date
                    breakdown, the rest of the row selects the whole run. They
                    are siblings rather than nested because a button inside a
                    button is invalid HTML and unreachable by keyboard. */}
                <div
                  className={`
                    flex items-stretch border-b border-border/50
                    ${wholeRunSelected ? "bg-primary" : isActiveRun ? "bg-primary/5" : ""}
                  `}
                >
                  {expandable ? (
                    <button
                      type="button"
                      onClick={() => setExpandedRunDate(isExpanded ? null : group.run_date)}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Hide" : "Show"} posted dates for ${formatDateFull(group.run_date)}`}
                      className={`
                        flex items-center pl-4 pr-1 transition-colors cursor-pointer
                        ${wholeRunSelected ? "" : "hover:bg-muted-light/50"}
                      `}
                    >
                      <svg
                        /* theme-ok: white on the selected row's primary fill */
                        className={`
                          w-3.5 h-3.5 transition-transform flex-shrink-0
                          ${wholeRunSelected ? "text-white" : "text-muted"}
                          ${isExpanded ? "rotate-90" : ""}
                        `}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    // Keeps the run labels on one vertical line whether or not
                    // the run has anything to expand.
                    <span aria-hidden="true" className="pl-4 pr-1 flex items-center">
                      <span className="block w-3.5" />
                    </span>
                  )}

                  <button
                    type="button"
                    aria-pressed={wholeRunSelected}
                    onClick={() => choose(runSelection)}
                    className={`
                      flex-1 min-w-0 flex items-center gap-2 pl-2 pr-4 py-2.5 text-left transition-colors cursor-pointer
                      ${wholeRunSelected ? "" : "hover:bg-muted-light/50"}
                    `}
                  >
                    <span
                      /* theme-ok: white on the selected row's primary fill */
                      className={`
                        flex-1 min-w-0 text-sm font-medium
                        ${wholeRunSelected ? "text-white" : isActiveRun ? "text-primary" : "text-foreground"}
                      `}
                    >
                      {formatDateFull(group.run_date)}
                    </span>
                    <span
                      /* theme-ok: white on the selected row's primary fill */
                      className={`
                        text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0
                        ${wholeRunSelected ? "bg-white/20 text-white" : "text-muted bg-muted-light"}
                      `}
                    >
                      {formatCount(runWideCount(group))}
                    </span>
                  </button>
                </div>

                {/* `expandable` gates this as well as the chevron: the panel
                    auto-expands whichever run is selected when it opens, and
                    without the guard a single-child run would render a leaf
                    that just repeats the row above it. */}
                {isExpanded && expandable && (
                  <div className="bg-muted-light/30">
                    {group.issue_dates.map((entry) => {
                      const isActive =
                        selectedSource === "dibbs" &&
                        selectedRunDate === group.run_date &&
                        selectedIssueDate === entry.issue_date;

                      return (
                        <button
                          key={entry.issue_date}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() =>
                            choose({
                              source: "dibbs",
                              runDate: group.run_date,
                              issueDate: entry.issue_date,
                            })
                          }
                          className={`
                            w-full flex items-center gap-2 pl-10 pr-4 py-2 text-left transition-colors cursor-pointer
                            ${isActive
                              ? "bg-primary text-white"
                              : "hover:bg-muted-light text-foreground"
                            }
                          `}
                        >
                          <span className={`text-sm ${isActive ? "font-medium" : ""}`}>
                            Posted {formatDate(entry.issue_date)}
                          </span>
                          <span
                            /* theme-ok: white on the selected row's primary fill */
                            className={`
                              ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0
                              ${isActive ? "bg-white/20 text-white" : "bg-muted-light text-muted"}
                            `}
                          >
                            {formatCount(entry.match_count)}
                          </span>
                        </button>
                      );
                    })}

                    {/* SAM-only bucket (pure SAM opportunities with no linked DIBBS sol) */}
                    {group.sam_bucket && group.sam_bucket.match_count > 0 && (() => {
                      const isActive =
                        selectedSource === "sam" &&
                        selectedRunDate === group.run_date;
                      return (
                        <button
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => choose({ source: "sam", runDate: group.run_date })}
                          className={`
                            w-full flex items-center gap-2 pl-10 pr-4 py-2 text-left transition-colors cursor-pointer
                            ${isActive
                              ? "bg-primary text-white"
                              : "hover:bg-muted-light text-foreground"
                            }
                          `}
                        >
                          <span className={`text-sm ${isActive ? "font-medium" : ""}`}>
                            SAM Opportunities
                          </span>
                          <span
                            /* theme-ok: white on the selected row's primary fill */
                            className={`
                              ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0
                              ${isActive ? "bg-white/20 text-white" : "bg-muted-light text-muted"}
                            `}
                          >
                            {formatCount(group.sam_bucket.match_count)}
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
