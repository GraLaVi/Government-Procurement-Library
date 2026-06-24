import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { buildForwardHeaders } from '@/lib/api/forwardHeaders';
import { clearAuthCookies } from '@/lib/auth/cookies';

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
          ...buildForwardHeaders(request),
        },
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
