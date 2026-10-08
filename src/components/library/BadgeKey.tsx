import type { ReactNode } from "react";

export interface BadgeKeyItem {
  /** The badge's own class string (rowBadgeClass), so the key reads like the rows. */
  cls: string;
  code: ReactNode;
  label: string;
}

/** Trophy glyph of the win badge (WinHistoryBadge), for a key entry. */
export const TROPHY_ICON = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4M6 4h12v4a6 6 0 01-12 0V4zM6 6H4a2 2 0 002 4M18 6h2a2 2 0 01-2 4" />
  </svg>
);

/** Key to a table's one-letter row badges, under the table. */
export function BadgeKey({ items }: { items: BadgeKeyItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-2 text-[11px] text-muted">
      <span className="font-semibold text-foreground">Badges:</span>
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1">
          <span className={i.cls}>{i.code}</span>
          {i.label}
        </span>
      ))}
    </div>
  );
}
