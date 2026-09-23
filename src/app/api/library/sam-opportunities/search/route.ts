import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// GET /api/library/sam-opportunities/search - Search SAM.gov notices with no part link
// Proxies to: GET /api/v1/library/sam-opportunities/search
//
// A static segment sits beside the [opp_id] one; Next matches static first, so
// "search" can never be read as an opportunity id.

// Parameter NAMES are forwarded, values are not inspected. The backend is the
// real boundary — its Query() patterns reject a bad status/sort with a 422 —
// and the bid-matching results proxy documents what a second allowlist here
// costs: a value added to the backend's sort map but missed in the frontend
// copy was silently dropped, so the request succeeded with no sort at all and
// the column just never moved. Validating in one place fails loudly instead.
const FORWARDED = [
  'q', 'naics', 'psc', 'set_aside', 'agency', 'state', 'status',
  'posted_from', 'posted_to', 'has_documents', 'sort', 'page', 'page_size',
] as const;

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    for (const name of FORWARDED) {
      const value = searchParams.get(name);
      if (value !== null && value !== '') params.set(name, value);
    }

    // Note: AUTH_CONFIG.API_BASE_URL already includes /api/v1
    const url = `${AUTH_CONFIG.API_BASE_URL}/library/sam-opportunities/search?${params.toString()}`;

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
        { error: data.detail || 'Search failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Solicitation search error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
