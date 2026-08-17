import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/library/analytics/my-business/market-prioritization
//   Prospecting list: parts outside the customer's catalog that DLA is
//   flagging for a near-term buy, ranked by estimated value. Analytics add-on
//   only — same 403 {reason, required_product} shape as /my-business.
// Proxies to: GET /api/v1/library/analytics/my-business/market-prioritization
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const url = `${AUTH_CONFIG.API_BASE_URL}/library/analytics/my-business/market-prioritization`;

    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${newToken}`,
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
      if (response.status === 403 && data.detail && typeof data.detail === 'object') {
        return NextResponse.json(
          { error: data.detail.reason || 'Access denied', tier: data.detail.tier ?? null },
          { status: 403 }
        );
      }
      console.error('[Analytics/MarketPrioritization] Backend error:', data);
      return NextResponse.json(
        { error: typeof data.detail === 'string' ? data.detail : 'Failed to fetch market prioritization' },
        { status: response.status }
      );
    }

    const resp = NextResponse.json(data);
    resp.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return resp;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Analytics/MarketPrioritization] Error:', errorMessage);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${errorMessage}` },
      { status: 500 }
    );
  }
}
