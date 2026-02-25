import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/library/vendor/[cageCode]/tab-counts - Get vendor tab record counts
// Proxies to: GET /api/v1/library/vendor/{cage_code}/tab-counts
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

    const url = `${AUTH_CONFIG.API_BASE_URL}/library/vendor/${encodeURIComponent(cageCode)}/tab-counts`;

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
      if (response.status === 404) {
        return NextResponse.json({
          cage_code: cageCode,
          awards_count: 0,
          bookings_count: 0,
          solicitations_count: 0,
        });
      }

      return NextResponse.json(
        { error: data.detail || 'Failed to fetch tab counts' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Vendor tab-counts error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
