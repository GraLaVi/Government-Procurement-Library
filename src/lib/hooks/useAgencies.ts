"use client";

import { useEffect, useState } from "react";
import {
  AGENCY_FALLBACK_DELIMITER,
  AGENCY_FALLBACK_MAX_LEN,
  agencyValues,
  fetchAgencyDirectory,
  type AgencyDirectory,
} from "@/lib/agencies";

export interface UseAgenciesResult {
  directory: AgencyDirectory | null;
  /** Every accepted value, for checking a pattern or a legacy row. */
  values: Set<string>;
  /** Server-declared, with a safe fallback while the fetch is in flight —
   *  never write these two out by hand anywhere else. */
  delimiter: string;
  maxValueLength: number;
  loading: boolean;
  error: string | null;
}

// Hook over the AGENCY vocabulary. The module-level cache in /lib/agencies
// guarantees one network fetch per session, shared across every component.
export function useAgencies(): UseAgenciesResult {
  const [directory, setDirectory] = useState<AgencyDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAgencyDirectory()
      .then((d) => {
        if (cancelled) return;
        setDirectory(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load agencies");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    directory,
    values: agencyValues(directory),
    delimiter: directory?.in_list_delimiter ?? AGENCY_FALLBACK_DELIMITER,
    maxValueLength: directory?.max_match_value_len ?? AGENCY_FALLBACK_MAX_LEN,
    loading,
    error,
  };
}
