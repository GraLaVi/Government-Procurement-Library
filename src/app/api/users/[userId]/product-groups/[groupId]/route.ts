import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// POST /api/users/[userId]/product-groups/[groupId] — assign a product group to a user.
// Mirrors the per-product assignment path but for groups; required when a
// customer's subscription is for a GROUP rather than an individual product.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string; groupId: string }> },
) {
  try {
    const { userId, groupId } = await params;
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const upstream = `${AUTH_CONFIG.API_BASE_URL}/users/${userId}/product-groups/${groupId}`;
    let response = await fetch(upstream, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(upstream, {
          method: 'POST',
          headers: { Authorization: `Bearer ${newToken}`, 'Content-Type': 'application/json' },
        });
      } else {
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to assign product group' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Assign product group error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE /api/users/[userId]/product-groups/[groupId] — remove the group assignment.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string; groupId: string }> },
) {
  try {
    const { userId, groupId } = await params;
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const upstream = `${AUTH_CONFIG.API_BASE_URL}/users/${userId}/product-groups/${groupId}`;
    let response = await fetch(upstream, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(upstream, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${newToken}` },
        });
      } else {
        return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
      }
    }

    if (response.ok || response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: data.detail || 'Failed to remove product group' },
      { status: response.status },
    );
  } catch (err) {
    console.error('Remove product group error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
