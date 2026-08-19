import { cookies } from 'next/headers';
import { AUTH_CONFIG } from './config';
import { setAccessCookie, setRefreshCookie } from './cookies';

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export type RefreshResult =
  | { ok: true; accessToken: string }
  /** `status` is the backend's status code, or null if the call never landed
   *  (network error, malformed body). Callers use it to tell "the session is
   *  really over" (401/403) from "we couldn't reach the API right now". */
  | { ok: false; status: number | null };

/**
 * Exchange the refresh cookie for a fresh access token and persist BOTH
 * cookies.
 *
 * Single source of truth for talking to `POST /auth/refresh`. Every caller
 * must go through here, because refresh tokens are **rotated**: the backend
 * revokes the token we present and returns its successor. If any call site
 * forgot to write the returned `refresh_token` back to the cookie, the browser
 * would keep sending a token that stops working the moment the server's
 * rotation grace window closes — signing the user out mid-session, which is
 * precisely the bug rotation was added to fix.
 *
 * Never clears cookies on failure; that policy belongs to the caller.
 */
export async function refreshSession(store: CookieStore): Promise<RefreshResult> {
  const refreshToken = store.get(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN)?.value;

  if (!refreshToken) {
    return { ok: false, status: 401 };
  }

  try {
    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const data = await response.json();

    setAccessCookie(
      store,
      data.access_token,
      data.expires_in || AUTH_CONFIG.TOKEN_EXPIRY.ACCESS,
    );

    // Store the rotated refresh token. Guarded so a backend that predates
    // rotation (or a rollback to one) still just works: no successor in the
    // response means the presented token is still the live one.
    if (data.refresh_token) {
      setRefreshCookie(
        store,
        data.refresh_token,
        data.refresh_expires_in || AUTH_CONFIG.TOKEN_EXPIRY.REFRESH,
      );
    }

    return { ok: true, accessToken: data.access_token };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { ok: false, status: null };
  }
}
