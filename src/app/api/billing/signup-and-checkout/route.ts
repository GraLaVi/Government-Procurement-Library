import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';

// POST /api/billing/signup-and-checkout — public.
// Body: { cage_code, email, password, first_name, last_name, company_name?, price_id, seat_quantity }
// Returns: { checkout_url, session_id, customer_id, user_id }
//
// Critically does NOT set auth cookies — visitor isn't logged in until they
// return from a successful Stripe Checkout via /finalize-checkout. This is
// the whole point of Option 2: no logged-in account exists until the
// customer has actually subscribed.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upstream = `${AUTH_CONFIG.API_BASE_URL}/billing/signup-and-checkout`;

    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Signup failed' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('signup-and-checkout error:', err);
    return NextResponse.json(
      { error: 'Unable to reach the signup service. Please try again.' },
      { status: 503 },
    );
  }
}
