import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { setAccessCookie, setRefreshCookie, clearLegacyAuthCookies } from '@/lib/auth/cookies';

interface Ctx { params: Promise<{ token: string }>; }

// POST /api/rfq/public/[token]/create-account
// Provisions a free responder account (no auth) and logs the user in by
// setting the same httpOnly cookies the login flow uses.
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { token } = await params;
    const body = await request.text();

    const response = await fetch(
      `${AUTH_CONFIG.API_BASE_URL}/rfq/public/${encodeURIComponent(token)}/create-account`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.detail || data.error || 'Could not create account.' },
        { status: response.status },
      );
    }

    const cookieStore = await cookies();
    await clearLegacyAuthCookies(cookieStore);
    setAccessCookie(cookieStore, data.access_token, data.expires_in);
    setRefreshCookie(cookieStore, data.refresh_token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RFQ create-account error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to connect to server. Please try again.' },
      { status: 500 },
    );
  }
}
