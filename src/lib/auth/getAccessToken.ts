import { cookies } from 'next/headers';
import { AUTH_CONFIG } from './config';
import { setAccessCookie, clearAuthCookies } from './cookies';

/**
 * Gets a valid access token, refreshing it if necessary.
 * Returns null if no valid token can be obtained.
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const refreshToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN)?.value;

  // If we have an access token, return it (we'll handle 401s at the call site if needed)
  if (accessToken) {
    return accessToken;
  }

  // No access token - try to refresh
  if (!refreshToken) {
    return null;
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
      return null;
    }

    const data = await response.json();

    // Update the access token cookie
    setAccessCookie(cookieStore, data.access_token, data.expires_in || AUTH_CONFIG.TOKEN_EXPIRY.ACCESS);

    return data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

/**
 * Attempts to refresh the access token.
 * Returns the new access token or null if refresh failed.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN)?.value;

  if (!refreshToken) {
    return null;
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
      // Clear cookies on refresh failure
      await clearAuthCookies(cookieStore);
      return null;
    }

    const data = await response.json();

    // Update the access token cookie
    setAccessCookie(cookieStore, data.access_token, data.expires_in || AUTH_CONFIG.TOKEN_EXPIRY.ACCESS);

    return data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}
