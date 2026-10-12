// Frontend access resolution for the Bid Manager add-on (the bidding module).
//
// Mirrors the backend's src/bidding/access.py: `bidding` is a standalone
// per-seat add-on with no prerequisite. Resolved client-side from useAuth()'s
// already-loaded product list, so pages decide what to mount before firing a
// doomed-to-403 request.
//
//     const { hasProductAccess } = useAuth();
//     const canBid = hasProductAccess(BIDDING_PRODUCT_KEY);

export const BIDDING_PRODUCT_KEY = "gph_bid_manager";

// Launch switch for the add-on's public surfaces — today only the Start bid
// button for non-holders. Not the nav: the Bid Manager menu is for holders
// only (Header), and non-holders keep Bid-Matching as a plain link. Off while
// Bidding is being built: the backend product row has billing_enabled =
// false, so there is nothing to sell yet, and seat holders (admin grants) see
// the button regardless. Flip together with billing_enabled and the /pricing
// copy (plan step 4).
export const BIDDING_ADDON_PUBLIC = false;

type HasAccess = (key: string) => boolean;

/** Whether to surface the add-on's bidding controls. Holders always see them. */
export function showBiddingNav(hasProductAccess: HasAccess): boolean {
  return BIDDING_ADDON_PUBLIC || hasProductAccess(BIDDING_PRODUCT_KEY);
}
