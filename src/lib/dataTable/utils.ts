/**
 * DataTable Utilities
 *
 * Export and copy functionality for DataTable component.
 */

import type { Table, Row } from "@tanstack/react-table";

/**
 * Export table data to CSV format
 */
export function exportToCsv<T>(
  table: Table<T>,
  filename: string = "export"
): void {
  const headers = table
    .getVisibleFlatColumns()
    .filter((col) => col.id !== "actions" && col.id !== "select")
    .map((col) => {
      // Get header text from column def
      const header = col.columnDef.header;
      if (typeof header === "string") return header;
      return col.id;
    });

  const rows = table.getFilteredRowModel().rows.map((row) => {
    return table
      .getVisibleFlatColumns()
      .filter((col) => col.id !== "actions" && col.id !== "select")
      .map((col) => {
        const value = row.getValue(col.id);
        // Handle different value types
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return JSON.stringify(value);
        // Escape quotes and wrap in quotes if contains comma
        const strValue = String(value);
        if (strValue.includes(",") || strValue.includes('"')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      });
  });

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join(
    "\n"
  );

  downloadFile(csvContent, `${filename}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Export table data to JSON format
 */
export function exportToJson<T>(
  table: Table<T>,
  filename: string = "export"
): void {
  const data = table.getFilteredRowModel().rows.map((row) => row.original);
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, "application/json");
}

/**
 * Helper to trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard with fallback for older browsers
 */
async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern clipboard API first
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy method
    }
  }

  // Fallback: create temporary textarea and use execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Copy a single row to clipboard as tab-separated values
 */
export async function copyRowToClipboard<T>(
  row: Row<T>,
  columns: string[]
): Promise<boolean> {
  try {
    const values = columns.map((colId) => {
      try {
        const value = row.getValue(colId);
        if (value === null || value === undefined) return "";
        return String(value);
      } catch {
        // Column doesn't have a getValue accessor, try original data
        const original = row.original as Record<string, unknown>;
        const value = original[colId];
        if (value === null || value === undefined) return "";
        return String(value);
      }
    });
    return await copyToClipboard(values.join("\t"));
  } catch {
    console.error("Failed to copy to clipboard");
    return false;
  }
}

/**
 * Copy selected rows to clipboard
 */
export async function copySelectedRowsToClipboard<T>(
  table: Table<T>
): Promise<boolean> {
  try {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return false;

    const columns = table
      .getVisibleFlatColumns()
      .filter((col) => col.id !== "actions" && col.id !== "select")
      .map((col) => col.id);

    const headers = table
      .getVisibleFlatColumns()
      .filter((col) => col.id !== "actions" && col.id !== "select")
      .map((col) => {
        const header = col.columnDef.header;
        if (typeof header === "string") return header;
        return col.id;
      });

    const rows = selectedRows.map((row) =>
      columns.map((colId) => {
        const value = row.getValue(colId);
        if (value === null || value === undefined) return "";
        return String(value);
      })
    );

    const content = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
      "\n"
    );

    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    console.error("Failed to copy to clipboard");
    return false;
  }
}

/**
 * Format cell value for display based on type
 */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}
