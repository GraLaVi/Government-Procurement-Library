import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// GET /api/library/parts/[nsn]/demand - Get DLA demand-intelligence for a part
// Proxies to: GET /api/v1/library/parts/{nsn}/demand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nsn: string }> }
) {
  try {
    const { nsn } = await params;

    if (!nsn) {
      return NextResponse.json(
        { error: 'NSN is required' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Build backend URL
    // Note: AUTH_CONFIG.API_BASE_URL already includes /api/v1
    const url = `${AUTH_CONFIG.API_BASE_URL}/library/parts/${encodeURIComponent(nsn)}/demand`;

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
      // Pass through the backend body (it carries `tier` on a 403) so the
      // client hook can distinguish an Advanced-gate denial from other errors.
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch demand intelligence', tier: data.tier },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Demand intelligence error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
