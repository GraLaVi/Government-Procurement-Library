"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import type { ResultsLayout } from "@/lib/preferences/resultsLayout";

export interface DetailSection {
  /** Stable section id — used for the tab id, the jump-rail target, and the
   *  linear section anchor. */
  id: string;
  /** Shown as the tab label and the linear section heading. May already
   *  include a count, e.g. "Contacts (3)". */
  label: string;
  /** The section body — the existing panel element. */
  content: ReactNode;
  /** Optional per-section action (e.g. an <ExportCsvButton compact />). In
   *  tabs mode it sits beside the tab strip for the active section; in linear
   *  mode it sits in that section's heading row. */
  action?: ReactNode;
}

interface DetailSectionsProps {
  layout: ResultsLayout;
  sections: DetailSection[];
  /** Active tab id (tabs mode). Also seeds the jump-rail highlight. */
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Linear-only page actions (Print / Export all). Ignored in tabs mode. */
  toolbar?: ReactNode;
}

/**
 * Renders a set of detail sections either as tabs (one at a time — the
 * historical default) or as a linear one-pager (every section stacked, with a
 * sticky jump-rail). Both vendor and part detail feed the same section array in.
 */
export function DetailSections({
  layout,
  sections,
  activeTab,
  onTabChange,
  toolbar,
}: DetailSectionsProps) {
  if (layout === "linear") {
    return (
      <LinearSections
        sections={sections}
        activeTab={activeTab}
        onTabChange={onTabChange}
        toolbar={toolbar}
      />
    );
  }

  const active = sections.find((s) => s.id === activeTab);
  const tabs = sections.map((s) => ({ id: s.id, label: s.label }));

  return (
    <>
      {/* Tab strip paired with the active section's action + page toolbar
          (e.g. Print) so they sit inline with the tab labels. */}
      <div className="px-4 pt-3 flex items-end justify-between gap-3">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
        <div className="flex items-center gap-2">
          {active?.action}
          {toolbar}
        </div>
      </div>

      <div className="p-3">
        {sections.map((s) => (
          <TabPanel key={s.id} tabId={s.id} activeTab={activeTab}>
            {s.content}
          </TabPanel>
        ))}
      </div>
    </>
  );
}

function LinearSections({
  sections,
  activeTab,
  onTabChange,
  toolbar,
}: Omit<DetailSectionsProps, "layout">) {
  // Highlight whichever section is currently in view; seed from activeTab and
  // update as the user scrolls or clicks a rail chip.
  const [visibleId, setVisibleId] = useState(activeTab);
  const containerRef = useRef<HTMLDivElement>(null);
  // Stable key so the observer only re-inits when the section set changes,
  // not on every parent re-render (the parent rebuilds `sections` each render).
  const sectionKey = sections.map((s) => s.id).join(",");

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-section-id]"),
    );
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          const id = visible.target.getAttribute("data-section-id");
          if (id) setVisibleId(id);
        }
      },
      // Bias the "active" band toward the top of the viewport, under the rail.
      { rootMargin: "-72px 0px -55% 0px", threshold: 0 },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [sectionKey]);

  const jumpTo = (id: string) => {
    setVisibleId(id);
    onTabChange(id);
    document
      .getElementById(`section-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* Sticky jump-rail — repurposes the tab labels as in-page anchors.
          Hidden when printing (see .no-print in globals.css). */}
      <div className="no-print sticky top-0 z-10 bg-card-bg/95 backdrop-blur border-b border-border">
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 overflow-x-auto" role="navigation" aria-label="Jump to section">
            {sections.map((s) => {
              const isActive = visibleId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpTo(s.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-muted-light"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          {toolbar && <div className="flex-shrink-0">{toolbar}</div>}
        </div>
      </div>

      {/* Stacked sections, each rendered as its own card on an inset panel
          with a tinted header strip — the strongest, most obvious separation.
          Each section keeps its own empty state via `content`. */}
      <div ref={containerRef} className="flex flex-col gap-3 bg-background p-3">
        {sections.map((s) => (
          <section
            key={s.id}
            id={`section-${s.id}`}
            data-section-id={s.id}
            className="scroll-mt-16 overflow-hidden rounded-lg border border-border bg-card-bg shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2.5">
              <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
              {s.action}
            </div>
            <div className="px-4 pt-3.5 pb-4">{s.content}</div>
          </section>
        ))}
      </div>
    </>
  );
}

/**
 * Detail page-level actions (Advanced tier), used in both layouts:
 *  - Print the whole record. In the linear layout everything is already
 *    mounted; in tabs the host loads + expands all sections first (hence the
 *    optional `printPreparing` state), so the printout is always complete.
 *  - Export a single combined CSV of every section (linear only — pass
 *    `onExportAll` to show it).
 */
export function DetailToolbar({
  onPrint,
  onExportAll,
  printPreparing = false,
}: {
  onPrint: () => void;
  onExportAll?: () => void;
  printPreparing?: boolean;
}) {
  const btn =
    "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-card-bg text-card-foreground text-xs font-medium transition-colors hover:bg-muted-light hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait disabled:hover:bg-card-bg disabled:hover:border-border";

  // Downloads land silently in the browser's Downloads folder, so flash a
  // "Downloaded" confirmation on the button for a couple of seconds — enough
  // signal that the file was created without needing a global toast system.
  const [justExported, setJustExported] = useState(false);
  const exportTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (exportTimer.current) window.clearTimeout(exportTimer.current);
    },
    [],
  );
  const handleExport = () => {
    onExportAll?.();
    setJustExported(true);
    if (exportTimer.current) window.clearTimeout(exportTimer.current);
    exportTimer.current = window.setTimeout(() => setJustExported(false), 2500);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrint}
        disabled={printPreparing}
        className={btn}
        title="Print this record"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V4h12v5M6 18H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-1M6 14h12v6H6z" />
        </svg>
        <span>{printPreparing ? "Preparing…" : "Print"}</span>
      </button>
      {onExportAll && (
        <button
          type="button"
          onClick={handleExport}
          className={
            justExported
              ? "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-success/40 bg-success/10 text-success text-xs font-medium transition-colors"
              : btn
          }
          title={
            justExported
              ? "Saved to your Downloads folder"
              : "Download every section as one CSV"
          }
        >
          {justExported ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
          )}
          <span aria-live="polite">{justExported ? "Downloaded" : "Export all"}</span>
        </button>
      )}
    </div>
  );
}

export default DetailSections;
