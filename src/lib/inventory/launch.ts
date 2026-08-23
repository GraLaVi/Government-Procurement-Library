// Launch gate for the Inventory Upload (Supplier Stock) feature, mirroring
// ANALYTICS_ADDON_PUBLIC in @/lib/analytics/tier: a hardcoded flag flipped in
// one place at announcement time.
//
// Flip to true at launch, at the same time as:
//   - registering the supplier-stock help article in src/lib/help.ts,
//   - restoring the commented-out inventory passages in
//     src/content/help/rfq-enterprise.md,
//   - the worker's inventory_process_upload task being live in prod.
export const INVENTORY_UPLOAD_PUBLIC = false;

/**
 * Whether inventory surfaces (the Account card) render for this build.
 * Dev always shows them — the feature is fully wired on dev and that's
 * where it gets exercised; production hides them until the flag flips.
 * NODE_ENV is inlined at build time, so this is a compile-time constant.
 */
export function showInventorySurfaces(): boolean {
  return INVENTORY_UPLOAD_PUBLIC || process.env.NODE_ENV === "development";
}
