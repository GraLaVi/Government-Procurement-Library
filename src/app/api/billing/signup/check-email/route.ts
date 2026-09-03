import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

// POST /api/billing/signup/check-email — public, no auth.
// Body: { email }
// Returns: { available: boolean }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upstream = `${AUTH_CONFIG.API_BASE_URL}/billing/signup/check-email`;

    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await buildForwardHeadersFromContext()) },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Email check failed' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Check email error:', err);
    // Network failure — return a soft answer so the signup form falls back to
    // server-side validation at submit time instead of blocking the visitor.
    return NextResponse.json({ available: true, soft: true });
  }
}
