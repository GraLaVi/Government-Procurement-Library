import { useState, useEffect, useCallback } from 'react';
import { UserPreferences, UserPreferencesResponse } from '@/lib/preferences/types';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/auth/me/preferences', {
        credentials: 'include',
      });

      // Handle 401 gracefully - user is not authenticated, just clear preferences
      if (response.status === 401) {
        setPreferences(null);
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch preferences');
      }

      const data: UserPreferencesResponse = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Failed to fetch preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    try {
      setError(null);
      const response = await fetchWithAuth('/api/auth/me/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ preferences: newPreferences }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update preferences');
      }

      const data: UserPreferencesResponse = await response.json();
      setPreferences(data.preferences);
      return data.preferences;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Failed to update preferences:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    refetch: fetchPreferences,
  };
}


