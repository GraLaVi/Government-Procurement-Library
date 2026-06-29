export const AUTH_CONFIG = {
  API_BASE_URL: process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://75.119.134.30:8000/api/v1',
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
  TOKEN_EXPIRY: {
    ACCESS: 8 * 60 * 60, // 8 hours in seconds
    REFRESH: 7 * 24 * 60 * 60, // 7 days in seconds
  },
  ROUTES: {
    LOGIN: '/login',
    ACCOUNT: '/account',
    CHANGE_PASSWORD: '/account/change-password',
    PUBLIC: ['/', '/login', '/signup', '/pricing', '/about', '/contact', '/legal', '/support', '/documentation', '/forgot-password', '/reset-password', '/verify-email', '/rfq/respond'],
  },
} as const;
