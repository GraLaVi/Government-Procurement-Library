// NIIN normalization. Mirrors src/bid_matching/models.py:normalize_niin
// in ALAN-FastAPI-Web — keep the two in sync.
//
// Accepts a bare 9-digit NIIN ("012345678" or "01-234-5678") OR a full
// 13-digit NSN ("5945012345678" or "5945-01-234-5678"). For NSN inputs
// we strip the leading 4-digit FSC and store only the 9-digit NIIN —
// NIINs are globally unique under DoD spec so the NIIN alone identifies
// the part.

export type NiinResult =
  | { ok: true; niin: string }
  | { ok: false; error: string };

export function normalizeNiin(raw: string): NiinResult {
  const digits = (raw ?? "").replace(/\D+/g, "");
  if (digits.length === 9) return { ok: true, niin: digits };
  if (digits.length === 13) return { ok: true, niin: digits.slice(4) };
  return {
    ok: false,
    error: "Enter an NIIN (9 digits) or a full NSN (13 digits).",
  };
}

// Format a 9-digit NIIN as XX-XXX-XXXX for display. Returns null when
// the input doesn't normalize to a valid NIIN, so callers can hide the
// preview until the user types something sensible.
export function previewNiin(raw: string): string | null {
  const result = normalizeNiin(raw);
  if (!result.ok) return null;
  const n = result.niin;
  return `${n.slice(0, 2)}-${n.slice(2, 5)}-${n.slice(5, 9)}`;
}
