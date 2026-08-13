"use client";

import { useEffect, useState } from "react";
import {
  fetchCodeDefinitions,
  type CodeDefinition,
} from "@/lib/codeDefinitions";

export interface UseCodeDefinitionsResult {
  codes: CodeDefinition[];
  // Pre-built lookup: code → CodeDefinition. Lets callers resolve a label
  // without re-scanning the array per render.
  byCode: Map<string, CodeDefinition>;
  loading: boolean;
  error: string | null;
}

// Hook over a single code_type. Module-level cache in /lib/codeDefinitions
// guarantees one network fetch per code_type per session, shared across
// every component that subscribes.
export function useCodeDefinitions(codeType: string): UseCodeDefinitionsResult {
  const [codes, setCodes] = useState<CodeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Resets to loading when the key changes. On mount the value is already true
    // and React bails on an identical value, so this costs no extra render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fetchCodeDefinitions(codeType)
      .then((rows) => {
        if (cancelled) return;
        setCodes(rows);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load code definitions");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [codeType]);

  const byCode = new Map<string, CodeDefinition>();
  for (const c of codes) byCode.set(c.code, c);

  return { codes, byCode, loading, error };
}
