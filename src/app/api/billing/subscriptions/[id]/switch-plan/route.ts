import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// POST /api/billing/subscriptions/{id}/switch-plan — body: { price_id }
// Switches a subscription to a different plan (cross-product allowed).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const upstream = `${AUTH_CONFIG.API_BASE_URL}/billing/subscriptions/${id}/switch-plan`;

    let response = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(upstream, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
          body: JSON.stringify(body),
        });
      } else {
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to switch plan' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Switch plan error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
