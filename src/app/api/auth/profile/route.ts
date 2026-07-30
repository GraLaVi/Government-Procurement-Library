import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth/config';

/**
 * FastAPI's `detail` is a string for HTTPException but an array of
 * `{loc, msg, ...}` objects for 422 validation errors (e.g. a cleared name
 * field). The profile page renders the error straight into JSX, so anything
 * other than a string has to be flattened here.
 */
function toErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((d) => (typeof d === 'string' ? d : d?.msg))
      .filter((m): m is string => typeof m === 'string' && m.length > 0);
    if (messages.length) return messages.join('. ');
  }
  return fallback;
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { first_name, last_name } = body;

    // Get access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN)?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Call the backend API to update profile
    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        first_name,
        last_name,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            data.detail ?? data.message,
            'Failed to update profile',
          ),
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
