// Module-level fetch + cache for canonical code_definitions lookups.
//
// The vocabulary changes rarely (worker-team migration to add/remove codes),
// so a single fetch per code_type per browser session is enough. We cache
// the in-flight Promise itself, so concurrent callers share one request.

export interface CodeDefinition {
  code: string;
  label: string;
  description: string | null;
  sort_order: number;
}

const _cache = new Map<string, Promise<CodeDefinition[]>>();

export function fetchCodeDefinitions(codeType: string): Promise<CodeDefinition[]> {
  const cached = _cache.get(codeType);
  if (cached) return cached;

  const p = (async () => {
    const res = await fetch(`/api/code-definitions?code_type=${encodeURIComponent(codeType)}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      _cache.delete(codeType);
      throw new Error(`code_definitions fetch failed: ${res.status}`);
    }
    return (await res.json()) as CodeDefinition[];
  })();

  _cache.set(codeType, p);
  return p;
}

// Test/escape hatch — useful in dev when codes have been re-seeded.
export function clearCodeDefinitionsCache(codeType?: string) {
  if (codeType) _cache.delete(codeType);
  else _cache.clear();
}
