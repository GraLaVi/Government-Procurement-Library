"use client";

import { formatPartIdentity, isPartNumberOnly } from "@/lib/library/types";

interface PartLike {
  nsn?: string | null;
  niin?: string | null;
  mfg_cage?: string | null;
  mfg_part_number?: string | null;
}

// Strip dashes/spaces so the value satisfies the parts page's nsn_niin
// validation (9-char NIIN or 13-char NSN) regardless of how it was formatted.
function cleanIdentifier(value: string): string {
  return value.replace(/[\s\-‐-―−﹘﹣－]/g, "").toUpperCase();
}

/**
 * Builds the parts-search URL for a part, or null when it carries no usable
 * identifier. NSN-less DIBBS parts fall back to a manufacturer part-number
 * search, mirroring how formatPartIdentity displays them.
 */
export function buildPartSearchUrl(part: PartLike): string | null {
  if (!isPartNumberOnly(part)) {
    const raw = part.nsn?.trim() || part.niin?.trim();
    if (!raw) return null;
    return `/library/parts?search_type=nsn_niin&q=${encodeURIComponent(cleanIdentifier(raw))}`;
  }
  const pn = part.mfg_part_number?.trim();
  if (!pn) return null;
  return `/library/parts?search_type=mfg_part_number&q=${encodeURIComponent(pn)}`;
}

// The part's NSN (or CAGE / part number when it has none), linked to a parts
// search for that identifier in a new tab. Replaces the modal the bid-matching
// table used to open on the solicitation number.
export function PartIdentityLink({
  part,
  className = "",
}: {
  part: PartLike;
  className?: string;
}) {
  const label = formatPartIdentity(part);
  const href = buildPartSearchUrl(part);

  if (!href || label === "—") {
    return <span className={`text-muted ${className}`}>{label}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Open in Parts Search (new tab)"
      className="group inline-flex items-center gap-1 text-primary hover:text-primary/80"
    >
      <span
        className={`underline decoration-primary/40 underline-offset-2 group-hover:decoration-primary ${className}`}
      >
        {label}
      </span>
      {/* The app's internal open-in-new-tab glyph, matching the identical
          NSN -> parts-search link in the RFQ worklist. Distinct from the
          arrow-top-right-on-square used for genuinely external SAM.gov links. */}
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
