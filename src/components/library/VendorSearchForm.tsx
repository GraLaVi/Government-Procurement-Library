"use client";

import { useState, FormEvent, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { SearchBar } from "@/components/library/SearchBar";
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

  // Sync local form state when the parent changes the defaults (selecting a
  // recent search, restoring the last search, URL params). Adjusted during
  // render per React's "you might not need an effect" guidance — this avoids
  // the extra cascading render that setting state in an effect would cause.
  const [prevInitialType, setPrevInitialType] = useState(initialSearchType);
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialSearchQuery);
  if (initialSearchType !== prevInitialType || initialSearchQuery !== prevInitialQuery) {
    setPrevInitialType(initialSearchType);
    setPrevInitialQuery(initialSearchQuery);
    if (initialSearchType) {
      setSearchType(initialSearchType);
    }
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }

  // Expose focusInput method to parent
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus();
      // Select any prefilled value so the user can immediately type over
      // the defaulted last search.
      inputRef.current?.select();
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
    inputRef.current?.focus();
  };

  const handleQueryChange = (value: string) => {
    // CAGE codes are uppercase alphanumeric — uppercase as the user types so
    // they don't have to hold shift / can paste lowercase.
    const nextValue = searchType === "cage" ? value.toUpperCase() : value;
    setSearchQuery(nextValue);
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
    <SearchBar
      ref={inputRef}
      types={SEARCH_TYPE_CONFIGS}
      type={searchType}
      onTypeChange={(v) => handleSearchTypeChange(v as VendorSearchType)}
      query={searchQuery}
      onQueryChange={handleQueryChange}
      onSubmit={handleSubmit}
      placeholder={currentConfig.placeholder}
      maxLength={currentConfig.maxLength}
      error={validationError}
      isSearching={isSearching}
      typeLabel="Search vendors by"
    />
  );
});
