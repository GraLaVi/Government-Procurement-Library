import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// PATCH /api/auth/me/recent-actions/[id]/pin — toggle pin state on a
// recent-action row. Body: { is_pinned: boolean }. Advanced-tier gated
// by the upstream FastAPI handler.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const actionId = parseInt(id, 10);
    if (isNaN(actionId)) {
      return NextResponse.json({ error: 'Invalid action ID' }, { status: 400 });
    }

    const body = await request.json();
    const upstream = `${AUTH_CONFIG.API_BASE_URL}/auth/me/recent-actions/${actionId}/pin`;

    const doFetch = (token: string) =>
      fetch(upstream, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

    let response = await doFetch(accessToken);
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 },
        );
      }
      response = await doFetch(newToken);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to update pin state' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Pin recent action error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
