import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// PUT /api/notifications/contacts/[id]/subscriptions/[typeKey]
// Customer-admin: set a single contact's subscription for one type.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; typeKey: string }> },
) {
  try {
    const { id, typeKey } = await params;
    let accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const url = `${AUTH_CONFIG.API_BASE_URL}/notifications/contacts/${id}/subscriptions/${encodeURIComponent(typeKey)}`;
    const init: RequestInit = {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    };

    let response = await fetch(url, init);
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
      response = await fetch(url, init);
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to update contact subscription' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Update contact subscription error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
