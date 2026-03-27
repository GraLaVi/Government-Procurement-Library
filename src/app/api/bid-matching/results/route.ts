import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/bid-matching/results - List match results for a specific date
export async function GET(request: NextRequest) {
  try {
    let accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    const date = searchParams.get('date');
    if (date) params.set('date', date);
    const page = searchParams.get('page');
    if (page) params.set('page', page);
    const pageSize = searchParams.get('page_size');
    if (pageSize) params.set('page_size', pageSize);

    const backendUrl = `${AUTH_CONFIG.API_BASE_URL}/bid-matching/results?${params.toString()}`;

    let response = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(backendUrl, {
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
        { error: data.detail || 'Failed to fetch match results' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get bid matching results error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
