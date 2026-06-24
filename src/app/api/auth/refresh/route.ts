import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { setAccessCookie, clearAuthCookies } from '@/lib/auth/cookies';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 401 }
      );
    }

    // Call the backend API to refresh tokens
    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed - clear cookies and return error
      await clearAuthCookies(cookieStore);

      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    const data = await response.json();

    // Update access token cookie with new token
    setAccessCookie(cookieStore, data.access_token, data.expires_in || AUTH_CONFIG.TOKEN_EXPIRY.ACCESS);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    );
  }
}
