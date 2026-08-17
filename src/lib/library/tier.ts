import type { RowBadgeTone } from "@/components/library/RowBadge";
// Frontend tier resolution for library products.
//
// Mirrors the backend's get_*_search_tier helpers in
// src/products/access_control.py — returns the user's HIGHEST effective
// tier across the product keys they hold. Used for tab-visibility and
// feature-gate decisions in the Library UI.
//
// The functions take a `hasAnyProductAccess` lambda (from useAuth) so
// they can be called from any component without re-deriving the user's
// product keys. Pass the hook's return value directly:
//
//     const { hasAnyProductAccess } = useAuth();
//     const tier = resolveVendorTier(hasAnyProductAccess);

export type LibraryTier = "advanced" | "basic" | "free" | null;

type HasAccess = (keys: string[]) => boolean;

const VENDOR_ADVANCED_KEYS = ["library_search_advanced", "library_vendor_search_advanced"];
const VENDOR_BASIC_KEYS = ["library_search_basic", "library_vendor_search_basic"];
const VENDOR_FREE_KEYS = ["library_search_free", "library_vendor_search_free"];

const PARTS_ADVANCED_KEYS = ["library_search_advanced", "library_parts_search_advanced"];
const PARTS_BASIC_KEYS = ["library_search_basic", "library_parts_search_basic"];
const PARTS_FREE_KEYS = ["library_search_free", "library_parts_search_free"];

export function resolveVendorTier(hasAnyProductAccess: HasAccess): LibraryTier {
  if (hasAnyProductAccess(VENDOR_ADVANCED_KEYS)) return "advanced";
  if (hasAnyProductAccess(VENDOR_BASIC_KEYS)) return "basic";
  if (hasAnyProductAccess(VENDOR_FREE_KEYS)) return "free";
  return null;
}

export function resolvePartsTier(hasAnyProductAccess: HasAccess): LibraryTier {
  if (hasAnyProductAccess(PARTS_ADVANCED_KEYS)) return "advanced";
  if (hasAnyProductAccess(PARTS_BASIC_KEYS)) return "basic";
  if (hasAnyProductAccess(PARTS_FREE_KEYS)) return "free";
  return null;
}

// Rank ordering for tier comparison. Higher numbers strictly dominate
// lower ones — a user with tier rank `N` sees any feature that requires
// rank `<= N`.
const TIER_RANK: Record<Exclude<LibraryTier, null>, number> = {
  free: 1,
  basic: 2,
  advanced: 3,
};

export function tierMeets(actual: LibraryTier, required: Exclude<LibraryTier, null>): boolean {
  if (actual === null) return false;
  return TIER_RANK[actual] >= TIER_RANK[required];
}

// Overall library tier — the higher of vendor/parts, same "highest wins"
// resolution the backend's /my-business-summary 403 body reports. Resolved
// entirely client-side from useAuth()'s already-loaded product list (no
// network call), so pages like the dashboard can decide up front which
// tier-gated endpoint to call instead of firing a doomed-to-403 request
// against a higher tier's endpoint just to learn what tier the user holds.
export function resolveLibraryTier(hasAnyProductAccess: HasAccess): LibraryTier {
  const vendor = resolveVendorTier(hasAnyProductAccess);
  const parts = resolvePartsTier(hasAnyProductAccess);
  if (vendor === null) return parts;
  if (parts === null) return vendor;
  return TIER_RANK[vendor] >= TIER_RANK[parts] ? vendor : parts;
}

// --- Org-wide tier badge resolution -------------------------------------
// Locked pricing: one tier per org (Free / Basic / Advanced), being the
// highest library_search_* grant the org holds. Both /account/users and
// /account/billing derive the badge from the org product list they fetch.
// Add-ons (gph_analytics, request_for_quote) are deliberately absent — they
// stack alongside a tier rather than being one, and get their own badges.
export type OrgTierBadge = { label: string; tone: RowBadgeTone };

// Minimal shape shared by AssignableItem and AssignedProduct.
type TierKeyed = { product_key?: string; group_key?: string };

const ORG_TIER_BADGES: Record<string, { label: string; rank: number; tone: RowBadgeTone }> = {
  library_search_advanced: { label: "Advanced", rank: 3, tone: "sky" },
  library_search_basic: { label: "Basic", rank: 2, tone: "neutral" },
  library_search_free: { label: "Free", rank: 1, tone: "neutral" },
};

// Highest tier across a list of org products. Every org holds Free at least.
export function resolveOrgTier(items: TierKeyed[]): OrgTierBadge {
  let best: OrgTierBadge | null = null;
  let bestRank = 0;
  for (const it of items) {
    const t = ORG_TIER_BADGES[it.product_key ?? it.group_key ?? ""];
    if (t && t.rank > bestRank) {
      best = { label: t.label, tone: t.tone };
      bestRank = t.rank;
    }
  }
  return best ?? { label: "Free", tone: "neutral" };
}

// Single plan/product key -> tier badge. Returns null for unknown keys so the
// caller can fall back to the raw plan name rather than mislabel a paid plan.
export function tierBadgeForKey(key: string | null | undefined): OrgTierBadge | null {
  if (!key) return null;
  const t = ORG_TIER_BADGES[key];
  return t ? { label: t.label, tone: t.tone } : null;
}
