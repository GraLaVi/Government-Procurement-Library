/**
 * Quick-find for the /bidmatching results: filters the rows ALREADY LOADED in
 * the browser — the current page only, never the rest of the bucket. That is
 * the point (instant, no request), and also the limit the UI has to state.
 *
 * One box, every text column: no field picker, because checking all of them
 * across 50–200 rows costs nothing. Case-insensitive, and also compared with
 * punctuation and spaces stripped, so "5310012849917" finds 5310-01-284-9917
 * and "SPE7M426T390F" finds SPE7M4-26-T-390F.
 */

interface QuickFindPart {
  nsn?: string | null;
  niin?: string | null;
  mfg_cage?: string | null;
  mfg_part_number?: string | null;
  part_description?: string | null;
}

export interface QuickFindRow extends QuickFindPart {
  solicitation_number: string | null;
  profile_name?: string | null;
  match_reason?: string | null;
  set_aside_code?: string | null;
  set_aside_label?: string | null;
  acquisition_method_code?: string | null;
  matches?: { profile_name?: string | null; match_reason?: string | null }[];
  matched_parts?: QuickFindPart[];
}

const compact = (s: string) => s.replace(/[^a-z0-9]/g, "");

function haystack(row: QuickFindRow): string {
  const parts: (string | null | undefined)[] = [
    row.solicitation_number,
    row.nsn, row.niin, row.mfg_cage, row.mfg_part_number, row.part_description,
    row.profile_name, row.match_reason,
    row.set_aside_code, row.set_aside_label,
    row.acquisition_method_code,
  ];
  for (const m of row.matches ?? []) parts.push(m.profile_name, m.match_reason);
  for (const p of row.matched_parts ?? []) {
    parts.push(p.nsn, p.niin, p.mfg_cage, p.mfg_part_number, p.part_description);
  }
  return parts.filter(Boolean).join("\n").toLowerCase();
}

export function quickFindRows<T extends QuickFindRow>(rows: T[], term: string): T[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return rows;
  const needleCompact = compact(needle);
  return rows.filter((row) => {
    const text = haystack(row);
    if (text.includes(needle)) return true;
    return needleCompact.length > 0 && compact(text).includes(needleCompact);
  });
}
