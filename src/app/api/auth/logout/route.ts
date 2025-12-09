import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth/config';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN)?.value;

    // Call backend logout to invalidate token (best effort)
    if (accessToken) {
      await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }).catch(() => {
        // Ignore errors - we'll clear cookies regardless
      });
    }

    // Clear cookies
    cookieStore.delete(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN);
    cookieStore.delete(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Still try to clear cookies on error
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN);
    cookieStore.delete(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN);

    return NextResponse.json({ success: true });
  }
}
