import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/library/parts/search - Search parts
// Proxies to: GET /api/v1/library/parts/search
export async function GET(request: NextRequest) {
  try {
    console.log('[PartsSearch] Starting search request');

    let accessToken = await getAccessToken();
    console.log('[PartsSearch] Got access token:', !!accessToken);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get search params from URL
    const { searchParams } = new URL(request.url);
    console.log('[PartsSearch] Search params:', searchParams.toString());

    // Build query string for backend
    const queryParams = new URLSearchParams();

    // Forward all search parameters
    const paramNames = ['nsn', 'niin', 'fsc', 'q', 'limit', 'offset'];
    for (const param of paramNames) {
      const value = searchParams.get(param);
      if (value) {
        queryParams.set(param, value);
      }
    }

    // Build backend URL
    // Note: AUTH_CONFIG.API_BASE_URL already includes /api/v1
    const url = `${AUTH_CONFIG.API_BASE_URL}/library/parts/search?${queryParams.toString()}`;
    console.log('[PartsSearch] Backend URL:', url);

    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    console.log('[PartsSearch] Backend response status:', response.status);

    // If token expired, try to refresh and retry
    if (response.status === 401) {
      console.log('[PartsSearch] Token expired, refreshing...');
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
        });
        console.log('[PartsSearch] Retry response status:', response.status);
      } else {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 }
        );
      }
    }

    const data = await response.json();
    console.log('[PartsSearch] Response data received, total results:', data.total);

    if (!response.ok) {
      console.error('[PartsSearch] Backend error:', data);
      return NextResponse.json(
        { error: data.detail || 'Failed to search parts' },
        { status: response.status }
      );
    }

    // Return search results directly
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[PartsSearch] Error:', errorMessage);
    console.error('[PartsSearch] Stack:', errorStack);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${errorMessage}` },
      { status: 500 }
    );
  }
}
