import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';

// GET /api/billing/plans — public; no auth required, but we proxy so the
// browser never talks to the FastAPI origin directly.
export async function GET() {
  try {
    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/plans`);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch plans' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get plans error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
