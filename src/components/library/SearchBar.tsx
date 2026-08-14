"use client";

import { forwardRef, type FormEvent } from "react";

/**
 * The search control shared by Parts Search and Vendor Search.
 *
 * A segmented type switcher over a capped input row. The old form let its
 * input grow with the window, so a wide monitor gave you a metre-long box to
 * type an eight-character NIIN into; both rows now stop at 38rem, which fits
 * the longest placeholder on either page.
 *
 * The switcher keeps every type visible and one click away — the reason it is
 * a segmented control rather than the dropdown a single-row bar would need.
 * Segments use each type's shortLabel where it has one, since four full
 * labels crowd the row on Parts Search.
 *
 * The segments are real radios, visually hidden inside their labels: that
 * keeps native grouping and arrow-key navigation, which a row of buttons
 * would have to reimplement.
 *
 * Presentational only: each page keeps its own type list, validation and
 * submit handling, and passes the results in.
 */

export interface SearchTypeOption {
  value: string;
  label: string;
  shortLabel?: string;
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
    <form onSubmit={onSubmit} className="max-w-[38rem] space-y-2.5">
      <div role="radiogroup" aria-label={typeLabel} className="inline-flex rounded-md border border-border overflow-hidden bg-muted-light">
        {types.map((t, i) => {
          const active = t.value === type;
          return (
            <label
              key={t.value}
              title={t.label}
              className={`px-2.5 py-1 text-xs transition-colors ${i > 0 ? "border-l border-border" : ""} ${
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              } ${active ? "bg-primary text-white font-semibold" : "text-muted hover:text-foreground"}`}
            >
              <input
                type="radio"
                name="searchType"
                value={t.value}
                checked={active}
                onChange={() => onTypeChange(t.value)}
                disabled={disabled}
                className="sr-only"
              />
              {t.shortLabel ?? t.label}
            </label>
          );
        })}
      </div>

      <div
        className={`flex items-stretch rounded-md border overflow-hidden bg-card-bg transition-colors ${
          error ? "border-error" : "border-border focus-within:border-primary"
        }`}
      >
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
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
          Search
        </button>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
    </form>
  );
});
