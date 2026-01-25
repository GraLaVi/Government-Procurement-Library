"use client";

import { useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

/**
 * React hook that provides an authenticated fetch function.
 * Automatically handles 401 responses by refreshing tokens in the background.
 * Only redirects to login if refresh token is expired.
 * 
 * @example
 * ```tsx
 * const fetch = useAuthenticatedFetch();
 * 
 * const response = await fetch('/api/users');
 * const data = await response.json();
 * ```
 */
export function useAuthenticatedFetch() {
  const authenticatedFetch = useCallback(
    async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
      return fetchWithAuth(url, options);
    },
    []
  );

  return authenticatedFetch;
}
