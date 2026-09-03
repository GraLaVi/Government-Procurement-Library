import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { setAccessCookie, setRefreshCookie, clearLegacyAuthCookies } from '@/lib/auth/cookies';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// POST /api/billing/signup/customer — public.
// Body: { cage_code, email, password, first_name, last_name, company_name? }
// On success, sets the same httpOnly auth cookies as /api/auth/login so the
// caller can immediately call refreshUser() and proceed to /pricing.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upstream = `${AUTH_CONFIG.API_BASE_URL}/billing/signup/customer`;

    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await buildForwardHeadersFromContext()) },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.detail || 'Signup failed' },
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
    console.error('Signup error:', err);
    return NextResponse.json(
      { success: false, error: 'Unable to connect to server. Please try again.' },
      { status: 500 },
    );
  }
}
