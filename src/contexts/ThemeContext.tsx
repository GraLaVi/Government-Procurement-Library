"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePreferences } from '@/lib/hooks/usePreferences';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  isSystemTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preferences, updatePreferences, isLoading } = usePreferences();
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Resolve theme (system -> actual theme)
  const resolveTheme = (t: Theme): ResolvedTheme => {
    if (t === 'system') {
      return getSystemTheme();
    }
    return t;
  };

  // Apply theme to document
  const applyTheme = (t: Theme) => {
    const resolved = resolveTheme(t);
    const html = document.documentElement;
    
    if (resolved === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
    }
    
    setResolvedTheme(resolved);
  };

  // Load theme from preferences on mount
  useEffect(() => {
    setMounted(true);
    
    if (!isLoading) {
      if (preferences?.theme) {
        const savedTheme = preferences.theme as Theme;
        setThemeState(savedTheme);
        applyTheme(savedTheme);
        // Sync to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('theme', savedTheme);
        }
      } else {
        // Check localStorage first, then default to system
        if (typeof window !== 'undefined') {
          const localTheme = localStorage.getItem('theme') as Theme | null;
          if (localTheme) {
            setThemeState(localTheme);
            applyTheme(localTheme);
          } else {
            applyTheme('system');
          }
        } else {
          applyTheme('system');
        }
      }
    }
  }, [preferences, isLoading]);

  // Listen to system preference changes when theme is 'system'
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme('system');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme, mounted]);

  // Set theme and persist to preferences
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    
    // Store in localStorage for immediate access on next load
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }

    // Persist to preferences
    try {
      await updatePreferences({ theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Apply theme immediately on mount to prevent flash (before React hydration)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to get theme from localStorage first (for immediate apply)
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme) {
        applyTheme(savedTheme);
      } else {
        // Fallback to system preference
        applyTheme('system');
      }
    }
  }, []);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    isSystemTheme: theme === 'system',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

