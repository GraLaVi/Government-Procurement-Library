import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth/config';

async function refreshAccessToken(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<string | null> {
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
      return null;
    }

    const data = await response.json();

    // Update the access token cookie
    cookieStore.set(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in || AUTH_CONFIG.TOKEN_EXPIRY.ACCESS,
      path: '/',
    });

    return data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
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
          },
        });
      } else {
        // Refresh failed - clear cookies and return 401
        cookieStore.delete(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN);
        cookieStore.delete(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN);

        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 }
        );
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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
