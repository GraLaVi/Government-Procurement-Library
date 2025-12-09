"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');

      if (response.ok) {
        const user: User = await response.json();

        // Fetch user products
        let products: Product[] | null = null;
        try {
          const productsResponse = await fetch('/api/auth/me/products');
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
      } else {
        setState({
          user: null,
          products: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      setState({
        user: null,
        products: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  // Fetch current user on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

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
