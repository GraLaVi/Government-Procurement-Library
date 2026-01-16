"use client";

import { useState, useRef, useEffect } from 'react';
import { RecentActionEntry, VendorSearchActionData } from '@/lib/preferences/types';
import { getSearchTypeConfig, VendorSearchType } from '@/lib/library/types';

interface RecentSearchesSidebarProps {
  actions: RecentActionEntry[];
  onSelectSearch: (searchType: VendorSearchType, query: string) => void;
  onDelete?: (actionId: number) => void;
  isLoading?: boolean;
}

export function RecentSearchesSidebar({ actions, onSelectSearch, onDelete, isLoading }: RecentSearchesSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Check if click is not on the toggle button
        const toggleButton = document.getElementById('recent-searches-toggle');
        if (toggleButton && !toggleButton.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Don't render anything if there are no actions and not loading
  if (!isLoading && actions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Toggle Button - Always visible, positioned relative to viewport */}
      <button
        id="recent-searches-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 top-20 z-40 bg-primary text-white rounded-full p-2.5 shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center group"
        aria-label="Recent searches"
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {!isLoading && actions.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {actions.length > 9 ? '9+' : actions.length}
          </span>
        )}
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <div
        ref={sidebarRef}
        className={`fixed right-0 top-0 h-full w-64 bg-white dark:bg-card-bg shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Recent Searches</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-muted hover:text-foreground transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-1.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : actions.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted">
                No recent searches
              </div>
            ) : (
              <div className="space-y-0.5">
                {actions.map((action) => {
                  const actionData = action.action_data as VendorSearchActionData;
                  const queryType = actionData.query_type as VendorSearchType;
                  const query = actionData.query;
                  const config = getSearchTypeConfig(queryType);

                  return (
                    <div
                      key={action.id}
                      className="group flex items-center justify-between gap-1.5 p-1.5 rounded hover:bg-muted-light dark:hover:bg-muted-light/80 transition-colors"
                    >
                      <button
                        onClick={() => {
                          onSelectSearch(queryType, query);
                          setIsOpen(false);
                        }}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-primary whitespace-nowrap flex-shrink-0">
                            {config.label}:
                          </span>
                          <span className="text-xs text-foreground truncate">{query}</span>
                        </div>
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(action.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-muted hover:text-error transition-opacity flex-shrink-0"
                          title="Delete"
                          aria-label="Delete search"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

