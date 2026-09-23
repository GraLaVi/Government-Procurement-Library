import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// GET /api/library/sam-opportunities/[opp_id] - One SAM.gov notice, for the detail panel
// Proxies to: GET /api/v1/library/sam-opportunities/{opp_id}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ opp_id: string }> }
) {
  try {
    const { opp_id } = await params;

    const oppId = parseInt(opp_id, 10);
    if (Number.isNaN(oppId)) {
      return NextResponse.json(
        { error: 'Invalid opportunity ID' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Note: AUTH_CONFIG.API_BASE_URL already includes /api/v1
    const url = `${AUTH_CONFIG.API_BASE_URL}/library/sam-opportunities/${oppId}`;

    let response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(await buildForwardHeadersFromContext()),
      },
    });

    // If token expired, try to refresh and retry
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${newToken}`,
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
      return NextResponse.json(
        { error: data.detail || 'Failed to load solicitation' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Solicitation detail error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
