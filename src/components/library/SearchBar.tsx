"use client";

import { forwardRef, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

/**
 * The search control shared by Parts Search and Vendor Search.
 *
 * One row: the active search type sits inside the field as a chip, and clicking
 * the chip opens a menu to change it. The old form let its input grow with the
 * window, so a wide monitor gave you a metre-long box to type an eight-character
 * NIIN into; the bar now stops at 38rem, which fits the longest placeholder on
 * either page.
 *
 * Folding the type into the field is what buys the second row back, and costs
 * seeing every type at once — the trade is worth it because most searches use
 * the page's default type. The chip carries a border, a chevron and a hover
 * state precisely because it has to advertise that it is interactive; a bare
 * pill would not.
 *
 * The menu is a listbox, portaled to <body> and fixed-positioned so the search
 * panel's overflow-hidden can't clip it, matching BidMatchDateMenu.
 *
 * Presentational only: each page keeps its own type list, validation and
 * submit handling, and passes the results in.
 */

export interface SearchTypeOption {
  value: string;
  label: string;
  shortLabel?: string;
  description?: string;
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

const MENU_WIDTH = 256;

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { types, type, onTypeChange, query, onQueryChange, onSubmit, placeholder,
    maxLength, error, isSearching, typeLabel },
  ref,
) {
  const disabled = isSearching;
  const [menuOpen, setMenuOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = Math.max(0, types.findIndex((t) => t.value === type));
  const activeType = types[activeIndex];

  // Close on outside click, Escape, or the page scrolling out from under the
  // fixed-positioned menu, matching BidMatchDateMenu. Escape returns focus to
  // the chip so keyboard users aren't dropped back at the top of the page.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        chipRef.current && !chipRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        chipRef.current?.focus();
      }
    };
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    const onResize = () => setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  const openMenu = () => {
    const rect = chipRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)),
      });
    }
    setMenuOpen(true);
  };

  // Focus the current type when the menu opens, so arrow keys start from the
  // selection rather than the top of the list.
  useEffect(() => {
    if (menuOpen) optionRefs.current[activeIndex]?.focus();
  }, [menuOpen, activeIndex]);

  const chooseType = (value: string) => {
    setMenuOpen(false);
    // The forms move focus into the input on a type change, so the chip does
    // not take focus back here.
    onTypeChange(value);
  };

  const onOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
    const move = (next: number) => {
      e.preventDefault();
      optionRefs.current[(next + types.length) % types.length]?.focus();
    };
    if (e.key === "ArrowDown") move(index + 1);
    else if (e.key === "ArrowUp") move(index - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(types.length - 1);
    else if (e.key === "Tab") setMenuOpen(false);
  };

  return (
    <form onSubmit={onSubmit} className="max-w-[38rem] space-y-2">
      <div
        className={`flex items-center gap-1.5 rounded-md border bg-card-bg p-1 transition-colors ${
          error ? "border-error" : "border-border focus-within:border-primary"
        }`}
      >
        <div className="shrink-0">
          <button
            ref={chipRef}
            type="button"
            onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && !menuOpen) {
                e.preventDefault();
                openMenu();
              }
            }}
            disabled={disabled}
            aria-label={typeLabel}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              disabled
                ? "border-border text-muted opacity-50 cursor-not-allowed"
                : menuOpen
                  ? "border-primary bg-primary/5 text-primary cursor-pointer"
                  : "border-border bg-muted-light text-foreground hover:border-primary cursor-pointer"
            }`}
          >
            {activeType?.shortLabel ?? activeType?.label}
            <svg
              className={`h-3 w-3 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {menuOpen && coords && createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-label={typeLabel}
              style={{ position: "fixed", top: coords.top, left: coords.left, width: MENU_WIDTH, zIndex: 60 }}
              className="overflow-hidden rounded-lg border border-border bg-card-bg shadow-lg"
            >
              {types.map((t, i) => {
                const active = t.value === type;
                return (
                  <button
                    key={t.value}
                    ref={(el) => { optionRefs.current[i] = el; }}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => chooseType(t.value)}
                    onKeyDown={(e) => onOptionKeyDown(e, i)}
                    className={`block w-full cursor-pointer px-3 py-2 text-left transition-colors ${
                      active ? "bg-primary text-white" : "text-foreground hover:bg-muted-light"
                    }`}
                  >
                    <span className="block text-sm font-medium">{t.label}</span>
                    {t.description && (
                      <span className={`mt-0.5 block text-xs ${active ? "text-white/80" : "text-muted"}`}>
                        {t.description}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>,
            document.body
          )}
        </div>

        <input
          ref={ref}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-sm text-card-foreground placeholder-muted focus:outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={disabled || query.trim().length === 0}
          aria-label="Search"
          className="inline-flex shrink-0 cursor-pointer items-center rounded bg-primary px-3 py-1.5 text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
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

      {error && <p className="text-sm text-error">{error}</p>}
    </form>
  );
});
