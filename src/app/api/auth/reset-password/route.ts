import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { buildForwardHeadersFromContext } from '@/lib/api/forwardHeaders';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, new_password } = body;

    if (!token || !new_password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await buildForwardHeadersFromContext()) },
      body: JSON.stringify({ token, new_password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // FastAPI Pydantic validation errors come back as { detail: [...] };
      // surface the first message so the client can show it inline.
      let errorMessage: string = 'Failed to reset password';
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail) && data.detail.length > 0) {
        const first = data.detail[0];
        if (first && typeof first.msg === 'string') {
          errorMessage = first.msg.replace(/^Value error,\s*/i, '');
        }
      } else if (typeof data.message === 'string') {
        errorMessage = data.message;
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
