import type { ElementType, ReactNode } from "react";

/**
 * Card panel for RFQ tables, matching the bid-matching results panel: content
 * sits on a bg-card-bg card, with an optional header row (section heading,
 * filters, actions) separated by a bottom border.
 *
 * `as="section"` keeps the RFQ detail page's <section> semantics — its print
 * CSS applies break-inside: avoid per section.
 */
export function TableCard({
  as: Tag = "div",
  header,
  children,
  className = "",
}: {
  as?: ElementType;
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag className={`bg-card-bg rounded-lg border border-border p-4 ${className}`}>
      {header && (
        <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-border">
          {header}
        </div>
      )}
      {children}
    </Tag>
  );
}
