import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/library/vendor/[cageCode]/bookings - Get vendor booking history
// Proxies to: GET /api/v1/library/vendor/{cage_code}/bookings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cageCode: string }> }
) {
  try {
    const { cageCode } = await params;

    if (!cageCode) {
      return NextResponse.json(
        { error: 'CAGE code is required' },
        { status: 400 }
      );
    }

    let accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get optional months parameter (default 13)
    const { searchParams } = new URL(request.url);
    const months = searchParams.get('months') || '13';

    // Build backend URL
    // Note: AUTH_CONFIG.API_BASE_URL already includes /api/v1
    const url = new URL(
      `${AUTH_CONFIG.API_BASE_URL}/library/vendor/${encodeURIComponent(cageCode)}/bookings`
    );
    url.searchParams.set('months', months);

    let response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // If token expired, try to refresh and retry
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url.toString(), {
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
      // 404 means no booking data found - return empty structure
      if (response.status === 404) {
        return NextResponse.json({
          cage_code: cageCode,
          months: [],
          totals: {
            dscp_total: 0,
            dscr_total: 0,
            dscc_total: 0,
            other_total: 0,
            grand_total: 0,
          },
        });
      }

      return NextResponse.json(
        { error: data.detail || 'Failed to fetch booking data' },
        { status: response.status }
      );
    }

    // Return bookings data directly
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vendor bookings error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
