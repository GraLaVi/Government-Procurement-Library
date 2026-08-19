import { cookies } from 'next/headers';
import { AUTH_CONFIG } from './config';
import { clearAuthCookies } from './cookies';
import { refreshSession } from './refresh';

/**
 * Gets a valid access token, refreshing it if necessary.
 * Returns null if no valid token can be obtained.
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN)?.value;

  // If we have an access token, return it (we'll handle 401s at the call site if needed)
  if (accessToken) {
    return accessToken;
  }

  // No access token - try to refresh
  const result = await refreshSession(cookieStore);
  return result.ok ? result.accessToken : null;
}

/**
 * Attempts to refresh the access token.
 * Returns the new access token or null if refresh failed.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const result = await refreshSession(cookieStore);

  if (result.ok) {
    return result.accessToken;
  }

  // Clear cookies when the backend actually rejected us. A network failure
  // (status null) leaves the session alone — a flaky hop shouldn't log
  // anyone out of a session that is still perfectly valid.
  if (result.status !== null) {
    await clearAuthCookies(cookieStore);
  }

  return null;
}
