"use client";

import { RecentActionEntry, VendorSearchActionData } from '@/lib/preferences/types';
import { getSearchTypeConfig, VendorSearchType } from '@/lib/library/types';

interface RecentSearchesProps {
  actions: RecentActionEntry[];
  onSelectSearch: (searchType: VendorSearchType, query: string) => void;
  onDelete?: (actionId: number) => void;
  isLoading?: boolean;
}

export function RecentSearches({ actions, onSelectSearch, onDelete, isLoading }: RecentSearchesProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-border p-4">
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading recent searches...</span>
        </div>
      </div>
    );
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Recent Searches</h3>
        <span className="text-xs text-muted">{actions.length} recent</span>
      </div>
      <div className="space-y-2">
        {actions.map((action) => {
          const actionData = action.action_data as VendorSearchActionData;
          const queryType = actionData.query_type as VendorSearchType;
          const query = actionData.query;
          const config = getSearchTypeConfig(queryType);

          return (
            <div
              key={action.id}
              className="flex items-center justify-between gap-3 p-2 rounded border border-border hover:bg-muted-light transition-colors group"
            >
              <button
                onClick={() => onSelectSearch(queryType, query)}
                className="flex-1 text-left min-w-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary whitespace-nowrap">
                    {config.label}:
                  </span>
                  <span className="text-sm text-foreground truncate">{query}</span>
                </div>
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(action.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-error transition-opacity"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


