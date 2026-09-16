/**
 * Tech docs: what technical documentation DLA holds for an NSN — a full data
 * package, a specification only, or nothing — as stated on a DLA solicitation.
 *
 * Stored on `dla_solicitation_items.tech_docs` but describing the NSN, not the
 * solicitation: every line item for one part carries the same value, and the
 * same NSN on next month's solicitation carries it again.
 *
 * FOUR states, and the fourth is the one to be careful with. `null` means WE
 * HAVE NOT CAPTURED IT for that item — it is NOT `none`. Coverage is currently
 * nil (every row in the column is NULL), so a UI that collapsed the two would
 * tell every bidder on every row that DLA holds no documents for the part.
 * Same rule the coded bid terms and `solicitation_type` already follow: never
 * render a negative for a null.
 *
 * `spec_only` is a middle state, not a soft no: the item is described by a
 * specification or standard you can build to, but without drawings. That is a
 * genuinely different bid from `full`, and a different bid again from `none`,
 * where the only route in is usually being an approved source. So all three
 * are stated, and only the null is left blank.
 */

export type TechDocs = "full" | "spec_only" | "none";

/**
 * Stored value -> canonical state. Keyed on the exact strings the column
 * holds; `resolveTechDocs` handles case and whitespace on top.
 */
const VALUES: Record<string, TechDocs> = {
  FULL: "full",
  SPEC_ONLY: "spec_only",
  NONE: "none",
};

/**
 * The stored string as one of the three states, or `null` for "not captured".
 *
 * `null` covers four cases the UI treats identically — the column is NULL, the
 * field is absent from the response (an older API, or a SAM-source row with no
 * DLA line item at all), the value is blank, and a value outside the known
 * vocabulary. That last one is deliberate: an unrecognised string is something
 * we do not understand, and guessing which of three states it meant is worse
 * than admitting we do not know.
 */
export function resolveTechDocs(raw?: string | null): TechDocs | null {
  if (raw == null) return null;
  const v = raw.trim().toUpperCase();
  if (!v) return null;
  return VALUES[v] ?? null;
}

/** Table-cell text: the state, or an em dash for not captured. */
export function techDocsCellLabel(raw?: string | null): string {
  switch (resolveTechDocs(raw)) {
    case "full":
      return "Full";
    case "spec_only":
      return "Spec only";
    case "none":
      return "None";
    default:
      return "—";
  }
}
