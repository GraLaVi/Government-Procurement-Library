/**
 * Authenticated fetch wrapper that intercepts 401 responses
 * and automatically refreshes tokens in the background.
 * Only redirects to login if refresh token is expired.
 */

import { AUTH_CONFIG } from '@/lib/auth/config';

let sessionExpiredContext: {
  showModal: () => void;
  addPendingRequest: (request: {
    url: string;
    options: RequestInit;
    resolve: (value: Response) => void;
    reject: (reason?: any) => void;
  }) => void;
} | null = null;

// Track ongoing refresh attempt to prevent concurrent refreshes
let refreshPromise: Promise<boolean> | null = null;

// Track if we've already redirected to prevent multiple redirects
let hasRedirected = false;

/**
 * Initialize the fetch wrapper with the session expired context.
 * This should be called from the SessionExpiredProvider.
 */
export function initFetchWithAuth(context: {
  showModal: () => void;
  addPendingRequest: (request: {
    url: string;
    options: RequestInit;
    resolve: (value: Response) => void;
    reject: (reason?: any) => void;
  }) => void;
}) {
  sessionExpiredContext = context;
}

/**
 * Attempts to refresh the access token using the refresh token.
 * Returns true if refresh succeeded, false if it failed.
 * Prevents concurrent refresh attempts by reusing the same promise.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  // Start a new refresh attempt
  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        // Refresh succeeded
        return true;
      } else {
        // Refresh failed - refresh token expired
        return false;
      }
    } catch (error) {
      // Network error or other failure
      console.error('Token refresh error:', error);
      return false;
    } finally {
      // Clear the promise so future requests can attempt refresh again
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Redirects to the login page.
 * Only redirects once, even if called multiple times.
 */
function redirectToLogin(): void {
  if (hasRedirected) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  // Don't redirect if we're already on the login page to prevent loops
  const currentPath = window.location.pathname;
  if (currentPath === AUTH_CONFIG.ROUTES.LOGIN) {
    return;
  }

  hasRedirected = true;
  
  // Don't use auth-related routes as redirect targets
  const authRoutes = [AUTH_CONFIG.ROUTES.LOGIN, '/forgot-password', '/trial'];
  const redirectPath = authRoutes.includes(currentPath) ? AUTH_CONFIG.ROUTES.ACCOUNT : currentPath;
  const loginUrl = `${AUTH_CONFIG.ROUTES.LOGIN}?redirect=${encodeURIComponent(redirectPath)}`;
  
  // Use window.location for a full page redirect
  window.location.href = loginUrl;
}

/**
 * Wraps the native fetch function to intercept 401 responses.
 * When a 401 is detected, it attempts to refresh the token automatically.
 * If refresh succeeds, retries the original request.
 * If refresh fails, redirects to login screen.
 */
export async function fetchWithAuth(
  url: string | URL | Request,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<Response> {
  // Normalize the URL to a string for checking and storing
  let urlString: string;
  if (typeof url === 'string') {
    urlString = url;
  } else if (url instanceof URL) {
    urlString = url.toString();
  } else if (url instanceof Request) {
    urlString = url.url;
  } else {
    urlString = String(url);
  }

  // Check if this is an API route (starts with /api)
  // Only handle 401s from our Next.js API routes, not external URLs
  const isApiRoute = urlString.startsWith('/api') || 
    (typeof window !== 'undefined' && urlString.startsWith(window.location.origin + '/api'));

  // Make the initial request
  const response = await fetch(url, options);

  // If not a 401, return the response as-is
  if (response.status !== 401) {
    return response;
  }

  // Only handle 401s from API routes (not from the backend API directly)
  // Backend API 401s should be handled by the API route handlers
  if (!isApiRoute) {
    return response;
  }

  // Don't attempt refresh for the refresh endpoint itself (avoid infinite loop)
  if (urlString.includes('/api/auth/refresh')) {
    // Refresh endpoint returned 401 - refresh token expired
    redirectToLogin();
    return response;
  }

  // If this is already a retry after refresh and we still get 401, something is wrong
  // Don't try to refresh again - just redirect to login
  if (isRetry) {
    console.error('Request failed after token refresh - redirecting to login');
    redirectToLogin();
    return response;
  }

  // Attempt to refresh the token automatically
  const refreshSucceeded = await attemptTokenRefresh();

  if (refreshSucceeded) {
    // Refresh succeeded - retry the original request
    // The new access token will be in cookies, so the retry should work
    // Mark as retry to prevent infinite loops
    return fetchWithAuth(url, options, true);
  } else {
    // Refresh failed - refresh token expired, redirect to login
    redirectToLogin();
    return response;
  }
}

/**
 * Check if fetchWithAuth has been initialized
 */
export function isFetchWithAuthInitialized(): boolean {
  return sessionExpiredContext !== null;
}
