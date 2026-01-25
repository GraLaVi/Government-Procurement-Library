import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth/config';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for access token cookie
  const accessToken = request.cookies.get(AUTH_CONFIG.COOKIE_NAMES.ACCESS_TOKEN)?.value;

  // Redirect authenticated users from home to dashboard
  if (pathname === '/' && accessToken) {
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

  if (!accessToken) {
    // Only redirect on initial page loads (direct navigation or page refresh)
    // For subsequent requests during active use, let the client-side handle 401s
    // Check if this is likely an initial load by checking for navigation headers
    const isNavigationRequest = 
      request.headers.get('sec-fetch-mode') === 'navigate' ||
      request.headers.get('sec-fetch-dest') === 'document' ||
      !request.headers.get('referer')?.startsWith(request.nextUrl.origin);

    if (isNavigationRequest) {
      // Redirect to login with return URL only on initial page loads
      const loginUrl = new URL(AUTH_CONFIG.ROUTES.LOGIN, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // For non-navigation requests (API calls, etc.), allow them to proceed
    // The client-side fetch interceptor will handle 401s
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
