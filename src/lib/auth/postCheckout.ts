/**
 * The one window in which a signed-out visitor legitimately sits on an
 * authenticated route.
 *
 * Stripe returns a brand-new customer to
 * `/account/billing?checkout=success&session_id=cs_…` holding no auth cookie at
 * all: that page trades the session_id for one via
 * /api/billing/finalize-checkout, and only then is the visitor signed in. Any
 * auth guard that fires before that exchange finishes will bounce them to
 * /login, drop the session_id, and strand a customer whose subscription has
 * already started in Stripe.
 *
 * Three guards run inside that window, and all three have to agree — which is
 * why the rule lives here instead of being restated in each of them:
 *   - `proxy.ts`      server-side, before the page renders at all
 *   - `AuthContext`   client-side, once initial auth resolution says "no user"
 *   - `fetchWithAuth` client-side, on a 401 from any request that happens to be
 *                     in flight — ThemeContext's usePreferences fires one on
 *                     mount of every page, this one included
 */

/** The only route that can be in the post-Checkout window. */
export const POST_CHECKOUT_PATH = '/account/billing';

/**
 * True while the given location is the post-Checkout landing that has not yet
 * exchanged its session_id for auth cookies.
 */
export function isPostCheckoutFinalize(
  pathname: string | null | undefined,
  search: string | URLSearchParams,
): boolean {
  if (!pathname) return false;
  if (pathname.replace(/\/$/, '') !== POST_CHECKOUT_PATH) return false;
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return params.get('checkout') === 'success' && Boolean(params.get('session_id'));
}
