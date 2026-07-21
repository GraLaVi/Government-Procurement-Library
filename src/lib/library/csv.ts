// Client-side CSV helpers for the parts/vendor library exports.
//
// These were originally private to ExportCsvButton.tsx; they live here now so
// the per-section export button and the one-pager "Export all" toolbar share a
// single, RFC-4180-correct implementation.

/** Describes a single column in an exported CSV. The `value` accessor runs
 *  against each row and should return something safely string-able. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** Local date in YYYY-MM-DD — mirrors the backend `csv_response` suffix format
 *  so exports across the app feel consistent, and repeat downloads don't
 *  collide on disk. */
export function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote if the cell contains a comma, double-quote, newline, or
  // leading/trailing whitespace — and escape internal quotes by doubling
  // them per RFC 4180.
  if (/[",\n\r]/.test(s) || s !== s.trim()) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(c.value(row))).join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

/** Join several already-built section CSVs into one file, each preceded by a
 *  `# <title>` marker line and separated by a blank line. Used by the linear
 *  one-pager's "Export all" button. Sections with no rows are skipped. */
export function buildCombinedCsv(
  blocks: Array<{ title: string; csv: string }>,
): string {
  return blocks
    .filter((b) => b.csv.trim().length > 0)
    .map((b) => `# ${b.title}\n${b.csv}`)
    .join("\n\n");
}

export function triggerDownload(content: string, filename: string): void {
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
