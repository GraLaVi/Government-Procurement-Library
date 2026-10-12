import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// PUT /api/bid-matching/results/highlight - give a solicitation one of the
// account's highlight colors, or clear it (label_id null). Desired state in
// the body, like the star's route next door.
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
      label_id: typeof body.label_id === 'number' ? body.label_id : null,
    };

    const backendUrl = `${AUTH_CONFIG.API_BASE_URL}/bid-matching/results/highlight`;

    const forwarded = await buildForwardHeadersFromContext();
    const send = (token: string) =>
      fetch(backendUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...forwarded,
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
        { error: data.detail || 'Failed to save the highlight' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Set bid match highlight error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
