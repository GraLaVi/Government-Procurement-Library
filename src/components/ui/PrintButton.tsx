/**
 * Toolbar-style button (compact, bordered, icon + text) shared by the library
 * detail toolbar's Print/Export buttons and the RFQ detail page.
 */
export const toolbarButtonClass =
  "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-card-bg text-card-foreground text-xs font-medium transition-colors hover:bg-muted-light hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait disabled:hover:bg-card-bg disabled:hover:border-border";

export function PrintButton({
  onClick,
  preparing = false,
  title = "Print this record",
  className = "",
}: {
  onClick: () => void;
  preparing?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={preparing}
      className={`${toolbarButtonClass} ${className}`}
      title={title}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 9V4h12v5M6 18H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-1M6 14h12v6H6z"
        />
      </svg>
      <span>{preparing ? "Preparing…" : "Print"}</span>
    </button>
  );
}
