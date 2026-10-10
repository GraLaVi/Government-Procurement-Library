"use client";

import { createPortal } from "react-dom";
import { useAnchoredPopover } from "@/components/library/WinAndFirstArticleBadges";
import {
  highlightHex,
  type HighlightBrush,
  type HighlightFilter,
  type HighlightLabel,
} from "@/lib/bidmatching/highlights";

const chip =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer";

function Dot({ color }: { color: string }) {
  return <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: highlightHex(color) }} aria-hidden="true" />;
}

/**
 * The highlighter and the "Show" filter, above the Bid-Matching results.
 *
 * Pick a color and the pointer marks rows with it; click a marked row again
 * to clear it. Esc (handled by the page) or a second click on the color puts
 * the highlighter down. "Show" narrows the list to one color, or to rows with
 * no color yet, with a count beside each choice.
 */
export function HighlightBar({
  labels,
  brush,
  onBrush,
  filter,
  onFilter,
  counts,
  staleCount,
  onRefresh,
  onManage,
}: {
  labels: HighlightLabel[];
  brush: HighlightBrush;
  onBrush: (brush: HighlightBrush) => void;
  filter: HighlightFilter;
  onFilter: (filter: HighlightFilter) => void;
  /** Rows per label id (as a string) and "none", for this bucket. */
  counts: Record<string, number>;
  /** Rows changed since the filter was applied that no longer match it. */
  staleCount: number;
  onRefresh: () => void;
  onManage: () => void;
}) {
  const { open, coords, btnRef, panelRef, toggle } = useAnchoredPopover();

  if (labels.length === 0) {
    return (
      <div className="no-print flex flex-wrap items-center gap-2 mb-2 text-xs text-muted">
        <span>Sort matches into your own piles with colors.</span>
        <button type="button" onClick={onManage} className="font-medium text-primary hover:underline cursor-pointer">
          Set up highlight colors
        </button>
      </div>
    );
  }

  const countOf = (key: string) => counts[key] ?? 0;
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const filterLabel = typeof filter === "number" ? labels.find((l) => l.id === filter) : undefined;
  const options: { value: HighlightFilter; name: string; color?: string; count: number }[] = [
    { value: null, name: "All rows", count: allCount },
    ...labels.map((l) => ({ value: l.id as HighlightFilter, name: l.name, color: l.color, count: countOf(String(l.id)) })),
    { value: "none", name: "No highlight", count: countOf("none") },
  ];

  return (
    <div className="no-print flex flex-wrap items-center gap-2 mb-2">
      <span className="text-xs font-semibold text-muted">Highlighter</span>
      {labels.map((l) => {
        const on = brush === l.id;
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => onBrush(on ? null : l.id)}
            aria-pressed={on}
            title={on ? "Click rows to mark them. Click here or press Esc to stop." : `Mark rows "${l.name}"`}
            className={`${chip} ${on ? "text-foreground" : "border-border text-foreground hover:border-muted"}`}
            style={on ? { borderColor: highlightHex(l.color), background: `color-mix(in srgb, ${highlightHex(l.color)} 18%, transparent)` } : undefined}
          >
            <Dot color={l.color} />
            {l.name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onBrush(brush === "erase" ? null : "erase")}
        aria-pressed={brush === "erase"}
        title="Click rows to clear their color"
        className={`${chip} ${brush === "erase" ? "border-muted bg-muted-light text-foreground" : "border-border text-muted hover:text-foreground"}`}
      >
        Eraser
      </button>
      {brush != null && (
        <span className="text-xs text-muted">
          Click rows to {brush === "erase" ? "clear them" : "mark them"} ·{" "}
          <kbd className="font-mono text-[10px] border border-border border-b-2 rounded px-1">Esc</kbd> to stop
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {staleCount > 0 && (
          <span className="text-xs text-muted">
            {staleCount} changed ·{" "}
            <button type="button" onClick={onRefresh} className="font-medium text-primary hover:underline cursor-pointer">
              Refresh list
            </button>
          </span>
        )}
        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
            filter != null ? "text-foreground" : "border-border text-muted hover:text-foreground"
          }`}
          style={filter != null ? { borderColor: filterLabel ? highlightHex(filterLabel.color) : "var(--primary)" } : undefined}
        >
          Show:
          {filterLabel && <Dot color={filterLabel.color} />}
          <span className="text-foreground">{filterLabel?.name ?? (filter === "none" ? "No highlight" : "All rows")}</span>
          <span aria-hidden="true">▾</span>
        </button>
        <button type="button" onClick={onManage} className="text-xs font-medium text-primary hover:underline cursor-pointer">
          Manage colors
        </button>
      </div>

      {open && coords && createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-56 rounded-md border border-border bg-background shadow-lg p-1"
        >
          {options.map((o, i) => (
            <div key={String(o.value)}>
              {i === options.length - 1 && <div className="my-1 border-t border-border" />}
              <button
                type="button"
                role="menuitemradio"
                aria-checked={filter === o.value}
                onClick={(e) => { toggle(e); onFilter(o.value); }}
                className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted-light cursor-pointer"
              >
                {o.color ? <Dot color={o.color} /> : <span className="w-2.5" aria-hidden="true" />}
                <span className="truncate">{o.name}</span>
                <span className={`ml-auto text-xs tabular-nums ${filter === o.value ? "text-primary font-semibold" : "text-muted"}`}>
                  {filter === o.value ? "✓" : o.count}
                </span>
              </button>
              {i === 0 && <div className="my-1 border-t border-border" />}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
