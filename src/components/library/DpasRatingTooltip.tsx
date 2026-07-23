"use client";

import { useState, useRef, useEffect } from "react";
import { useCodeDefinitions } from "@/lib/hooks/useCodeDefinitions";

// ============================================================================
// DpasRatingTooltip — hover popover describing a DPAS priority rating.
// ============================================================================
// DPAS (Defense Priorities and Allocations System) priority ratings are a
// 2-char priority level (DO/DX) followed by a 2-char program identification
// symbol, e.g. "DOA1" (sometimes written "DO-A1"). The two halves are seeded
// into code_definitions as separate code_types (DPAS_PRIORITY, DPAS_PROGRAM;
// migration 024). This component resolves each half and composes a popover.
//
// The two useCodeDefinitions() calls share a module-level cache, so rendering
// this for every row in a table still triggers only one network fetch per
// code_type per session.
// ============================================================================

// Parse defensively: strip any separators/whitespace, take the first two chars
// as the priority level and the next two as the program symbol. Returns null
// for anything that isn't a recognizable DO*/DX* rating so the caller can fall
// back to plain text.
export function parseDpasRating(
  raw: string | null | undefined,
): { priority: string; program: string } | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const priority = cleaned.slice(0, 2);
  if (priority !== "DO" && priority !== "DX") return null;
  const program = cleaned.slice(2, 4);
  if (program.length < 2) return null;
  return { priority, program };
}

interface DpasRatingTooltipProps {
  rating: string | null | undefined;
}

export function DpasRatingTooltip({ rating }: DpasRatingTooltipProps) {
  const { byCode: priorityByCode } = useCodeDefinitions("DPAS_PRIORITY");
  const { byCode: programByCode } = useCodeDefinitions("DPAS_PROGRAM");

  const parsed = parseDpasRating(rating);
  const priorityDef = parsed ? priorityByCode.get(parsed.priority) : undefined;
  const programDef = parsed ? programByCode.get(parsed.program) : undefined;

  const display = rating && rating.trim() ? rating : "—";

  const [show, setShow] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);

  // Fixed positioning (prefer above, clamp to viewport) so the popover isn't
  // clipped by the table's overflow container. Mirrors ui/Tooltip.
  useEffect(() => {
    if (show && triggerRef.current && popRef.current) {
      const t = triggerRef.current.getBoundingClientRect();
      const p = popRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const w = p.width || 288;
      const h = p.height || 120;
      const spacing = 8;

      let left = t.left + t.width / 2 - w / 2;
      left = Math.max(8, Math.min(left, vw - w - 8));
      const top = t.top >= h + spacing ? t.top - h - spacing : t.bottom + spacing;

      setStyle({ position: "fixed", left: `${left}px`, top: `${top}px`, zIndex: 9999 });
    }
  }, [show]);

  // No resolvable DPAS meaning (unparseable value, or codes not yet loaded /
  // seeded) — render the raw value as plain text, matching the other columns.
  if (!parsed || (!priorityDef && !programDef)) {
    return <span className="text-xs font-medium text-foreground">{display}</span>;
  }

  const headerCode = `${parsed.priority}-${parsed.program}`;

  return (
    <span
      ref={triggerRef}
      className="relative inline-block text-xs font-medium text-primary cursor-help underline decoration-dotted underline-offset-2 hover:decoration-solid"
      aria-label={`DPAS priority rating ${headerCode}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {display}
      {show && (
        <span
          ref={popRef}
          style={style}
          className="fixed w-72 max-w-[90vw] text-xs rounded shadow-lg whitespace-normal break-words overflow-hidden bg-card-bg border border-border text-foreground"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          <div className="font-bold px-2 py-1.5 bg-muted-light">
            DPAS Priority Rating: {headerCode}
          </div>
          <div className="p-2 space-y-1.5">
            {priorityDef && (
              <div>
                <span className="font-semibold">{parsed.priority}</span>
                {priorityDef.description ? ` — ${priorityDef.description}` : ""}
              </div>
            )}
            {programDef ? (
              <div>
                <span className="font-semibold">{parsed.program}</span>
                {" — "}
                {programDef.label}
                {programDef.description ? `: ${programDef.description}` : ""}
              </div>
            ) : (
              <div className="text-muted">
                <span className="font-semibold">{parsed.program}</span> — program symbol not recognized
              </div>
            )}
          </div>
        </span>
      )}
    </span>
  );
}
