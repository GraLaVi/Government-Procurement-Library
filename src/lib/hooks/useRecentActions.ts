import { useState, useEffect, useCallback } from 'react';
import { RecentActionsResponse, RecentActionEntry, CreateRecentActionRequest } from '@/lib/preferences/types';

export function useRecentActions(actionType: string) {
  const [actions, setActions] = useState<RecentActionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    if (!actionType) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/auth/me/recent-actions?action_type=${encodeURIComponent(actionType)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch recent actions');
      }

      const data: RecentActionsResponse = await response.json();
      setActions(data.actions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Failed to fetch recent actions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [actionType]);

  const addAction = useCallback(async (actionData: CreateRecentActionRequest['action_data']) => {
    try {
      setError(null);
      const request: CreateRecentActionRequest = {
        action_type: actionType,
        action_data: actionData,
      };

      const response = await fetch('/api/auth/me/recent-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add recent action');
      }

      const newAction: RecentActionEntry = await response.json();
      
      // Refresh the list
      await fetchActions();
      
      return newAction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Failed to add recent action:', err);
      throw err;
    }
  }, [actionType, fetchActions]);

  const deleteAction = useCallback(async (actionId: number) => {
    try {
      setError(null);
      const response = await fetch(`/api/auth/me/recent-actions/${actionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete recent action');
      }

      // Refresh the list
      await fetchActions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Failed to delete recent action:', err);
      throw err;
    }
  }, [fetchActions]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return {
    actions,
    isLoading,
    error,
    addAction,
    deleteAction,
    refetch: fetchActions,
  };
}

export function useLastAction(actionType: string) {
  const { actions, isLoading } = useRecentActions(actionType);
  
  return {
    lastAction: actions.length > 0 ? actions[0] : null,
    isLoading,
  };
}


