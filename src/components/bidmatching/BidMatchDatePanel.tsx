"use client";

import { useState, useEffect } from "react";

interface IssueDateEntry {
  issue_date: string;
  match_count: number;
}

interface RunDateGroup {
  run_date: string;
  total_count: number;
  issue_dates: IssueDateEntry[];
}

interface BidMatchDatePanelProps {
  dateTree: RunDateGroup[];
  selectedRunDate: string | null;
  selectedIssueDate: string | null;
  onSelect: (runDate: string, issueDate: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toString();
}

export function BidMatchDatePanel({
  dateTree,
  selectedRunDate,
  selectedIssueDate,
  onSelect,
}: BidMatchDatePanelProps) {
  const [expandedRunDate, setExpandedRunDate] = useState<string | null>(null);

  // Auto-expand the first run date on initial load
  useEffect(() => {
    if (dateTree.length > 0 && expandedRunDate === null) {
      setExpandedRunDate(dateTree[0].run_date);
    }
  }, [dateTree, expandedRunDate]);

  if (dateTree.length === 0) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Match History</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Browse by run date</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {dateTree.map((group) => {
          const isExpanded = expandedRunDate === group.run_date;
          const isActiveRun = selectedRunDate === group.run_date;

          return (
            <div key={group.run_date}>
              {/* Run date header */}
              <button
                onClick={() => setExpandedRunDate(isExpanded ? null : group.run_date)}
                className={`
                  w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors
                  border-b border-border/50
                  ${isActiveRun ? "bg-primary/5" : "hover:bg-muted-light/50"}
                `}
              >
                <svg
                  className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${isActiveRun ? "text-primary" : "text-foreground"}`}>
                    {formatDateFull(group.run_date)}
                  </span>
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-muted-light px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {formatCount(group.total_count)}
                </span>
              </button>

              {/* Issue dates (nested) */}
              {isExpanded && (
                <div className="bg-muted-light/30">
                  {group.issue_dates.map((entry) => {
                    const isActive =
                      selectedRunDate === group.run_date &&
                      selectedIssueDate === entry.issue_date;

                    return (
                      <button
                        key={entry.issue_date}
                        onClick={() => onSelect(group.run_date, entry.issue_date)}
                        className={`
                          w-full flex items-center gap-2 pl-10 pr-4 py-2 text-left transition-colors
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
                          className={`
                            ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0
                            ${isActive
                              ? "bg-white/20 text-white"
                              : "bg-muted-light text-muted-foreground"
                            }
                          `}
                        >
                          {formatCount(entry.match_count)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
