import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

const UPSTREAM = `${AUTH_CONFIG.API_BASE_URL}/notifications/team`;

// GET /api/notifications/team — customer admin: list team users + contacts
// with stored/effective frequencies (read-only view for the team page).
export async function GET(_request: NextRequest) {
  try {
    let accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let response = await fetch(UPSTREAM, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 },
        );
      }
      accessToken = newToken;
      response = await fetch(UPSTREAM, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch team subscriptions' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get team subscriptions error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
