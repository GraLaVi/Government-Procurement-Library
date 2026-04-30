import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';

// POST /api/billing/signup/validate-cage — public, no auth.
// Body: { cage_code }
// Returns: { eligible, reason, prefill: { legal_business_name, dba_name } }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upstream = `${AUTH_CONFIG.API_BASE_URL}/billing/signup/validate-cage`;

    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'CAGE validation failed' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Validate CAGE error:', err);
    // Network / connection failure (e.g. backend down, ECONNREFUSED). Surface
    // as 503 so the UI can distinguish "couldn't reach the validator" from
    // a real "this CAGE is not eligible" response.
    return NextResponse.json(
      { error: 'Unable to reach the eligibility service. Please try again in a moment.' },
      { status: 503 },
    );
  }
}
