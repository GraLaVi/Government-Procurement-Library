"use client";

import { useEffect, useRef, useState } from "react";

// Native <input type="date"> renders in the browser's locale format, which we
// can't control. This field always shows/accepts mm/dd/yyyy while storing and
// emitting ISO (yyyy-mm-dd). A calendar button still opens the native picker.

function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[2]}/${m[3]}/${m[1]}` : "";
}

function displayToIso(s: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null; // rejects e.g. 02/30/2026
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface DateFieldProps {
  /** ISO value (yyyy-mm-dd) or "" */
  value: string;
  /** Called with an ISO value (yyyy-mm-dd) or "" when cleared. */
  onChange: (iso: string) => void;
  className?: string;
  ariaLabel?: string;
  min?: string; // ISO
}

export function DateField({ value, onChange, className = "", ariaLabel, min }: DateFieldProps) {
  const [text, setText] = useState(isoToDisplay(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  // Sync the visible text when the value changes externally (reset, picker).
  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  const commit = (s: string) => {
    if (s.trim() === "") {
      onChange("");
      return;
    }
    const iso = displayToIso(s);
    if (iso) {
      onChange(iso);
    } else {
      // Invalid entry — snap back to the last good value.
      setText(isoToDisplay(value));
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        placeholder="mm/dd/yyyy"
        className={`${className} pr-9`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
      />
      <button
        type="button"
        aria-label="Open date picker"
        className="absolute inset-y-0 right-2 flex items-center text-muted hover:text-foreground"
        onClick={() => pickerRef.current?.showPicker?.()}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      {/* Hidden native picker — kept in the layout (sr-only) so showPicker() works. */}
      <input
        ref={pickerRef}
        type="date"
        value={value || ""}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
