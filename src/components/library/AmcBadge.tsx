"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { rowBadgeClass } from "@/components/library/RowBadge";
import { useAnchoredPopover } from "@/components/library/WinAndFirstArticleBadges";
import {
  AMC_TITLE,
  describeAmc,
  fetchAmcDefinitions,
  type AmcDefinitions,
} from "@/lib/library/amcDefinitions";

/**
 * The AMC column's pill on /bidmatching. Click it for the code's meaning, in
 * the same words and layout as the part Overview tab's code tooltip: a header
 * naming the code type, then the AQM and AMS halves.
 *
 * Pass `definitions` to skip the fetch (the /products demo, which has no
 * session); otherwise the vocabulary loads on first open.
 */

const PANEL_WIDTH = 288; // w-72

export function AmcBadge({
  code,
  definitions,
}: {
  code: string;
  definitions?: AmcDefinitions;
}) {
  const { open, coords, btnRef, panelRef, toggle } = useAnchoredPopover();
  const [fetched, setFetched] = useState<AmcDefinitions | null>(null);
  const [failed, setFailed] = useState(false);
  const defs = definitions ?? fetched;

  useEffect(() => {
    if (!open || defs) return;
    let cancelled = false;
    fetchAmcDefinitions()
      .then((d) => { if (!cancelled) setFetched(d); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [open, defs]);

  const content = defs
    ? describeAmc(code, defs)
    : failed ? "Code definition not available" : "Loading…";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`AMC ${code} — what this means`}
        title={AMC_TITLE}
        className={rowBadgeClass("neutral", { interactive: true, className: "data-field" })}
      >
        {code}
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: coords.top,
            // The column sits near the right edge of the table, so keep the
            // panel from running off the viewport.
            left: Math.max(8, Math.min(coords.left, window.innerWidth - PANEL_WIDTH - 8)),
            zIndex: 60,
          }}
          className="w-72 max-w-[90vw] rounded shadow-lg overflow-hidden border border-border bg-card-bg text-foreground text-xs whitespace-normal break-words"
        >
          <div className="font-bold px-2 py-1.5 bg-muted-light text-foreground">
            {AMC_TITLE}
          </div>
          <div className="p-2 whitespace-pre-line">{content}</div>
          {/* The Overview tab's code links to the same page. */}
          <div className="px-2 pb-2">
            <Link
              href={`/library/code-definitions?code_type=AMC&code_value=${encodeURIComponent(code)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:text-primary/80"
            >
              All acquisition method codes
            </Link>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
