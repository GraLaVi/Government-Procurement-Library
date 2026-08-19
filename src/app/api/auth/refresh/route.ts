import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { refreshSession } from '@/lib/auth/refresh';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const result = await refreshSession(cookieStore);

    if (result.ok) {
      return NextResponse.json({ success: true });
    }

    // The API is unreachable — say so rather than 401ing, which the client
    // treats as "session over" and bounces to /login.
    if (result.status === null) {
      return NextResponse.json(
        { error: 'Failed to refresh session' },
        { status: 503 }
      );
    }

    // The backend rejected the refresh token - clear cookies and return error
    await clearAuthCookies(cookieStore);

    return NextResponse.json(
      { error: 'Session expired. Please log in again.' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    );
  }
}
