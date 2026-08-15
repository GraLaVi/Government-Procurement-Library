/**
 * Toolbar-style button (compact, bordered, icon + text) shared by the library
 * detail toolbar's Print/Export buttons and the RFQ detail page.
 */
export const toolbarButtonClass =
  "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-card-bg text-card-foreground text-xs font-medium transition-colors hover:bg-muted-light hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait disabled:hover:bg-card-bg disabled:hover:border-border";

/**
 * Tone variants for a toolbar button.
 *
 * Geometry is fixed by toolbarButtonClass — same padding, radius, border width
 * and type scale for every button in a toolbar. Only colour varies, so a row of
 * them reads as one control group rather than three unrelated buttons at three
 * different sizes, which is what the RFQ detail page had when Close was an
 * outline Button, Cancel a ghost Button and Print a toolbar button.
 */
export type ToolbarTone = "default" | "primary" | "danger";

const TOOLBAR_TONES: Record<ToolbarTone, string> = {
  default: "",
  // The action you came to the page to take.
  primary: "!border-primary/50 !text-primary hover:!bg-primary/10 hover:!border-primary",
  // Destructive and irreversible — reads as a warning without shouting.
  danger: "!text-error/90 hover:!bg-error/10 hover:!border-error/50",
};

export function ToolbarButton({
  onClick,
  tone = "default",
  disabled = false,
  title,
  className = "",
  children,
}: {
  onClick?: () => void;
  tone?: ToolbarTone;
  disabled?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${toolbarButtonClass} ${TOOLBAR_TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

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
