"use client";

import Link from "next/link";
import type { LibraryTier } from "@/lib/library/tier";

/**
 * Describes a single column in the exported CSV. The `value` accessor
 * runs against each row and should return something safely string-able
 * (numbers, plain strings, null/undefined). For composite display cells
 * (e.g. "Buyer Contact" = email + phone), let the accessor pick whichever
 * field works best for CSV — typically the email.
 */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

interface ExportCsvButtonProps<T> {
  /** Highest parts-library tier the current user holds. From
   *  `resolvePartsTier(hasAnyProductAccess)`. `null` → render nothing. */
  tier: LibraryTier;
  /** The rows the user is currently looking at. The CSV mirrors the
   *  same data set — pagination / page-size caps from the API apply
   *  naturally because we only have what was loaded. */
  rows: T[];
  /** Column spec — header text + per-row value accessor. */
  columns: CsvColumn<T>[];
  /** Filename prefix; a YYYY-MM-DD suffix is appended automatically so
   *  back-to-back exports don't overwrite on disk. */
  filename: string;
  /** Optional label override. Defaults to "Export CSV". */
  label?: string;
  /** Optional hook for analytics / toast before the download fires. */
  onExport?: () => void;
  /** When true, render just the button (no upsell hint underneath).
   *  Use this when the button lives in a tight chrome surface like a
   *  tab strip; render `<CustomReportLink />` separately elsewhere. */
  compact?: boolean;
}

function todayIsoDate(): string {
  // Local date in YYYY-MM-DD — mirrors the backend `csv_response` suffix
  // format so exports across the app feel consistent.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote if the cell contains a comma, double-quote, newline, or
  // leading/trailing whitespace — and escape internal quotes by
  // doubling them per RFC 4180.
  if (/[",\n\r]/.test(s) || s !== s.trim()) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(c.value(row))).join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function DownloadIcon() {
  return (
    <svg
      className="w-3 h-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
      />
    </svg>
  );
}

/**
 * CSV-export button for the parts-library tables.
 *
 * - Advanced tier: enabled button; click builds CSV from `rows` +
 *   `columns` and triggers a download. Filename gets a `-YYYY-MM-DD`
 *   suffix so repeat exports don't collide on disk.
 * - Basic / Free tier: button is rendered as a styled link to `/pricing`
 *   with an "Advanced" tag + tooltip — discoverable upsell.
 * - No parts access at all (`tier === null`): renders nothing.
 *
 * Underneath the button, regardless of tier, a small muted link offers a
 * custom-reports request (more rows / different columns) routing to the
 * contact form with a prefilled subject.
 */
export function ExportCsvButton<T>({
  tier,
  rows,
  columns,
  filename,
  label = "Export CSV",
  onExport,
  compact = false,
}: ExportCsvButtonProps<T>) {
  if (tier === null) return null;

  const isAdvanced = tier === "advanced";
  const disabledForData = isAdvanced && rows.length === 0;

  const handleExport = () => {
    if (!isAdvanced || rows.length === 0) return;
    onExport?.();
    const csv = buildCsv(rows, columns);
    triggerDownload(csv, `${filename}-${todayIsoDate()}.csv`);
  };

  // Compact mode renders the button only — for inline placement in tab
  // bars / toolbars where vertical space matters. Hosts are responsible
  // for rendering <CustomReportLink /> separately if they still want the
  // upsell hint nearby (e.g. below the table).
  if (compact) {
    return isAdvanced ? (
      <button
        type="button"
        onClick={handleExport}
        disabled={disabledForData}
        title={
          disabledForData
            ? "No rows to export yet"
            : "Download the current rows as CSV"
        }
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-colors ${
          disabledForData
            ? "border-border bg-muted-light/40 text-muted cursor-not-allowed"
            : "border-border bg-card-bg text-card-foreground hover:bg-muted-light hover:border-primary/40"
        }`}
      >
        <DownloadIcon />
        <span>{label}</span>
      </button>
    ) : (
      <Link
        href="/pricing"
        title="CSV export is available on the Advanced plan."
        aria-label="CSV export is available on the Advanced plan. Click to upgrade."
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-muted-light/40 text-xs font-medium text-muted hover:border-primary/30 transition-colors"
      >
        <DownloadIcon />
        <span>{label}</span>
        <span className="ml-0.5 text-[9px] uppercase tracking-wide font-semibold text-primary">
          Advanced
        </span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {isAdvanced ? (
        <button
          type="button"
          onClick={handleExport}
          disabled={disabledForData}
          title={
            disabledForData
              ? "No rows to export yet"
              : "Download the current rows as CSV"
          }
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-colors ${
            disabledForData
              ? "border-border bg-muted-light/40 text-muted cursor-not-allowed"
              : "border-border bg-card-bg text-card-foreground hover:bg-muted-light hover:border-primary/40"
          }`}
        >
          <DownloadIcon />
          <span>{label}</span>
        </button>
      ) : (
        // Disabled state for Basic/Free. The wrapper <Link> makes the
        // whole control an upsell route to /pricing.
        <Link
          href="/pricing"
          title="CSV export is available on the Advanced plan."
          aria-label="CSV export is available on the Advanced plan. Click to upgrade."
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-muted-light/40 text-xs font-medium text-muted hover:border-primary/30 transition-colors"
        >
          <DownloadIcon />
          <span>{label}</span>
          <span className="ml-0.5 text-[9px] uppercase tracking-wide font-semibold text-primary">
            Advanced
          </span>
        </Link>
      )}
      {/* Custom-reports upsell — visible to all tiers including
          Advanced. Routes to /contact with a prefilled subject. */}
      <Link
        href="/contact?subject=Custom%20parts%20report"
        className="text-[11px] text-muted hover:text-primary hover:underline transition-colors"
      >
        Need more rows or columns? Request a custom report &rarr;
      </Link>
    </div>
  );
}

/**
 * Stand-alone upsell hint for the parts-library export surfaces. Lives
 * separately so hosts can place it wherever it fits best (typically
 * below the table) when the button itself is rendered compactly inside
 * the tab strip or another tight chrome region.
 */
export function CustomReportLink() {
  return (
    <Link
      href="/contact?subject=Custom%20parts%20report"
      className="text-[11px] text-muted hover:text-primary hover:underline transition-colors"
    >
      Need more rows or columns? Request a custom report &rarr;
    </Link>
  );
}

export default ExportCsvButton;
