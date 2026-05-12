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
