"use client";

import { useState, KeyboardEvent, ClipboardEvent } from "react";

interface ChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  // Run before adding a chip. Return the canonical string, or null to
  // reject (caller can surface the error from validate).
  normalize?: (raw: string) => string | null;
  // Per-chip validation. Return null when valid, or an error message.
  validate?: (chip: string) => string | null;
  maxChips?: number;
  disabled?: boolean;
}

// Multi-value input used for `in`-list condition values. Splits on
// Enter / comma / blur; paste splits on commas, newlines, and whitespace
// so users can drop in a comma-separated list copied from anywhere.
// Caller serializes with `value.join(',')` for API submission.
export function ChipInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  normalize,
  validate,
  maxChips,
  disabled,
}: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const atCap = maxChips !== undefined && value.length >= maxChips;

  const addChips = (raws: string[]) => {
    const next = [...value];
    let lastError: string | null = null;
    for (const raw of raws) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (maxChips !== undefined && next.length >= maxChips) {
        lastError = `Maximum ${maxChips} items.`;
        break;
      }
      const candidate = normalize ? normalize(trimmed) : trimmed;
      if (candidate === null) {
        lastError = `"${trimmed}" is not valid.`;
        continue;
      }
      const ve = validate ? validate(candidate) : null;
      if (ve) {
        lastError = ve;
        continue;
      }
      if (next.includes(candidate)) continue;
      next.push(candidate);
    }
    onChange(next);
    setError(lastError);
    setDraft("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) addChips([draft]);
      return;
    }
    if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (/[\s,]/.test(pasted)) {
      e.preventDefault();
      addChips(pasted.split(/[\s,\n]+/));
    }
  };

  const handleBlur = () => {
    if (draft.trim()) addChips([draft]);
  };

  const remove = (idx: number) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
    setError(null);
  };

  return (
    <div className="flex-1">
      <div
        className={`flex flex-wrap items-center gap-1.5 border border-border bg-card-bg rounded-lg px-2 py-1.5 min-h-[38px] focus-within:ring-2 focus-within:ring-primary ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {value.map((chip, idx) => (
          <span
            key={`${chip}-${idx}`}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium rounded-md px-2 py-0.5"
          >
            {chip}
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-primary/70 hover:text-primary"
                aria-label={`Remove ${chip}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled || atCap}
          className="flex-1 min-w-[100px] text-sm bg-transparent text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
