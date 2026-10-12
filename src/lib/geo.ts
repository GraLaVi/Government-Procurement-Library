// US states and territories, Canadian provinces and countries, as DLA's
// DIBBS batch format lists them (alan-fastapi src/reference/geo.py).
//
// Static, so one fetch per browser session; the in-flight Promise is cached
// so concurrent callers share one request (same pattern as codeDefinitions).

import { useEffect, useState } from 'react';

export interface GeoCode {
  code: string;
  name: string;
}

export interface GeoLists {
  us_states: GeoCode[];
  ca_provinces: GeoCode[];
  countries: GeoCode[];
}

let _cache: Promise<GeoLists> | null = null;

export function fetchGeo(): Promise<GeoLists> {
  if (_cache) return _cache;
  _cache = (async () => {
    const res = await fetch('/api/reference/geo', { credentials: 'include' });
    if (!res.ok) {
      _cache = null;
      throw new Error(`geo fetch failed: ${res.status}`);
    }
    return (await res.json()) as GeoLists;
  })();
  return _cache;
}

/** The lists, or null until loaded (or if the fetch failed). */
export function useGeo(): GeoLists | null {
  const [geo, setGeo] = useState<GeoLists | null>(null);
  useEffect(() => {
    let live = true;
    fetchGeo().then((g) => live && setGeo(g)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return geo;
}

/** The state/province list for a country: US and CA only (DIBBS 034). */
export function subdivisions(geo: GeoLists | null, country: string | null | undefined): GeoCode[] {
  if (!geo) return [];
  if (country === 'US') return geo.us_states;
  if (country === 'CA') return geo.ca_provinces;
  return [];
}

/** "US - United States" style options for a code select. */
export function geoOptions(rows: GeoCode[]): { value: string; label: string }[] {
  return rows.map((r) => ({ value: r.code, label: `${r.name} (${r.code})` }));
}
