import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

const UPSTREAM = `${AUTH_CONFIG.API_BASE_URL}/notifications/contacts`;

async function authedFetch(init: RequestInit) {
  let accessToken = await getAccessToken();
  if (!accessToken) return { unauth: true };

  const withAuth = (token: string): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  });

  let response = await fetch(UPSTREAM, withAuth(accessToken));
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) return { expired: true };
    response = await fetch(UPSTREAM, withAuth(newToken));
  }
  return { response };
}

// GET /api/notifications/contacts — admin only: list customer contacts.
export async function GET(_request: NextRequest) {
  try {
    const result = await authedFetch({ method: 'GET' });
    if ('unauth' in result) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if ('expired' in result) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 },
      );
    }
    const data = await result.response.json();
    if (!result.response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to list contacts' },
        { status: result.response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('List contacts error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

// POST /api/notifications/contacts — admin only: create a customer contact.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await authedFetch({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if ('unauth' in result) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if ('expired' in result) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 },
      );
    }
    const data = await result.response.json();
    if (!result.response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to create contact' },
        { status: result.response.status },
      );
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
