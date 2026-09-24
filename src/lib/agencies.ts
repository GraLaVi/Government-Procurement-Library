// Module-level fetch + cache for the AGENCY condition's vocabulary.
//
// The list is SAM's own, read from the notices themselves rather than typed:
// one department is spelled 'DEFENSE ADVANCED RESEARCH PROJECTS AGENCY
// (DARPA)' with a DOUBLE space, agencies come and go, and an AGENCY condition
// matches exactly — so a value that differs by a character is a condition that
// silently never fires. Never hard-code an entry.
//
// The API changes it about once a day, so one fetch per browser session is
// plenty; we cache the in-flight Promise so concurrent callers share a request.

export interface AgencySubTier {
  name: string;
  notices_90d: number;
  /** Other departments publishing a bureau of this same name. A condition
   *  stores the bare string and is matched against a notice's sub_tier with no
   *  department scoping, so selecting this name matches those departments'
   *  bureaus too — the picker says so instead of implying it is narrower. */
  also_under: string[];
}

export interface AgencyDepartment {
  department: string;
  notices_90d: number;
  /** Bureaus under the department, busiest first. Empty when the department
   *  is its own only sub-tier — picking the department covers it. */
  sub_tiers: AgencySubTier[];
}

export interface AgencyDirectory {
  departments: AgencyDepartment[];
  refreshed_at: string;
  /** Window the notices_90d counts cover. */
  activity_window_days: number;
  /** Longer window a value must have appeared in for the API to accept it. */
  validation_window_days: number;
  /** Separator for an `in` list. '|' for AGENCY, because department names
   *  contain commas — a comma-joined list splits inside the names and matches
   *  nothing. Read it from here rather than writing it out. */
  in_list_delimiter: string;
  /** Longest value the column will store. */
  max_match_value_len: number;
}

// Used only before the directory has loaded (or if it fails), so a half-typed
// condition still serializes the way the server expects.
export const AGENCY_FALLBACK_DELIMITER = '|';
export const AGENCY_FALLBACK_MAX_LEN = 200;

let _cache: Promise<AgencyDirectory> | null = null;

export function fetchAgencyDirectory(): Promise<AgencyDirectory> {
  if (_cache) return _cache;

  const p = (async () => {
    const res = await fetch('/api/bid-matching/agencies', { credentials: 'include' });
    if (!res.ok) {
      _cache = null;
      throw new Error(`agency directory fetch failed: ${res.status}`);
    }
    return (await res.json()) as AgencyDirectory;
  })();

  _cache = p;
  return p;
}

// Test/escape hatch — useful in dev after the API's daily cache is refreshed.
export function clearAgencyDirectoryCache() {
  _cache = null;
}

/** Every string an AGENCY condition may carry: both levels, since the match
 *  compares one value against a notice's department OR its sub-tier. */
export function agencyValues(directory: AgencyDirectory | null): Set<string> {
  const values = new Set<string>();
  for (const d of directory?.departments ?? []) {
    values.add(d.department);
    for (const s of d.sub_tiers) values.add(s.name);
  }
  return values;
}

export interface AgencyOption {
  value: string;
  /** True for a department row — the sub-tiers below it are indented. */
  isDepartment: boolean;
  notices_90d: number;
}

/** The directory flattened for a <select>: each department followed by its
 *  bureaus, so picking either level is one click. */
export function agencyOptions(directory: AgencyDirectory | null): AgencyOption[] {
  const out: AgencyOption[] = [];
  for (const d of directory?.departments ?? []) {
    out.push({ value: d.department, isDepartment: true, notices_90d: d.notices_90d });
    for (const s of d.sub_tiers) {
      out.push({ value: s.name, isDepartment: false, notices_90d: s.notices_90d });
    }
  }
  return out;
}
