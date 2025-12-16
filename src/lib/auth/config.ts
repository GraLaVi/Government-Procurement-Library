export const AUTH_CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://alanapidev.lamlinks.com/api/v1',
  COOKIE_NAMES: {
    ACCESS_TOKEN: 'govt_proc_hub_access_token',
    REFRESH_TOKEN: 'govt_proc_hub_refresh_token',
  },
  TOKEN_EXPIRY: {
    ACCESS: 8 * 60 * 60, // 8 hours in seconds
    REFRESH: 7 * 24 * 60 * 60, // 7 days in seconds
  },
  ROUTES: {
    LOGIN: '/login',
    ACCOUNT: '/account',
    PUBLIC: ['/', '/login', '/trial', '/about', '/forgot-password', '/privacy', '/terms', '/security'],
  },
} as const;
