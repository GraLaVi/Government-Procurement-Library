"use client";

import { forwardRef, type FormEvent } from "react";

/**
 * The search control shared by Parts Search and Vendor Search.
 *
 * Type, term and submit are one bordered unit rather than a row of radios
 * above a full-width input: the old form spent two rows, and its input grew
 * with the window, so a wide monitor gave you a metre-long box to type an
 * eight-character NIIN into. This caps at 38rem, which fits the longest
 * placeholder on either page.
 *
 * Same shape as the bid-matching results search, deliberately — the two
 * search surfaces are one pattern, not two similar ones.
 *
 * Presentational only: each page keeps its own type list, validation and
 * submit handling, and passes the results in.
 */

export interface SearchTypeOption {
  value: string;
  label: string;
}

interface SearchBarProps {
  types: readonly SearchTypeOption[];
  type: string;
  onTypeChange: (value: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  placeholder?: string;
  maxLength?: number;
  /** Validation message; also turns the bar's single border red. */
  error?: string;
  isSearching: boolean;
  /** Accessible name for the type selector, e.g. "Search parts by". */
  typeLabel: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { types, type, onTypeChange, query, onQueryChange, onSubmit, placeholder,
    maxLength, error, isSearching, typeLabel },
  ref,
) {
  const disabled = isSearching;

  return (
    <form onSubmit={onSubmit} className="max-w-[38rem]">
      {/* ONE border, on the wrapper. The select and input are border-0, so
          there is no second edge at the seam or on focus, and the select needs
          appearance-none because a native one paints its own frame inside an
          author border. */}
      <div
        className={`flex items-stretch rounded-md border overflow-hidden bg-card-bg transition-colors ${
          error ? "border-error" : "border-border focus-within:border-primary"
        }`}
      >
        <div className="relative flex items-stretch shrink-0">
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
            disabled={disabled}
            aria-label={typeLabel}
            className="appearance-none border-0 bg-muted-light text-card-foreground text-sm pl-2.5 pr-7 py-2 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {types.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* The seam: a 1px element, not two adjacent borders. */}
        <span className="w-px bg-border shrink-0" aria-hidden="true" />

        <input
          ref={ref}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className="flex-1 min-w-0 border-0 bg-card-bg text-card-foreground text-sm px-3 py-2 placeholder-muted focus:outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={disabled || query.trim().length === 0}
          aria-label="Search"
          className="shrink-0 flex items-center px-3.5 bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </form>
  );
});
