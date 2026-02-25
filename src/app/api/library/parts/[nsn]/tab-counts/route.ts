import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/library/parts/[nsn]/tab-counts - Get part tab record counts
// Proxies to: GET /api/v1/library/parts/{nsn}/tab-counts
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

    let accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const url = `${AUTH_CONFIG.API_BASE_URL}/library/parts/${encodeURIComponent(nsn)}/tab-counts`;

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
          nsn: nsn,
          procurement_history_count: 0,
          solicitations_count: 0,
          manufacturers_count: 0,
          technical_characteristics_count: 0,
          end_use_description_count: 0,
          has_packaging: false,
          has_procurement_item_description: false,
        });
      }

      return NextResponse.json(
        { error: data.detail || 'Failed to fetch tab counts' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Parts tab-counts error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
