"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, Product, AuthState, LoginResult } from '@/lib/auth/types';
import { AUTH_CONFIG } from '@/lib/auth/config';

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasProductAccess: (productKey: string) => boolean;
  hasAnyProductAccess: (productKeys: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    products: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        // Add cache control to prevent stale responses
        cache: 'no-store',
      });

      if (response.ok) {
        const user: User = await response.json();

        // Fetch user products
        let products: Product[] | null = null;
        try {
          const productsResponse = await fetch('/api/auth/me/products', {
            cache: 'no-store',
          });
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            products = productsData.products || [];
          }
        } catch {
          // Products fetch failed, continue without them
          console.error('Failed to fetch user products');
        }

        setState({
          user,
          products,
          isAuthenticated: true,
          isLoading: false,
        });
        setHasInitialized(true);
      } else {
        // Authentication failed (401 or other error) - immediately clear state
        setState({
          user: null,
          products: null,
          isAuthenticated: false,
          isLoading: false,
        });
        setHasInitialized(true);
      }
    } catch {
      // Network error - clear state
      setState({
        user: null,
        products: null,
        isAuthenticated: false,
        isLoading: false,
      });
      setHasInitialized(true);
    }
  }, []);

  // Fetch current user on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Only redirect to login on initial page load when user is not authenticated
  // Session expiration during active use will be handled by the modal
  useEffect(() => {
    // Only redirect if:
    // 1. Auth has been initialized (we've checked the user)
    // 2. User is not authenticated
    // 3. Not currently loading
    // 4. Not on a public route
    // 5. Not already on the login page
    // 6. This is the initial load (hasInitialized was just set to true)
    if (hasInitialized && !state.isAuthenticated && !state.isLoading) {
      const isPublicRoute = AUTH_CONFIG.ROUTES.PUBLIC.some(
        (route) => pathname === route || pathname?.startsWith(`${route}/`)
      );

      if (!isPublicRoute && pathname !== AUTH_CONFIG.ROUTES.LOGIN) {
        // Only redirect on initial page load, not on subsequent auth failures
        // This prevents redirect loops when session expires during active use
        const loginUrl = `${AUTH_CONFIG.ROUTES.LOGIN}?redirect=${encodeURIComponent(pathname || '/')}`;
        router.push(loginUrl);
      }
    }
  }, [hasInitialized, state.isAuthenticated, state.isLoading, pathname, router]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Login failed',
          retryAfter: data.retryAfter,
        };
      }

      // Fetch user after successful login
      await refreshUser();

      return {
        success: true,
        mustChangePassword: data.mustChangePassword,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue with local logout even if API call fails
    }

    setState({
      user: null,
      products: null,
      isAuthenticated: false,
      isLoading: false,
    });

    router.push(AUTH_CONFIG.ROUTES.LOGIN);
  };

  // Check if user has access to a specific product by key
  const hasProductAccess = useCallback((productKey: string): boolean => {
    if (!state.products) return false;
    return state.products.some(p => p.product_key === productKey && p.is_active);
  }, [state.products]);

  // Check if user has access to any of the specified products
  const hasAnyProductAccess = useCallback((productKeys: string[]): boolean => {
    if (!state.products) return false;
    return productKeys.some(key =>
      state.products!.some(p => p.product_key === key && p.is_active)
    );
  }, [state.products]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser, hasProductAccess, hasAnyProductAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
