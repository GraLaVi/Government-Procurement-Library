import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/bid-matching/results - List match results for a specific date
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();

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
    const runDate = searchParams.get('run_date');
    if (runDate) params.set('run_date', runDate);
    const page = searchParams.get('page');
    if (page) params.set('page', page);
    const pageSize = searchParams.get('page_size');
    if (pageSize) params.set('page_size', pageSize);
    const strength = searchParams.get('strength');
    if (strength === 'HARD' || strength === 'SOFT') params.set('strength', strength);
    const reasonSearch = searchParams.get('reason_search');
    if (reasonSearch) params.set('reason_search', reasonSearch);
    const source = searchParams.get('source');
    if (source === 'dibbs' || source === 'sam') params.set('source', source);
    // Sort and field-scoped search are forwarded as given and validated by the
    // backend, which is the real boundary: its sort_by pattern is built from
    // BidMatchResultsService._DIBBS_SORTS, and search_field only ever reaches
    // a dict lookup, never the SQL.
    //
    // A second allowlist here bought no safety and cost a bug: `interested`
    // was added to the sort map but missed in the copy that used to live here,
    // so the parameter was dropped and the request succeeded WITHOUT a sort —
    // the column showed its arrow and the rows never moved. A wrong value now
    // returns 422 instead of silently doing nothing.
    const sortBy = searchParams.get('sort_by');
    if (sortBy) params.set('sort_by', sortBy);
    const sortDir = searchParams.get('sort_dir');
    if (sortDir) params.set('sort_dir', sortDir);
    const searchField = searchParams.get('search_field');
    const search = searchParams.get('search');
    if (search && searchField) {
      params.set('search_field', searchField);
      params.set('search', search);
    }
    if (searchParams.get('interested_only') === 'true') params.set('interested_only', 'true');

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
