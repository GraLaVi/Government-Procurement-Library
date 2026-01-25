import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/library/parts/[nsn]/procurement-item-description - Get part procurement item description
// Proxies to: GET /api/v1/library/parts/{nsn}/procurement-item-description
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

    // Build backend URL
    // Note: AUTH_CONFIG.API_BASE_URL already includes /api/v1
    const url = `${AUTH_CONFIG.API_BASE_URL}/library/parts/${encodeURIComponent(nsn)}/procurement-item-description`;

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
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch procurement item description' },
        { status: response.status }
      );
    }

    // Return description directly
    return NextResponse.json(data);
  } catch (error) {
    console.error('Procurement item description error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
