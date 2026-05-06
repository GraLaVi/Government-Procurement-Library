import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';

// POST /api/contact — public, no auth.
// Body: { name, email, subject, message, website (honeypot) }
// Returns: { ok: true } on success, error JSON otherwise.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upstream = `${AUTH_CONFIG.API_BASE_URL}/support/contact`;

    // Forward the originating client IP so the backend's per-IP rate
    // limiter throttles the real visitor, not the Next.js server.
    const forwardedFor =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '';

    const response = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Could not submit your message. Please try again.' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Contact submit error:', err);
    return NextResponse.json(
      { error: 'Unable to reach the support service. Please try again in a moment.' },
      { status: 503 },
    );
  }
}
