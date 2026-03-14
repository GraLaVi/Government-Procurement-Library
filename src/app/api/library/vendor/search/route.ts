import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/library/vendor/search - Search vendors
// Proxies to: GET /api/v1/library/vendor/search
export async function GET(request: NextRequest) {
  try {
    let accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get search params from URL
    const { searchParams } = new URL(request.url);

    // Build query string for backend
    const queryParams = new URLSearchParams();

    // Forward all search parameters
    const paramNames = ['q', 'cage_code', 'uei', 'limit', 'offset'];
    for (const param of paramNames) {
      const value = searchParams.get(param);
      if (value) {
        queryParams.set(param, value);
      }
    }

    // Build backend URL
    // Note: AUTH_CONFIG.API_BASE_URL already includes /api/v1
    const url = `${AUTH_CONFIG.API_BASE_URL}/library/vendor/search?${queryParams.toString()}`;

    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // If token expired, try to refresh and retry
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
      console.error('[VendorSearch] Backend error:', data);
      return NextResponse.json(
        { error: data.detail || 'Failed to search vendors' },
        { status: response.status }
      );
    }

    // Return search results with cache headers
    const resp = NextResponse.json(data);
    resp.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return resp;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[VendorSearch] Error:', errorMessage);
    console.error('[VendorSearch] Stack:', errorStack);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${errorMessage}` },
      { status: 500 }
    );
  }
}
