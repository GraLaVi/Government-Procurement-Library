"use client";

import { useState, FormEvent, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  VendorSearchType,
  SEARCH_TYPE_CONFIGS,
  getSearchTypeConfig,
  validateSearchInput,
} from "@/lib/library/types";

interface VendorSearchFormProps {
  onSearch: (type: VendorSearchType, query: string) => void;
  isSearching: boolean;
  autoFocus?: boolean;
  initialSearchType?: VendorSearchType | null;
  initialSearchQuery?: string;
}

export interface VendorSearchFormRef {
  focusInput: () => void;
}

export const VendorSearchForm = forwardRef<VendorSearchFormRef, VendorSearchFormProps>(
  function VendorSearchForm({ onSearch, isSearching, autoFocus = false, initialSearchType, initialSearchQuery }, ref) {
  const [searchType, setSearchType] = useState<VendorSearchType>(initialSearchType || "cage");
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [validationError, setValidationError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Update form when initial values change
  useEffect(() => {
    if (initialSearchType) {
      setSearchType(initialSearchType);
    }
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchType, initialSearchQuery]);

  // Expose focusInput method to parent
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus();
    },
  }));

  // Auto-focus on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const currentConfig = getSearchTypeConfig(searchType);

  const handleSearchTypeChange = (value: VendorSearchType) => {
    setSearchType(value);
    setSearchQuery("");
    setValidationError(undefined);
  };

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    if (validationError) {
      setValidationError(undefined);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const validation = validateSearchInput(searchType, searchQuery);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    onSearch(searchType, searchQuery.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Compact inline radio buttons */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-sm font-medium text-muted">Search by:</span>
        {SEARCH_TYPE_CONFIGS.map((config) => (
          <label
            key={config.value}
            className={`
              inline-flex items-center gap-1.5 cursor-pointer text-sm
              ${isSearching ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <input
              type="radio"
              name="searchType"
              value={config.value}
              checked={searchType === config.value}
              onChange={() => handleSearchTypeChange(config.value)}
              disabled={isSearching}
              className="w-3.5 h-3.5 text-primary border-border focus:ring-primary focus:ring-offset-0"
            />
            <span className={searchType === config.value ? "text-primary font-medium" : "text-foreground"}>
              {config.label}
            </span>
          </label>
        ))}
      </div>

      {/* Search input and button */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            ref={inputRef}
            type="text"
            placeholder={currentConfig.placeholder}
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            error={validationError}
            disabled={isSearching}
            maxLength={currentConfig.maxLength}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSearching || searchQuery.trim().length === 0}
          className="px-4"
        >
          {isSearching ? (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </Button>
      </div>
    </form>
  );
});
