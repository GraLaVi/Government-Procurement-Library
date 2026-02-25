import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const hasRefreshToken = request.cookies.has(AUTH_CONFIG.COOKIE_NAMES.REFRESH_TOKEN);

  // Redirect authenticated users from home to dashboard
  if (pathname === '/' && (accessToken || hasRefreshToken)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check if route is public
  const isPublicRoute = AUTH_CONFIG.ROUTES.PUBLIC.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Allow public routes, static assets, and API routes
  if (
    isPublicRoute ||
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
