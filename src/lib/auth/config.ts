/**
 * Backend HTTPException detail emitted when the user's COMPANY account
 * (customers.customer_status) is inactive/suspended. Mirrors
 * ACCOUNT_INACTIVE_CODE in the FastAPI auth service — the proxies match on
 * it to clear the session instead of surfacing a generic 403.
 */
export const ACCOUNT_INACTIVE_CODE = 'account_inactive';

/** User-facing message shown when a session ends because the company
 * account was deactivated. */
export const ACCOUNT_INACTIVE_MESSAGE =
  'This company account has been deactivated. Please contact support.';

export const AUTH_CONFIG = {
  API_BASE_URL: process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://10.116.0.2:8000/api/v1',
  COOKIE_NAMES: {
    ACCESS_TOKEN: 'govt_proc_hub_access_token_v2',
    REFRESH_TOKEN: 'govt_proc_hub_refresh_token_v2',
  },
  // Legacy cookie names + scopes that may still be sitting in browsers from
  // earlier deploys. We proactively delete these on login/logout so a stale
  // duplicate on a different name or Domain scope can't shadow the canonical
  // cookie (the "can't sign in until you delete the cookie" bug). Host-only
  // deletion is covered by passing no domain; '.gphusa.com' covers any
  // cross-subdomain cookie a previous build may have written.
  LEGACY_COOKIE_NAMES: [
    'govt_proc_hub_access_token',
    'govt_proc_hub_refresh_token',
  ],
  LEGACY_COOKIE_DOMAINS: ['.gphusa.com'],
  // Fallbacks only — the live values arrive with each token as `expires_in` /
  // `refresh_expires_in`, mirroring CUSTOMER_ACCESS_TOKEN_EXPIRE_HOURS and
  // CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS on the API.
  TOKEN_EXPIRY: {
    ACCESS: 60 * 60, // 1 hour in seconds
    REFRESH: 30 * 24 * 60 * 60, // 30 days in seconds
  },
  ROUTES: {
    LOGIN: '/login',
    ACCOUNT: '/account',
    CHANGE_PASSWORD: '/account/change-password',
    PUBLIC: ['/', '/login', '/signup', '/pricing', '/about', '/contact', '/legal', '/support', '/help', '/forgot-password', '/reset-password', '/verify-email', '/rfq/respond'],
  },
} as const;
