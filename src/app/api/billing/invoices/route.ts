import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { getAccessToken, refreshAccessToken } from '@/lib/auth/getAccessToken';

// GET /api/billing/invoices?limit=&offset= — logged-in customer's invoices.
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const qs = new URLSearchParams();
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    if (limit) qs.set('limit', limit);
    if (offset) qs.set('offset', offset);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';

    let response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/invoices${suffix}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/billing/invoices${suffix}`, {
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
        { error: data.detail || 'Failed to fetch invoices' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
