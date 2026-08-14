"use client";

import { useState, FormEvent, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { SearchBar } from "@/components/library/SearchBar";
import {
  PartsSearchType,
  PARTS_SEARCH_TYPE_CONFIGS,
  getPartsSearchTypeConfig,
  validatePartsSearchInput,
} from "@/lib/library/types";

interface PartsSearchFormProps {
  onSearch: (type: PartsSearchType, query: string) => void;
  isSearching: boolean;
  autoFocus?: boolean;
  initialSearchType?: PartsSearchType | null;
  initialSearchQuery?: string;
}

export interface PartsSearchFormRef {
  focusInput: () => void;
}

export const PartsSearchForm = forwardRef<PartsSearchFormRef, PartsSearchFormProps>(
  function PartsSearchForm({ onSearch, isSearching, autoFocus = false, initialSearchType, initialSearchQuery }, ref) {
  const [searchType, setSearchType] = useState<PartsSearchType>(initialSearchType || "nsn_niin");
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [validationError, setValidationError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local form state when the parent changes the defaults (selecting a
  // recent search, restoring the last search, URL params). Adjusted during
  // render per React's "you might not need an effect" guidance — this avoids
  // the extra cascading render that setting state in an effect would cause.
  // Legacy 'nsn'/'niin' types are normalized to 'nsn_niin'.
  const [prevInitialType, setPrevInitialType] = useState(initialSearchType);
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialSearchQuery);
  if (initialSearchType !== prevInitialType || initialSearchQuery !== prevInitialQuery) {
    setPrevInitialType(initialSearchType);
    setPrevInitialQuery(initialSearchQuery);
    if (initialSearchType) {
      const type = (initialSearchType as string) === 'nsn' || (initialSearchType as string) === 'niin' ? 'nsn_niin' : initialSearchType;
      setSearchType(type);
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

  const currentConfig = getPartsSearchTypeConfig(searchType);

  const handleSearchTypeChange = (value: PartsSearchType) => {
    setSearchType(value);
    setValidationError(undefined);
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const handleQueryChange = (value: string) => {
    setSearchQuery(value.trim());
    if (validationError) {
      setValidationError(undefined);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const validation = validatePartsSearchInput(searchType, searchQuery);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    onSearch(searchType, searchQuery.trim());
  };

  return (
    <SearchBar
      ref={inputRef}
      types={PARTS_SEARCH_TYPE_CONFIGS}
      type={searchType}
      onTypeChange={(v) => handleSearchTypeChange(v as PartsSearchType)}
      query={searchQuery}
      onQueryChange={handleQueryChange}
      onSubmit={handleSubmit}
      placeholder={currentConfig.placeholder}
      maxLength={currentConfig.maxLength}
      error={validationError}
      isSearching={isSearching}
      typeLabel="Search parts by"
    />
  );
});
