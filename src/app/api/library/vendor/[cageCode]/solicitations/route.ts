import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/library/vendor/[cageCode]/solicitations - Get open solicitations for vendor
// Proxies to: GET /api/v1/library/vendor/{cage_code}/solicitations
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

    // Build backend URL
    // Note: AUTH_CONFIG.API_BASE_URL already includes /api/v1
    const url = new URL(
      `${AUTH_CONFIG.API_BASE_URL}/library/vendor/${encodeURIComponent(cageCode)}/solicitations`
    );

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
      // 404 means no solicitations found - return empty structure
      if (response.status === 404) {
        return NextResponse.json({
          cage_code: cageCode,
          solicitations: [],
          total_count: 0,
        });
      }

      return NextResponse.json(
        { error: data.detail || 'Failed to fetch solicitations data' },
        { status: response.status }
      );
    }

    // Return solicitations data directly
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vendor solicitations error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
