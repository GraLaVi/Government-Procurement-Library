"use client";

import { useEffect, type ReactNode } from "react";

// The standard "what changed on this solicitation" popover.
//
// A solicitation's history reaches us two different ways — DIBBS revises the
// solicitation in place and we record a row per amendment, while SAM.gov
// offices amend by reposting the whole notice — but from the user's side both
// answer the same question, so both render through this shell and its card.
// Used by the parts and vendor tabs, bid matching and the RFQ worklist; new
// surfaces that need an amendment history should use it rather than rolling
// their own chrome.
//
// Callers own the data (fetched or already in hand) and pass cards as children.

interface ModalProps {
  // null/undefined hides the modal.
  title: string | null;
  // Usually the solicitation number.
  subtitle?: string | null;
  // Optional lead-in explaining how to read the entries.
  intro?: string;
  onClose: () => void;
  children: ReactNode;
}

export function SolicitationHistoryModal({ title, subtitle, intro, onClose, children }: ModalProps) {
  // Escape closes, matching every other dismissible surface in the app.
  useEffect(() => {
    if (!title) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [title, onClose]);

  if (!title) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card-bg rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 flex flex-col gap-2">
          {intro && <p className="text-xs text-muted">{intro}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

interface CardProps {
  // Left of the header — what this entry is ("Amendment 3", "Posted Jul 28, 2026").
  headline: ReactNode;
  // Right of the header — when or where it stands (a status, a relative time).
  meta?: ReactNode;
  // Short muted facts, laid out inline and wrapping.
  facts?: ReactNode[];
  // Marks the entry that is currently in force; also tints the card.
  isCurrent?: boolean;
  // Field diffs, links, counts — whatever the source has to show.
  children?: ReactNode;
}

export function SolicitationHistoryCard({ headline, meta, facts, isCurrent, children }: CardProps) {
  const shown = (facts ?? []).filter(Boolean);
  return (
    <li
      className={`rounded-lg border p-3 flex flex-col gap-1 ${
        isCurrent ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-semibold text-foreground">
          {headline}
          {isCurrent && (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Current
            </span>
          )}
        </span>
        {meta && <span className="text-xs text-muted capitalize">{meta}</span>}
      </div>
      {shown.length > 0 && (
        <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
          {shown.map((fact, i) => (
            <span key={i}>{fact}</span>
          ))}
        </div>
      )}
      {children}
    </li>
  );
}

// Shared list wrapper so spacing matches across sources.
export function SolicitationHistoryList({ children }: { children: ReactNode }) {
  return <ol className="flex flex-col gap-2">{children}</ol>;
}
