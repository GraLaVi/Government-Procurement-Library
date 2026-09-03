import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// POST /api/billing/close-account — body: { confirm: true }
// Deactivates the whole account (admin only, non-destructive): cancels billing,
// sets the account inactive, deactivates all users. No data is deleted.
export async function POST(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const upstream = `${AUTH_CONFIG.API_BASE_URL}/billing/close-account`;

    let response = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(await buildForwardHeadersFromContext()) },
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(upstream, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}`, ...(await buildForwardHeadersFromContext()) },
          body: JSON.stringify(body),
        });
      } else {
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to close account' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Close account error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
