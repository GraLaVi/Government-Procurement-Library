"use client";

import { createPortal } from "react-dom";
import { useAnchoredPopover } from "@/components/library/WinAndFirstArticleBadges";
import { resolveTechDocs, type TechDocs } from "@/lib/library/techDocs";

/**
 * What technical documentation DLA holds for the NSN on the row.
 *
 * Sits in the NSN column's badge cluster beside FAT and the win badge, because
 * it is a fact about the PART on the row, not about the solicitation — the same
 * NSN carries it onto every solicitation it appears on. Borrows
 * FirstArticleBadge's shape and click-popover so the cluster reads as one
 * family, and the neutral tone the set-aside pill uses: documentation is
 * context for how to bid, not a warning (FAT's sky) or a prize (the win
 * badge's amber).
 *
 * TWO of the four states badge, and they get DIFFERENT labels rather than one
 * pill with a qualifier inside the popover — `full` and `spec_only` lead to
 * different bids (build to the drawing package, versus build to a spec with no
 * drawings), and a row is scanned, not read.
 *
 * `none` and not-captured both render nothing:
 *
 *   - `none` is the common negative, and a pill on every such row would be
 *     noise in a column that already carries up to three.
 *   - not-captured is not a negative at all, and nothing is captured yet, so a
 *     pill that conflated the two would currently be wrong on every row.
 *
 * Both still reach the user — the expanded row's line-item tables spell all
 * four states out per NSN (see techDocsCellLabel). This badge is the
 * at-a-glance half of that pair.
 */

const BADGE: Record<
  Exclude<TechDocs, "none">,
  { short: string; title: string; heading: string; body: string }
> = {
  full: {
    short: "TDP",
    title: "Full technical data package",
    heading: "Full technical data package:",
    body:
      "DLA holds drawings and specifications for this NSN, so the item can be quoted by building to the documents rather than only by being an approved source.",
  },
  spec_only: {
    short: "SPEC",
    title: "Specification only — no drawings",
    heading: "Specification only:",
    body:
      "DLA holds a specification or standard for this NSN, but no drawings. You can build to the spec, though without dimensioned drawings expect to carry more of the design risk yourself.",
  },
};

export function TechDocsBadge({ techDocs }: { techDocs?: string | null }) {
  const { open, coords, btnRef, panelRef, toggle } = useAnchoredPopover();

  const state = resolveTechDocs(techDocs);
  if (state !== "full" && state !== "spec_only") return null;
  const b = BADGE[state];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`${b.title} — what this means`}
        title={b.title}
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 bg-muted/15 text-foreground border-border hover:bg-muted/25 cursor-pointer transition-colors"
      >
        {b.short}
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-80 rounded-md border border-border bg-background shadow-lg p-3"
        >
          <p className="text-xs text-foreground leading-relaxed">
            <span className="font-semibold">{b.heading}</span> {b.body} Request
            the documents through DIBBS — what you actually receive still
            depends on the solicitation&apos;s acquisition method and any
            export-control restrictions.
          </p>
        </div>,
        document.body
      )}
    </>
  );
}
