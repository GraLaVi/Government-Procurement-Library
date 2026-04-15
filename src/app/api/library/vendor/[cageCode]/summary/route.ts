import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeaders } from '@/lib/api/forwardHeaders';

// GET /api/library/vendor/[cageCode]/summary - Combined search + detail + tab counts
// Proxies to: GET /api/v1/library/vendor/{cage_code}/summary
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

    const url = `${AUTH_CONFIG.API_BASE_URL}/library/vendor/${encodeURIComponent(cageCode)}/summary`;
    const forwardHeaders = buildForwardHeaders(request);

    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...forwardHeaders,
      },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            ...forwardHeaders,
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
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch vendor summary' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Vendor summary error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
