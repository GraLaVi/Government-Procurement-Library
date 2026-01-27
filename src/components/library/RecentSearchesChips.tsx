"use client";

import { RecentActionEntry, VendorSearchActionData, PartsSearchActionData } from '@/lib/preferences/types';
import { getSearchTypeConfig, VendorSearchType, getPartsSearchTypeConfig, PartsSearchType } from '@/lib/library/types';

interface RecentSearchesChipsProps {
  actions: RecentActionEntry[];
  onSelectSearch: ((action: RecentActionEntry) => void) | ((searchType: VendorSearchType | PartsSearchType, query: string) => void);
  onDelete?: (actionId: number) => void;
  isLoading?: boolean;
}

export function RecentSearchesChips({ actions, onSelectSearch, onDelete, isLoading }: RecentSearchesChipsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-1 py-2">
        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-muted">Loading recent searches...</span>
      </div>
    );
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted">Recent searches:</span>
        {actions.length > 7 && (
          <span className="text-xs text-muted">({actions.length})</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {actions.map((action) => {
          // Try to determine if this is a vendor or parts search
          const actionData = action.action_data as VendorSearchActionData | PartsSearchActionData;
          const queryType = actionData.query_type;
          const query = actionData.query;
          
          // Try vendor search config first
          let config;
          try {
            config = getSearchTypeConfig(queryType as VendorSearchType);
          } catch {
            // If that fails, try parts search config
            try {
              config = getPartsSearchTypeConfig(queryType as PartsSearchType);
            } catch {
              // Fallback if neither works
              config = { label: queryType, value: queryType };
            }
          }

          return (
            <div
              key={action.id}
              className="group relative inline-flex items-center gap-1.5 bg-muted-light dark:bg-muted-light hover:bg-muted dark:hover:bg-card-bg border border-border rounded-md px-2 py-1 text-xs transition-colors"
            >
              <button
                onClick={() => {
                  // Support both function signatures
                  if (onSelectSearch.length === 1) {
                    (onSelectSearch as (action: RecentActionEntry) => void)(action);
                  } else {
                    (onSelectSearch as (searchType: VendorSearchType | PartsSearchType, query: string) => void)(
                      queryType as VendorSearchType | PartsSearchType,
                      query
                    );
                  }
                }}
                className="flex items-center gap-1.5 min-w-0"
              >
                <span className="font-medium text-primary whitespace-nowrap flex-shrink-0">
                  {config.label}:
                </span>
                <span className="text-foreground truncate max-w-[120px]" title={query}>
                  {query}
                </span>
              </button>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(action.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-0.5 p-0.5 text-muted hover:text-error transition-opacity flex-shrink-0"
                  title="Delete"
                  aria-label="Delete search"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

