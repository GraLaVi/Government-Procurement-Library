import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

function upstreamUrl(id: string) {
  return `${AUTH_CONFIG.API_BASE_URL}/notifications/contacts/${id}`;
}

async function forward(
  id: string,
  init: RequestInit,
  errorLabel: string,
) {
  let accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = upstreamUrl(id);
  const withAuth = (token: string): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  });

  let response = await fetch(url, withAuth(accessToken));
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 },
      );
    }
    response = await fetch(url, withAuth(newToken));
  }

  // 204 No Content has no JSON body.
  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json(
      { error: data.detail || `Failed to ${errorLabel} contact` },
      { status: response.status },
    );
  }
  return NextResponse.json(data);
}

// PATCH /api/notifications/contacts/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    return await forward(
      id,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      'update',
    );
  } catch (error) {
    console.error('Update contact error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

// DELETE /api/notifications/contacts/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await forward(id, { method: 'DELETE' }, 'delete');
  } catch (error) {
    console.error('Delete contact error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
