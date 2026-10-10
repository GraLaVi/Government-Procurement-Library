"use client";

import { createPortal } from "react-dom";
import { useAnchoredPopover } from "@/components/library/WinAndFirstArticleBadges";
import { tdDenseClass } from "@/components/rfq/TableCard";

/** One entry on DLA's approved source list (manufacturer_parts.source_dla).
 *  `nsn` is optional, for a row that spans several parts. */
export interface ApprovedSource {
  cage_code: string;
  part_number: string;
  nsn?: string | null;
}

/**
 * The "Appr. Source" cell on /bidmatching: the first
 * approved source's CAGE. With more than one, "+N" opens a popover listing
 * every CAGE and part number (and NSN, when the row's sources span more than
 * one part); with one, its part number is in the tooltip.
 */
export function ApprovedSourceCell({ sources }: { sources: ApprovedSource[] }) {
  const { open, coords, btnRef, panelRef, toggle } = useAnchoredPopover();

  if (sources.length === 0) {
    return <td className={`${tdDenseClass} text-muted`}>—</td>;
  }
  const [first, ...rest] = sources;
  if (rest.length === 0) {
    return (
      <td
        className={`${tdDenseClass} data-field whitespace-nowrap`}
        title={`Part number ${first.part_number}${first.nsn ? ` (NSN ${first.nsn})` : ""}`}
      >
        {first.cage_code}
      </td>
    );
  }
  const showNsn = new Set(sources.map((s) => s.nsn).filter(Boolean)).size > 1;
  return (
    <td className={`${tdDenseClass} data-field whitespace-nowrap`}>
      {first.cage_code}
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`${sources.length} approved sources — show CAGEs and part numbers`}
        className="ml-1.5 text-[10px] font-semibold text-muted hover:text-primary border border-border rounded px-1 py-0.5 cursor-pointer"
      >
        +{rest.length}
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className={`${showNsn ? "w-96" : "w-72"} rounded-md border border-border bg-background shadow-lg p-3`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">
            Approved sources ({sources.length})
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted">
                  {showNsn && <th className="pb-1 pr-3 font-medium">NSN</th>}
                  <th className="pb-1 pr-3 font-medium">CAGE</th>
                  <th className="pb-1 font-medium">Part number</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={`${s.nsn ?? ""}-${s.cage_code}-${s.part_number}`}>
                    {showNsn && <td className="py-0.5 pr-3 data-field text-foreground whitespace-nowrap">{s.nsn}</td>}
                    <td className="py-0.5 pr-3 data-field text-foreground">{s.cage_code}</td>
                    <td className="py-0.5 data-field text-foreground break-all">{s.part_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>,
        document.body
      )}
    </td>
  );
}
