import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';

// GET /api/landing/today-stats — public; powers the marketing-site Hero card
// "Today's Solicitations". Forwards the backend's 5-min Cache-Control so the
// browser/CDN can short-circuit subsequent visitors.
export async function GET() {
  try {
    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/landing/today-stats`);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch landing stats' },
        { status: response.status },
      );
    }

    const upstreamCache = response.headers.get('cache-control');
    return NextResponse.json(data, {
      headers: upstreamCache ? { 'Cache-Control': upstreamCache } : undefined,
    });
  } catch (error) {
    console.error('Get landing stats error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
