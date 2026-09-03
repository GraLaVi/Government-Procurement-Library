import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// POST /api/announcements/{id}/dismiss — record that the logged-in user
// has dismissed this announcement. Idempotent. Returns 204 on success.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = `${AUTH_CONFIG.API_BASE_URL}/announcements/${id}/dismiss`;
    let response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, ...(await buildForwardHeadersFromContext()) },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${newToken}`, ...(await buildForwardHeadersFromContext()) },
        });
      } else {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 },
        );
      }
    }

    if (!response.ok && response.status !== 204) {
      const body = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: body.detail || 'Failed to dismiss' },
        { status: response.status },
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Dismiss announcement error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
