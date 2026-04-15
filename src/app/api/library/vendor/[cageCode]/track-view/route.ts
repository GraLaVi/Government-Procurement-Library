import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeaders } from '@/lib/api/forwardHeaders';

// POST /api/library/vendor/[cageCode]/track-view?view=... - Record a user tab view
// Proxies to: POST /api/v1/library/vendor/{cage_code}/track-view
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cageCode: string }> }
) {
  try {
    const { cageCode } = await params;
    if (!cageCode) {
      return NextResponse.json({ error: 'CAGE code is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    if (!view) {
      return NextResponse.json({ error: 'view query param is required' }, { status: 400 });
    }

    let accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = `${AUTH_CONFIG.API_BASE_URL}/library/vendor/${encodeURIComponent(cageCode)}/track-view?view=${encodeURIComponent(view)}`;
    const forwardHeaders = buildForwardHeaders(request);

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...forwardHeaders,
      },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${newToken}`,
            ...forwardHeaders,
          },
        });
      } else {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }
    }

    // Backend returns 204; mirror that.
    return new NextResponse(null, { status: response.status });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VendorTrackView] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
