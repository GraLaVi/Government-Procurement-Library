import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { setAccessCookie, setRefreshCookie, clearLegacyAuthCookies } from '@/lib/auth/cookies';

// POST /api/billing/finalize-checkout — public.
// Body: { session_id }
// Returns: { success, customer_id, user_id } and sets the same httpOnly auth
// cookies as /api/auth/login. Called from /account/billing on the post-Checkout
// return so the user becomes logged in only after a successful subscription.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upstream = `${AUTH_CONFIG.API_BASE_URL}/billing/finalize-checkout`;

    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.detail || 'Could not finalize checkout' },
        { status: response.status },
      );
    }

    const cookieStore = await cookies();
    await clearLegacyAuthCookies(cookieStore);
    setAccessCookie(cookieStore, data.access_token, data.expires_in);
    setRefreshCookie(cookieStore, data.refresh_token, data.refresh_expires_in);

    return NextResponse.json({
      success: true,
      customer_id: data.customer_id,
      user_id: data.user_id,
    });
  } catch (err) {
    console.error('finalize-checkout error:', err);
    return NextResponse.json(
      { success: false, error: 'Unable to reach the server. Please try again.' },
      { status: 503 },
    );
  }
}
