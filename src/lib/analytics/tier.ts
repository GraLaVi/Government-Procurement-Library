// Frontend access resolution for the Procurement Analytics add-on.
//
// Mirrors the backend's src/analytics/access.py — `gph_analytics` is a
// standalone per-seat add-on, NOT a library tier. It replaced the retired
// Maximum tier, whose only differentiator over Advanced was this feature
// set: the Analytics dashboard, Demand & Stock on a part, DLA buy-signal
// bell alerts, and the demand column on bid-match results.
//
// Access requires BOTH the add-on AND an Advanced-or-higher library tier,
// matching the backend gate exactly. Resolved entirely client-side from
// useAuth()'s already-loaded product list (no network call), so pages can
// decide what to mount before firing a doomed-to-403 request.
//
//     const { hasProductAccess, hasAnyProductAccess } = useAuth();
//     const canUse = hasAnalyticsAccess(hasProductAccess, hasAnyProductAccess);

import { resolveLibraryTier, tierMeets } from "@/lib/library/tier";

export const ANALYTICS_PRODUCT_KEY = "gph_analytics";

// Launch switch for the add-on's public surfaces: the /pricing panel copy,
// the landing-page card, the nav upsell for non-holders, and the Demand &
// Stock help article. Now announced — flipped for the add-on's public
// release, together with the help articles in @/lib/help and the analytics
// passages in the plans-and-pricing and notifications articles.
//
// What this flag does NOT do is let anyone buy the add-on: that is
// `billing_enabled` on the `gph_analytics` product, which GET /billing/plans
// filters on. If the /pricing and /account/billing panels are empty while
// the nav and landing card are showing, billing_enabled is still false on
// the backend product row.
//
// Seat-holders are never affected by this flag: a customer who's been
// granted the add-on saw Analytics before the announcement too.
export const ANALYTICS_ADDON_PUBLIC = true;

type HasAccess = (key: string) => boolean;
type HasAnyAccess = (keys: string[]) => boolean;

/**
 * True when this user can actually use the analytics features: they hold a
 * seat on the add-on AND their org is on Advanced or higher.
 */
export function hasAnalyticsAccess(
  hasProductAccess: HasAccess,
  hasAnyProductAccess: HasAnyAccess,
): boolean {
  if (!hasProductAccess(ANALYTICS_PRODUCT_KEY)) return false;
  return tierMeets(resolveLibraryTier(hasAnyProductAccess), "advanced");
}

/**
 * Whether to surface Analytics in the nav. Holders always see it; everyone
 * else only once the add-on is public, at which point the nav becomes an
 * upsell surface and /analytics self-gates to a buy CTA (the same pattern
 * the base RFQ menu uses).
 */
export function showAnalyticsNav(
  hasProductAccess: HasAccess,
  hasAnyProductAccess: HasAnyAccess,
): boolean {
  return (
    ANALYTICS_ADDON_PUBLIC ||
    hasAnalyticsAccess(hasProductAccess, hasAnyProductAccess)
  );
}
