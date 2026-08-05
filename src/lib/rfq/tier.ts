// Frontend tier resolution for the RFQ add-ons.
//
// Mirrors the backend's resolve_rfq_tier in src/rfq/access.py — two
// standalone per-seat feature add-ons forming a strict two-tier ladder:
//
//   * request_for_quote            ("RFQ Add-on")            — standard
//   * request_for_quote_enterprise ("RFQ Enterprise Add-on") — enterprise,
//     a strict SUPERSET of standard. Holding Enterprise implies everything
//     the base add-on does; customers never need both.
//
// Same calling convention as src/lib/library/tier.ts — pass the
// hasAnyProductAccess lambda from useAuth():
//
//     const { hasAnyProductAccess } = useAuth();
//     const tier = resolveRfqTier(hasAnyProductAccess);
//     if (!rfqTierMeets(tier, "standard")) return <AccessDeniedPage ... />;

export type RfqTier = "enterprise" | "standard" | null;

type HasAccess = (keys: string[]) => boolean;

export const RFQ_PRODUCT_KEY = "request_for_quote";
export const RFQ_ENTERPRISE_PRODUCT_KEY = "request_for_quote_enterprise";

// Either key confers base RFQ-sender access (Enterprise is a superset).
// Use hasAnyProductAccess(RFQ_SENDER_KEYS) anywhere the old code checked
// hasProductAccess("request_for_quote") alone.
export const RFQ_SENDER_KEYS = [RFQ_PRODUCT_KEY, RFQ_ENTERPRISE_PRODUCT_KEY];

export function resolveRfqTier(hasAnyProductAccess: HasAccess): RfqTier {
  if (hasAnyProductAccess([RFQ_ENTERPRISE_PRODUCT_KEY])) return "enterprise";
  if (hasAnyProductAccess([RFQ_PRODUCT_KEY])) return "standard";
  return null;
}

// Rank ordering for tier comparison — mirrors RFQ_TIER_RANK in
// src/rfq/access.py. Higher strictly dominates.
const RFQ_TIER_RANK: Record<Exclude<RfqTier, null>, number> = {
  standard: 1,
  enterprise: 2,
};

export function rfqTierMeets(actual: RfqTier, required: Exclude<RfqTier, null>): boolean {
  if (actual === null) return false;
  return RFQ_TIER_RANK[actual] >= RFQ_TIER_RANK[required];
}
