"use client";

import { Tooltip } from '@/components/ui/Tooltip';

interface CardInfoBadgeProps {
  content: string;
}

/**
 * Small "?" hover badge explaining what a card shows and where the data
 * comes from. Same Tooltip + badge markup KPICard's `tooltip` prop already
 * renders, extracted so table/chart-level cards (which have a header but no
 * `tooltip` prop) can drop it next to their own <h3>.
 */
export function CardInfoBadge({ content }: CardInfoBadgeProps) {
  return (
    <Tooltip content={content}>
      <span
        aria-label="More info"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-muted/40 text-[10px] font-semibold text-muted/70 leading-none cursor-help"
      >
        ?
      </span>
    </Tooltip>
  );
}
