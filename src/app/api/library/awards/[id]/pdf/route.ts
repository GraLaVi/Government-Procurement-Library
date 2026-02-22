import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/library/awards/[id]/pdf - Stream award PDF
// Proxies to: GET /api/v1/library/awards/{id}/pdf
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Order detail ID is required' },
        { status: 400 }
      );
    }

    const orderDetailId = parseInt(id, 10);
    if (Number.isNaN(orderDetailId)) {
      return NextResponse.json(
        { error: 'Invalid order detail ID' },
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

    const url = `${AUTH_CONFIG.API_BASE_URL}/library/awards/${orderDetailId}/pdf`;

    let response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        const retryResponse = await fetch(url, {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });
        if (!retryResponse.ok) {
          const err = await retryResponse.json().catch(() => ({}));
          return NextResponse.json(
            { error: err.detail || 'Failed to fetch PDF' },
            { status: retryResponse.status }
          );
        }
        const blob = await retryResponse.blob();
        const contentType = retryResponse.headers.get('content-type') || 'application/pdf';
        const contentDisposition = retryResponse.headers.get('content-disposition');
        return new NextResponse(blob, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
          },
        });
      }
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.detail || 'Failed to fetch PDF' },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentDisposition = response.headers.get('content-disposition');

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
      },
    });
  } catch (error) {
    console.error('Award PDF proxy error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
