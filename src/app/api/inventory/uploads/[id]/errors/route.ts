import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/inventory/uploads/[id]/errors - download the per-row error report.
// Hand-written: the shared proxy JSON-parses responses; this one streams CSV
// through with its attachment headers.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = `${AUTH_CONFIG.API_BASE_URL}/inventory/uploads/${encodeURIComponent(id)}/errors.csv`;
    const doFetch = (bearer: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });

    let response = await doFetch(token);
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 },
        );
      }
      response = await doFetch(newToken);
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const detail = (data as { detail?: string }).detail || 'Failed to fetch error report';
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    return new NextResponse(await response.text(), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition':
          response.headers.get('Content-Disposition')
          || `attachment; filename="upload-${id}-errors.csv"`,
      },
    });
  } catch (error) {
    console.error('Inventory errors.csv proxy error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
