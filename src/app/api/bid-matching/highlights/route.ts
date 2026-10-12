import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// /api/bid-matching/highlights - the account's named row-highlight colors.
// GET lists them; PUT replaces the whole set (a color left out is deleted and
// cleared from its rows). Validation is the backend's: up to five, one per
// palette color, names 1-40 characters.

const backendUrl = () => `${AUTH_CONFIG.API_BASE_URL}/bid-matching/highlights`;

async function forward(init: (token: string) => RequestInit, failure: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  let response = await fetch(backendUrl(), init(accessToken));
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
    }
    response = await fetch(backendUrl(), init(newToken));
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // A 422 from pydantic carries a list; surface its first message.
    const detail = Array.isArray(data?.detail) ? data.detail[0]?.msg : data?.detail;
    return NextResponse.json({ error: detail || failure }, { status: response.status });
  }
  return NextResponse.json(data);
}

export async function GET() {
  try {
    const forwarded = await buildForwardHeadersFromContext();
    return await forward(
      (token) => ({ headers: { Authorization: `Bearer ${token}`, ...forwarded } }),
      'Failed to load highlight colors',
    );
  } catch (error) {
    console.error('List highlight colors error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const labels = Array.isArray(body?.labels) ? body.labels : [];
    const payload = {
      labels: labels.map((l: { id?: unknown; name?: unknown; color?: unknown }) => ({
        id: typeof l.id === 'number' ? l.id : null,
        name: String(l.name ?? ''),
        color: String(l.color ?? ''),
      })),
    };
    const forwarded = await buildForwardHeadersFromContext();
    return await forward(
      (token) => ({
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...forwarded },
        body: JSON.stringify(payload),
      }),
      'Failed to save highlight colors',
    );
  } catch (error) {
    console.error('Save highlight colors error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
