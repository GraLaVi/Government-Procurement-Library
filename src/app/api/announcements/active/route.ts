import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// GET /api/announcements/active — banner-channel announcements the logged-in
// user should currently see (not expired, not dismissed, audience matches).
// Drives the <AnnouncementBanner /> component mounted in the root layout.
export async function GET() {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      // Anonymous visitor: no banner. Treat as empty rather than 401 so
      // the layout component doesn't render an error state for logged-out
      // users browsing public pages.
      return NextResponse.json([]);
    }

    let response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/announcements/active`, {
      headers: { Authorization: `Bearer ${accessToken}`, ...(await buildForwardHeadersFromContext()) },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/announcements/active`, {
          headers: { Authorization: `Bearer ${newToken}`, ...(await buildForwardHeadersFromContext()) },
        });
      } else {
        // Couldn't refresh; behave like anonymous (no banner) instead of
        // surfacing a 401 in the layout.
        return NextResponse.json([]);
      }
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to load announcements' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get active announcements error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
