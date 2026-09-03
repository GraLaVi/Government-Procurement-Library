import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// POST /api/billing/purchase-addon — attaches an add-on to the customer's
// existing tier subscription (prorated, charged immediately, one invoice).
// Body: { price_id, seat_quantity, tos_version?, tos_accepted_at? }.
//
// 409 with error 'no_host_subscription' is a real outcome, not a failure: the
// customer has no tier to attach to, and the caller falls back to ordinary
// Checkout. It is passed through verbatim so the page can branch on it.
export async function POST(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const body = await request.json();

    let response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/purchase-addon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(await buildForwardHeadersFromContext()),
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/purchase-addon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
            ...(await buildForwardHeadersFromContext()),
          },
          body: JSON.stringify(body),
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
        { error: data.detail || 'Failed to purchase the add-on' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Add-on purchase error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
