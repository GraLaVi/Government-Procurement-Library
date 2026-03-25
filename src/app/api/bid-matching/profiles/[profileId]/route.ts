import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

async function proxyRequest(
  profileId: string,
  method: string,
  body?: string
) {
  let accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const url = `${AUTH_CONFIG.API_BASE_URL}/bid-matching/profiles/${profileId}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  let response = await fetch(url, { method, headers, body });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { method, headers, body });
    } else {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }
  }

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: data.detail || 'Request failed' },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}

// GET /api/bid-matching/profiles/[profileId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    return proxyRequest(profileId, 'GET');
  } catch (error) {
    console.error('Get bid matching profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT /api/bid-matching/profiles/[profileId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    const body = await request.text();
    return proxyRequest(profileId, 'PUT', body);
  } catch (error) {
    console.error('Update bid matching profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/bid-matching/profiles/[profileId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    return proxyRequest(profileId, 'DELETE');
  } catch (error) {
    console.error('Delete bid matching profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
