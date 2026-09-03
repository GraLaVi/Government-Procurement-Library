import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// GET /api/library/sam-opportunities/[opp_id]/documents/[item_id] - Stream a stored SAM document
// Proxies to: GET /api/v1/library/sam-opportunities/{opp_id}/documents/{item_id}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ opp_id: string; item_id: string }> }
) {
  try {
    const { opp_id, item_id } = await params;

    const oppId = parseInt(opp_id, 10);
    const itemId = parseInt(item_id, 10);
    if (Number.isNaN(oppId) || Number.isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid document reference' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const url = `${AUTH_CONFIG.API_BASE_URL}/library/sam-opportunities/${oppId}/documents/${itemId}`;

    const streamBack = (r: Response, blob: Blob) => {
      const contentType = r.headers.get('content-type') || 'application/octet-stream';
      const contentDisposition = r.headers.get('content-disposition');
      return new NextResponse(blob, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
        },
      });
    };

    let response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(await buildForwardHeadersFromContext()),
      },
    });

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

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.detail || 'Failed to fetch document' },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    return streamBack(response, blob);
  } catch (error) {
    console.error('SAM opportunity document proxy error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
