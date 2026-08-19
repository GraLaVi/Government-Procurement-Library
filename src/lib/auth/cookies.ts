import { cookies, headers } from 'next/headers';
import { AUTH_CONFIG } from './config';

type CookieStore = Awaited<ReturnType<typeof cookies>>;

// Explicit opt-out rather than deriving from NODE_ENV: `next build && next
// start` (used for local demos) sets NODE_ENV=production too, which would
// mark cookies Secure even when served over plain HTTP — browsers silently
// drop those cookies, breaking login. Defaults to secure (fail-safe); only
// .env.development sets COOKIE_SECURE=false.
const baseOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE !== 'false',
  sameSite: 'lax' as const,
  path: '/',
};

/** Write the canonical access-token cookie (host-only, the canonical scope). */
export function setAccessCookie(
  store: CookieStore,
  value: string,
  maxAge: number,
): void {
  store.set(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN, value, { ...baseOptions, maxAge });
}

/**
 * Write the canonical refresh-token cookie.
 *
 * `maxAge` should come from the backend's `refresh_expires_in`, so the cookie
 * dies exactly when the token inside it does. The constant is only a fallback
 * for responses that predate that field; if the two drift apart the browser
 * either drops a still-valid token early or keeps sending a dead one.
 */
export function setRefreshCookie(
  store: CookieStore,
  value: string,
  maxAge: number | undefined = AUTH_CONFIG.TOKEN_EXPIRY.REFRESH,
): void {
  store.set(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN, value, {
    ...baseOptions,
    maxAge: maxAge ?? AUTH_CONFIG.TOKEN_EXPIRY.REFRESH,
  });
}

/** The current request host (no port), lowercased, or null if unavailable. */
async function currentHost(): Promise<string | null> {
  try {
    const host = (await headers()).get('host');
    return host ? host.split(':')[0].toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * The legacy Domain scopes we may emit deletions for, filtered to those the
 * current host actually belongs to. A browser rejects (and noisily logs) any
 * Set-Cookie whose Domain the document origin isn't part of — e.g. trying to
 * clear a `.gphusa.com` cookie while on localhost or a bare IP. Only the host's
 * own registrable domain can carry a cookie that would be sent to us anyway, so
 * scoping the deletions to it loses nothing.
 */
async function applicableLegacyDomains(): Promise<string[]> {
  const host = await currentHost();
  if (!host) return [];
  return AUTH_CONFIG.LEGACY_COOKIE_DOMAINS.filter((domain) => {
    const bare = domain.replace(/^\./, '');
    return host === bare || host.endsWith(`.${bare}`);
  });
}

/**
 * Delete any stale legacy / cross-scope auth cookies so the canonical cookies
 * are the only ones the browser holds. Safe to call on every login: it only
 * ever deletes cookies, and never touches the canonical host-only cookies we
 * are about to (re)write.
 *
 * Covers: the old cookie names (host-only and on each applicable legacy
 * Domain), and the canonical names on each applicable legacy Domain (a
 * cross-subdomain duplicate a previous build might have written).
 */
export async function clearLegacyAuthCookies(store: CookieStore): Promise<void> {
  const domains = await applicableLegacyDomains();

  for (const name of AUTH_CONFIG.LEGACY_COOKIE_NAMES) {
    // Host-only legacy cookie.
    store.delete({ name, path: '/' });
    // Domain-scoped legacy cookies (only on domains this host belongs to).
    for (const domain of domains) {
      store.delete({ name, path: '/', domain });
    }
  }

  // Canonical names on legacy (cross-subdomain) scopes only — never the
  // host-only canonical scope, which is where the live cookies belong.
  for (const name of Object.values(AUTH_CONFIG.COOKIE_NAMES)) {
    for (const domain of domains) {
      store.delete({ name, path: '/', domain });
    }
  }
}

/**
 * Delete the auth cookies across every name and scope they may exist on.
 * Used on logout and on auth failures.
 */
export async function clearAuthCookies(store: CookieStore): Promise<void> {
  for (const name of Object.values(AUTH_CONFIG.COOKIE_NAMES)) {
    store.delete({ name, path: '/' });
  }
  await clearLegacyAuthCookies(store);
}
