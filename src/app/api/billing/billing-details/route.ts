import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// GET /api/billing/billing-details — the Stripe-side billing view for the
// logged-in customer: billing contact + card + next charge as Stripe knows
// them (the person who entered the card, which may differ from the signup
// user). Read-only. `has_stripe_customer=false` for Free/pre-subscription
// customers.
export async function GET() {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/billing-details`, {
      headers: { Authorization: `Bearer ${accessToken}`, ...(await buildForwardHeadersFromContext()) },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/billing-details`, {
          headers: { Authorization: `Bearer ${newToken}`, ...(await buildForwardHeadersFromContext()) },
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
        { error: data.detail || 'Failed to load billing details' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get billing details error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
