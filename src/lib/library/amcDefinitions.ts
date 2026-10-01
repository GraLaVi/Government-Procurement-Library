/**
 * Acquisition Method Code (AMC) definitions, resolved the way the part
 * Overview tab resolves them (see renderCodeWithTooltip in PartDetail.tsx).
 *
 * The vocabulary is library_code_definitions, served at
 * /api/library/code-definitions. It does not store two-character AMCs: it
 * stores the halves under code_type 'AMC' as "AQM 3" and "AMS H", so a "3H"
 * resolves as AQM 3 plus AMS H.
 *
 * Definitions are a flat map keyed `TYPE:code` ("AQM:3", "AMS:H"), the same
 * shape PartDetail builds and the /products demos pass in as fixtures.
 */

export type AmcDefinitions = Record<string, string>;

export const AMC_TITLE = "AMC - Acquisition Method Code";

let _cache: Promise<AmcDefinitions> | null = null;

/** One fetch per browser session, shared by every row that asks. */
export function fetchAmcDefinitions(): Promise<AmcDefinitions> {
  if (_cache) return _cache;
  const p = (async () => {
    const res = await fetch("/api/library/code-definitions", { credentials: "include" });
    if (!res.ok) throw new Error(`code definitions fetch failed: ${res.status}`);
    const data = (await res.json()) as {
      code_types?: { code_type: string; codes: { code_value?: string | number | null; description: string }[] }[];
    };
    const defs: AmcDefinitions = {};
    for (const group of data.code_types ?? []) {
      if (group.code_type !== "AMC") continue;
      for (const code of group.codes) {
        const value = String(code.code_value ?? "").trim();
        if (!value) continue;
        defs[`AMC:${value.toUpperCase()}`] = code.description;
        // "AQM 3" / "AMS H" -> AQM:3 / AMS:H
        const sub = value.match(/^(AQM|AMS)\s+(.+)$/i);
        if (sub) defs[`${sub[1].toUpperCase()}:${sub[2].toUpperCase()}`] = code.description;
      }
    }
    return defs;
  })();
  // A failed fetch is not cached, so the next popover retries.
  p.catch(() => { if (_cache === p) _cache = null; });
  _cache = p;
  return p;
}

/**
 * The text the Overview tab shows for an AMC: an exact AMC entry if the
 * vocabulary has one, otherwise the AQM and AMS halves, each labelled. A
 * one-character legacy value is the AMS half on its own.
 */
export function describeAmc(code: string, defs: AmcDefinitions): string {
  const c = code.trim().toUpperCase();
  const exact = defs[`AMC:${c}`];
  if (exact) return exact;
  if (c.length === 2) {
    const parts: string[] = [];
    if (defs[`AQM:${c[0]}`]) parts.push(`AQM ${c[0]}: ${defs[`AQM:${c[0]}`]}`);
    if (defs[`AMS:${c[1]}`]) parts.push(`AMS ${c[1]}: ${defs[`AMS:${c[1]}`]}`);
    if (parts.length) return parts.join("\n\n");
  }
  if (c.length === 1 && defs[`AMS:${c}`]) return defs[`AMS:${c}`];
  return "Code definition not available";
}
