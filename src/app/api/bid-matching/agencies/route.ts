import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// GET /api/bid-matching/agencies — the AGENCY condition's vocabulary, read
// live from SAM.gov notices by the API and cached there for a day. Also
// carries the two rules the editor must not guess at: the `in`-list delimiter
// and the per-value length cap.
export async function GET() {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const upstream = `${AUTH_CONFIG.API_BASE_URL}/bid-matching/agencies`;
    let response = await fetch(upstream, {
      headers: { Authorization: `Bearer ${accessToken}`, ...(await buildForwardHeadersFromContext()) },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(upstream, {
          headers: { Authorization: `Bearer ${newToken}`, ...(await buildForwardHeadersFromContext()) },
        });
      } else {
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to load agencies' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Get agencies error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
