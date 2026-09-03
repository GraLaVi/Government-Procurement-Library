import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCOUNT_INACTIVE_CODE, ACCOUNT_INACTIVE_MESSAGE, AUTH_CONFIG } from '@/lib/auth/config';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { refreshSession } from '@/lib/auth/refresh';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

async function refreshAccessToken(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<string | null> {
  const result = await refreshSession(cookieStore);
  return result.ok ? result.accessToken : null;
}

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN)?.value;

    if (!accessToken) {
      // No access token - try to refresh
      accessToken = await refreshAccessToken(cookieStore) ?? undefined;

      if (!accessToken) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }
    }

    let response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...(await buildForwardHeadersFromContext()),
      },
    });

    // If access token expired, try to refresh and retry
    if (response.status === 401) {
      const newAccessToken = await refreshAccessToken(cookieStore);

      if (newAccessToken) {
        // Retry with new access token
        response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${newAccessToken}`,
            ...(await buildForwardHeadersFromContext()),
          },
        });
      } else {
        // Refresh failed - clear cookies and return 401
        await clearAuthCookies(cookieStore);

        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 }
        );
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Company account deactivated: clear the session so the user is
      // signed out on this page load instead of seeing errors while
      // appearing logged in.
      if (errorData.detail === ACCOUNT_INACTIVE_CODE) {
        await clearAuthCookies(cookieStore);
        return NextResponse.json(
          { error: ACCOUNT_INACTIVE_MESSAGE },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch user' },
        { status: response.status }
      );
    }

    const user = await response.json();
    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
