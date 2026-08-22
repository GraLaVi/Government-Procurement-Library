// Server-side read of the public plan catalog.
//
// Server components call the FastAPI origin directly rather than going
// through our own /api/billing/plans proxy: during prerender there is no
// stable public base URL to fetch our own routes from, and the proxy adds
// nothing here (it exists so the *browser* never talks to FastAPI directly).

import { AUTH_CONFIG } from "@/lib/auth/config";
import type { CatalogPlan } from "./resolveOffer";

/**
 * Fetch the plan catalog. Returns null when the billing service can't be
 * reached — callers render a degraded page rather than failing the build,
 * because an API blip during `next build` shouldn't take the whole deploy
 * down. A *content* error (unknown product key) is a different matter and
 * does throw; see resolveOffer.
 */
export async function fetchCatalog(revalidateSeconds = 3600): Promise<CatalogPlan[] | null> {
  try {
    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/plans`, {
      next: { revalidate: revalidateSeconds },
    });
    if (!response.ok) {
      console.error(`[catalog] GET /billing/plans returned ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error("[catalog] GET /billing/plans did not return an array");
      return null;
    }
    return data as CatalogPlan[];
  } catch (err) {
    console.error("[catalog] Unable to reach the billing service:", err);
    return null;
  }
}
