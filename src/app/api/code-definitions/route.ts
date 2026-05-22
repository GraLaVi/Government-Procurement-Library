import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/code-definitions?code_type=SET_ASIDE — canonical code lookup.
// Proxies to FastAPI /api/v1/code-definitions. Vocabulary is near-static;
// the client side caches one fetch per session.
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const codeType = request.nextUrl.searchParams.get('code_type');
    if (!codeType) {
      return NextResponse.json(
        { error: "Missing required query parameter 'code_type'." },
        { status: 400 },
      );
    }

    const upstream = `${AUTH_CONFIG.API_BASE_URL}/code-definitions?code_type=${encodeURIComponent(codeType)}`;
    let response = await fetch(upstream, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(upstream, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
      } else {
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to load code definitions' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Get code definitions error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
