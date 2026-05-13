import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/billing/user-cap — org-level user-cap status for the logged-in
// customer. Returns `{ used, cap }` where cap is null when uncapped.
// Drives the "X / Y users" pill and the disabled state of the Add User
// button on /account/users.
export async function GET() {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/user-cap`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/user-cap`, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
      } else {
        return NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 },
        );
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to load user cap' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get user cap error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
