import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// PUT /api/bid-matching/results/interest - flag or unflag a solicitation the
// customer wants to come back to. The body carries the desired state rather
// than toggling server-side, so a double-click can't land the star in the
// opposite state from the one the buyer sees.
export async function PUT(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const payload = {
      solicitation_id: body.solicitation_id ?? null,
      sam_opportunity_id: body.sam_opportunity_id ?? null,
      interested: Boolean(body.interested),
    };

    const backendUrl = `${AUTH_CONFIG.API_BASE_URL}/bid-matching/results/interest`;
    const send = (token: string) =>
      fetch(backendUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

    let response = await send(accessToken);

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await send(newToken);
      } else {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 }
        );
      }
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to update the flag' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Set bid match interest error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
