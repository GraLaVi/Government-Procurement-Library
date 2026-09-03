import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// GET /api/library/analytics/my-business - Customer-specific analytics
// Proxies to: GET /api/v1/library/analytics/my-business
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const url = `${AUTH_CONFIG.API_BASE_URL}/library/analytics/my-business`;

    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...(await buildForwardHeadersFromContext()),
      },
    });

    // If token expired, try to refresh and retry
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            ...(await buildForwardHeadersFromContext()),
          },
        });
      } else {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 }
        );
      }
    }

    const data = await response.json();

    if (!response.ok) {
      // 403 is the expected signal for Basic/None users — it drives the
      // dashboard branch, not a failure mode. Don't log it as an error.
      if (response.status === 403 && data.detail && typeof data.detail === 'object') {
        return NextResponse.json(
          { error: data.detail.reason || 'Access denied', tier: data.detail.tier ?? null },
          { status: 403 }
        );
      }
      console.error('[Analytics/MyBusiness] Backend error:', data);
      return NextResponse.json(
        { error: typeof data.detail === 'string' ? data.detail : 'Failed to fetch business analytics' },
        { status: response.status }
      );
    }

    const resp = NextResponse.json(data);
    resp.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return resp;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Analytics/MyBusiness] Error:', errorMessage);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${errorMessage}` },
      { status: 500 }
    );
  }
}
