"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatCurrency } from "@/lib/library/types";

/**
 * The two solicitation-level signals shared by the bid-matching results table
 * and the Send RFQs work queue: a First Article requirement, and parts the
 * customer has been awarded before.
 *
 * The win badge means something slightly different on each page and says so.
 * On bid-matching a row IS one line item, so the count is awards for that
 * part. On Send RFQs a row is a whole solicitation, so the count is how many
 * of its lines you have made before. Same component, different `mode`.
 */

/** A prior award. `nsn` is only set in solicitation mode, where it disambiguates. */
export interface WonAward {
  contract_number?: string;
  contract_date?: string;
  nsn?: string | null;
  mfg_part_number?: string | null;
  win_count?: number;
  last_won_on?: string | null;
  last_unit_price?: number | null;
  quantity?: number | null;
  unit_price?: number | null;
}

/**
 * A win older than this still shows, but greyed: the award is still true, its
 * unit price is no longer a usable guide once material costs have moved on.
 */
export const WIN_RECENCY_YEARS = 5;

export function isRecentWin(lastWonOn: string | null | undefined): boolean {
  if (!lastWonOn) return false;
  const [y, m, d] = lastWonOn.split("-").map(Number);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - WIN_RECENCY_YEARS);
  return new Date(y, (m || 1) - 1, d || 1) >= cutoff;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y) return "—";
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString();
}

/**
 * Click-to-open popover anchored under its trigger.
 *
 * Portaled to <body> at fixed coordinates rather than positioned in flow:
 * both tables scroll horizontally, and that overflow would clip an in-flow
 * panel. Mirrors the SamDocumentsButton interaction.
 */
export function useAnchoredPopover() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) setCoords({ top: rect.bottom + 4, left: rect.left });
    }
  };

  return { open, coords, btnRef, panelRef, toggle };
}

/**
 * Contractor First Article Test requirement.
 *
 * DIBBS carries this as a placeholder line item rather than a field, and both
 * pages hide those placeholders — the Send RFQs quotable-items list has always
 * hidden them, and bid-matching now excludes them from the NSN column and item
 * count. So this badge is what tells a buyer the requirement exists at all.
 *
 * A cost-and-lead-time warning, not an achievement, so it deliberately does
 * not borrow the win badge's amber — the two can appear on the same row.
 */
export function FirstArticleBadge({ firstArticle }: { firstArticle?: boolean }) {
  const { open, coords, btnRef, panelRef, toggle } = useAnchoredPopover();

  if (!firstArticle) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="First Article required — what this means"
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100 cursor-pointer transition-colors"
      >
        FIRST ARTICLE
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-80 rounded-md border border-border bg-background shadow-lg p-3"
        >
          <p className="text-xs text-foreground leading-relaxed">
            <span className="font-semibold">Contractor First Article Test:</span>{" "}
            The bidder must test initial sample units and submit a formal report
            under FAR 52.209-3 before full production delivery. Expect added cost
            and lead time.
          </p>
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * Prior awards to the customer's own CAGE.
 *
 * mode="part"         — count is awards for the one part on the row (bid-matching)
 * mode="solicitation" — count is how many of the solicitation's lines have been
 *                       won before (Send RFQs)
 */
export function WinHistoryBadge({
  count, lastWonOn, awards = [], mode = "part", totalWins,
}: {
  count: number;
  lastWonOn?: string | null;
  awards?: WonAward[];
  mode?: "part" | "solicitation";
  /** part mode only: awards beyond those listed, for the "+N older" line. */
  totalWins?: number;
}) {
  const { open, coords, btnRef, panelRef, toggle } = useAnchoredPopover();

  if (!count) return null;

  const recent = isRecentWin(lastWonOn);
  const lastYear = lastWonOn?.slice(0, 4);
  // Both modes cap the list server-side, so both can under-report: part mode
  // hides older awards, solicitation mode hides further parts.
  const older = Math.max(0, (mode === "part" ? (totalWins ?? count) : count) - awards.length);

  const label = mode === "solicitation"
    ? (count === 1 ? "WON 1 PART" : `WON ${count} PARTS`)
    : `WON ${count}×`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          mode === "solicitation"
            ? `You have won ${count} part${count === 1 ? "" : "s"} on this solicitation before — show award history`
            : `You have won this part ${count} times — show award history`
        }
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 cursor-pointer transition-colors ${
          recent
            ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200"
            : "text-muted border-border font-medium hover:text-foreground"
        }`}
      >
        {recent ? `★ ${label}` : `${label} · ${lastYear}`}
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-80 rounded-md border border-border bg-background shadow-lg p-3"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">
            {mode === "solicitation"
              ? "Parts here you have won before"
              : `Your award history · won ${count}×`}
          </div>
          {awards.length === 0 ? (
            <p className="text-xs text-muted">No contract detail available.</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {awards.map((a, i) => (
                  <tr key={`${a.contract_number ?? a.nsn ?? i}-${i}`} className="align-baseline">
                    <td className="py-0.5 pr-2 data-field text-foreground whitespace-nowrap">
                      {mode === "solicitation"
                        ? (a.nsn || a.mfg_part_number || "—")
                        : a.contract_number}
                    </td>
                    <td className="py-0.5 pr-2 text-muted whitespace-nowrap">
                      {formatDate(mode === "solicitation" ? a.last_won_on : a.contract_date)}
                    </td>
                    <td className="py-0.5 pr-2 text-right text-muted whitespace-nowrap">
                      {mode === "solicitation"
                        ? `${a.win_count ?? 0}×`
                        : (a.quantity != null ? a.quantity.toLocaleString() : "—")}
                    </td>
                    {/* The number that actually prices the next bid. */}
                    <td className="py-0.5 text-right font-semibold text-foreground whitespace-nowrap">
                      {(() => {
                        const price = mode === "solicitation" ? a.last_unit_price : a.unit_price;
                        return price != null ? formatCurrency(price) : "—";
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {older > 0 && (
            <p className="mt-2 text-[11px] text-muted">
              {mode === "solicitation"
                ? `+${older} more part${older === 1 ? "" : "s"} not shown`
                : `+${older} older award${older === 1 ? "" : "s"} not shown`}
            </p>
          )}
          {!recent && (
            <p className="mt-2 text-[11px] text-muted">
              Last won over {WIN_RECENCY_YEARS} years ago — treat the price as historical.
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
