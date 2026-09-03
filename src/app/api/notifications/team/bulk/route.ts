import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

const UPSTREAM = `${AUTH_CONFIG.API_BASE_URL}/notifications/team/bulk`;

// POST /api/notifications/team/bulk — customer admin: atomic bulk update
// of subscriptions for one notification type across team users + contacts.
export async function POST(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const init: RequestInit = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(await buildForwardHeadersFromContext()),
      },
      body: JSON.stringify(body),
    };

    let response = await fetch(UPSTREAM, init);
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 },
        );
      }
      init.headers = {
        Authorization: `Bearer ${newToken}`,
        'Content-Type': 'application/json',
      };
      response = await fetch(UPSTREAM, init);
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to bulk-update team subscriptions' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Bulk team subscriptions error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
