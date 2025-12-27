import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// DELETE /api/auth/me/recent-actions/[id] - Delete recent action
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const actionId = parseInt(id, 10);

    if (isNaN(actionId)) {
      return NextResponse.json(
        { error: 'Invalid action ID' },
        { status: 400 }
      );
    }

    let response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/me/recent-actions/${actionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // If token expired, try to refresh and retry
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/me/recent-actions/${actionId}`, {
          method: 'DELETE',
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

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.detail || 'Failed to delete recent action' },
        { status: response.status }
      );
    }

    // DELETE returns 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete recent action error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


