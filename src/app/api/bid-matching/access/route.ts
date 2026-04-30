import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/bid-matching/access — { has_access, tier, limits, usage }
export async function GET() {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const upstream = `${AUTH_CONFIG.API_BASE_URL}/bid-matching/access`;
    let response = await fetch(upstream, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(upstream, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
      } else {
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to load bid-matching access' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Get bid-matching access error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
