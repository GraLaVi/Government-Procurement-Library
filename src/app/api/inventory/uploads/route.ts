import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { backendProxy } from '@/lib/api/backendProxy';

// GET /api/inventory/uploads - upload history
export async function GET(request: NextRequest) {
  return backendProxy(request, '/inventory/uploads');
}

// POST /api/inventory/uploads - multipart CSV upload (customer admin).
// Hand-written rather than backendProxy: the shared proxy forwards JSON
// bodies; this one must forward multipart/form-data with the file intact
// (fetch sets the boundary header itself — never set Content-Type manually).
export async function POST(request: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const incoming = await request.formData();
    const file = incoming.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'A CSV file is required.' }, { status: 400 });
    }
    const form = new FormData();
    form.append('file', file, (file as File).name || 'upload.csv');

    const search = request.nextUrl.search; // forwards ?mode=replace|upsert
    const url = `${AUTH_CONFIG.API_BASE_URL}/inventory/uploads${search}`;

    const doFetch = (bearer: string) =>
      fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearer}` },
        body: form,
      });

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

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = (data as { detail?: string; error?: string }).detail
        || (data as { error?: string }).error
        || 'Upload failed';
      return NextResponse.json({ error: detail }, { status: response.status });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Inventory upload proxy error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
