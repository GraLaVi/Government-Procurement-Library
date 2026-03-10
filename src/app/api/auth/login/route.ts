import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { LoginRequest, LoginResponse } from '@/lib/auth/types';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          retryAfter,
        },
        { status: 429 }
      );
    }

    // Handle invalid credentials
    if (response.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Handle account locked or inactive
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Login 403 response:', { detail: errorData.detail, status: response.status, url: response.url });
      return NextResponse.json(
        {
          success: false,
          error: errorData.detail || 'Account access denied. Please contact support.',
        },
        { status: 403 }
      );
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData.detail || 'Login failed. Please try again.',
        },
        { status: response.status }
      );
    }

    const data: LoginResponse = await response.json();

    // Set httpOnly cookies
    const cookieStore = await cookies();

    cookieStore.set(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in,
      path: '/',
    });

    cookieStore.set(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN, data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_CONFIG.TOKEN_EXPIRY.REFRESH,
      path: '/',
    });

    // Return success without exposing tokens
    return NextResponse.json({
      success: true,
      mustChangePassword: data.must_change_password,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to connect to server. Please try again.',
      },
      { status: 500 }
    );
  }
}
