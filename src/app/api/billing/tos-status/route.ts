import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/billing/tos-status — whether the logged-in customer already has a
// current-version Terms of Service acceptance on file. Used to skip
// re-showing the ToS consent modal on a later add-on/upgrade purchase.
// Returns `{ needs_acceptance: boolean }`.
export async function GET() {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/tos-status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/tos-status`, {
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
        { error: data.detail || 'Failed to load ToS status' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get ToS status error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
