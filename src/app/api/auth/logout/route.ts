import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { buildForwardHeaders } from '@/lib/api/forwardHeaders';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { refreshSession } from '@/lib/auth/refresh';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN)?.value;

    // The access token expires long before the refresh token does, so anyone
    // signing out after a gap would otherwise skip the backend call entirely
    // and leave a live refresh token behind for the rest of its lifetime.
    // Spend one refresh to get a usable access token so the revoke lands.
    if (!accessToken) {
      const refreshed = await refreshSession(cookieStore);
      if (refreshed.ok) {
        accessToken = refreshed.accessToken;
      }
    }

    // Call backend logout to invalidate token (best effort). The refresh token
    // is sent so the backend revokes it server-side — clearing the cookie only
    // removes this browser's copy.
    if (accessToken) {
      const refreshToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN)?.value;

      await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...buildForwardHeaders(request),
        },
        body: JSON.stringify({ refresh_token: refreshToken ?? null }),
      }).catch(() => {
        // Ignore errors - we'll clear cookies regardless
      });
    }

    // Clear cookies across every name/scope they may exist on.
    await clearAuthCookies(cookieStore);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Still try to clear cookies on error
    const cookieStore = await cookies();
    await clearAuthCookies(cookieStore);

    return NextResponse.json({ success: true });
  }
}
