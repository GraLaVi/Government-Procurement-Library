import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// POST /api/billing/subscriptions/{id}/reactivate — no body required.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const upstream = `${AUTH_CONFIG.API_BASE_URL}/billing/subscriptions/${id}/reactivate`;

    let response = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: '{}',
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(upstream, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
          body: '{}',
        });
      } else {
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to reactivate subscription' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
