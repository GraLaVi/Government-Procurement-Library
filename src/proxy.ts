import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';
import { isPostCheckoutFinalize } from '@/lib/auth/postCheckout';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const hasRefreshToken = request.cookies.has(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN);

  // Check if route is public
  const isPublicRoute = AUTH_CONFIG.ROUTES.PUBLIC.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Self-serve checkout return — see isPostCheckoutFinalize. This is the first
  // of the three guards to run: bouncing here to /login drops the session_id
  // outright, so the subscription starts in Stripe but the visitor never gets
  // signed in and never sees the confirmation banner.
  const isCheckoutReturn = isPostCheckoutFinalize(
    pathname,
    request.nextUrl.searchParams,
  );

  // Allow public routes, static assets, and API routes
  if (
    isPublicRoute ||
    isCheckoutReturn ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // If either token is present, let the request through.
  // The client-side /api/auth/me call will use the refresh token
  // to obtain a new access token if needed.
  if (accessToken || hasRefreshToken) {
    return NextResponse.next();
  }

  // No tokens at all — redirect to login on navigation requests only
  const isNavigationRequest = 
    request.headers.get('sec-fetch-mode') === 'navigate' ||
    request.headers.get('sec-fetch-dest') === 'document' ||
    !request.headers.get('referer')?.startsWith(request.nextUrl.origin);

  if (isNavigationRequest) {
    const loginUrl = new URL(AUTH_CONFIG.ROUTES.LOGIN, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
