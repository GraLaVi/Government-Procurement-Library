import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// GET /api/bid-matching/results/filter-fields?source=dibbs
//
// The vocabulary the results filter may build conditions from. Served by the
// backend rather than hardcoded here because the two sources do not carry the
// same columns — AMC, TDP/specs and fast-award are DIBBS-only — and a list that
// drifted from the compiler's would offer filters that come back as 400s.
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const source = request.nextUrl.searchParams.get('source');
    const qs = source === 'sam' || source === 'dibbs' ? `?source=${source}` : '';
    const upstream = `${AUTH_CONFIG.API_BASE_URL}/bid-matching/results/filter-fields${qs}`;

    let response = await fetch(upstream, {
      headers: { Authorization: `Bearer ${accessToken}`, ...(await buildForwardHeadersFromContext()) },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(upstream, {
          headers: { Authorization: `Bearer ${newToken}`, ...(await buildForwardHeadersFromContext()) },
        });
      } else {
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to load filter fields' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Get bid-match filter fields error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
