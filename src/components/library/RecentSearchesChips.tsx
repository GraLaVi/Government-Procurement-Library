"use client";

import { RecentActionEntry, VendorSearchActionData } from '@/lib/preferences/types';
import { getSearchTypeConfig, VendorSearchType } from '@/lib/library/types';

interface RecentSearchesChipsProps {
  actions: RecentActionEntry[];
  onSelectSearch: (searchType: VendorSearchType, query: string) => void;
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
          const actionData = action.action_data as VendorSearchActionData;
          const queryType = actionData.query_type as VendorSearchType;
          const query = actionData.query;
          const config = getSearchTypeConfig(queryType);

          return (
            <div
              key={action.id}
              className="group relative inline-flex items-center gap-1.5 bg-muted-light hover:bg-muted border border-border rounded-md px-2 py-1 text-xs transition-colors"
            >
              <button
                onClick={() => onSelectSearch(queryType, query)}
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

