"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type Row,
} from "@tanstack/react-table";
import {
  dataTableConfig,
  mergeConfig,
  type DataTableConfig,
} from "@/config/dataTable.config";
import { exportToCsv, exportToJson, copyRowToClipboard } from "@/lib/dataTable/utils";

export interface DataTableProps<T> {
  /** Data array to display */
  data: T[];
  /** Column definitions */
  columns: ColumnDef<T, unknown>[];
  /** Optional partial config to override defaults */
  config?: Partial<DataTableConfig>;
  /** Loading state */
  isLoading?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Custom empty state component */
  emptyComponent?: React.ReactNode;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Export filename (without extension) */
  exportFilename?: string;
  /** Show toolbar with export/actions */
  showToolbar?: boolean;
  /** Custom toolbar content */
  toolbarContent?: React.ReactNode;
  /** Additional table className */
  className?: string;
  /** Get row ID for selection/keys */
  getRowId?: (row: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  config: configOverrides,
  isLoading = false,
  emptyMessage,
  emptyComponent,
  onRowClick,
  exportFilename = "export",
  showToolbar = false,
  toolbarContent,
  className = "",
  getRowId,
}: DataTableProps<T>) {
  const config = useMemo(
    () => (configOverrides ? mergeConfig(configOverrides) : dataTableConfig),
    [configOverrides]
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: config.features.sorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: config.pagination.enabled
      ? getPaginationRowModel()
      : undefined,
    enableSorting: config.features.sorting,
    enableMultiSort: config.features.multiSort,
    enableRowSelection: config.features.rowSelection,
    getRowId: getRowId,
  });

  const handleExport = useCallback(
    (format: "csv" | "json") => {
      if (format === "csv") {
        exportToCsv(table, exportFilename);
      } else if (format === "json") {
        exportToJson(table, exportFilename);
      }
    },
    [table, exportFilename]
  );

  const handleCopyRow = useCallback(
    async (row: Row<T>) => {
      const columnIds = table
        .getVisibleFlatColumns()
        .filter((col) => {
          // Skip action/selection columns
          if (col.id === "actions" || col.id === "select" || col.id === "chevron") return false;
          // Skip columns without accessors (they can't be copied)
          const colDef = col.columnDef;
          return 'accessorKey' in colDef || 'accessorFn' in colDef;
        })
        .map((col) => col.id);

      const success = await copyRowToClipboard(row, columnIds);
      if (success) {
        setCopiedRowId(row.id);
        setTimeout(() => setCopiedRowId(null), 2000);
      }
    },
    [table]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="ml-2 text-sm text-muted">{config.labels.loading}</span>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    if (emptyComponent) {
      return <>{emptyComponent}</>;
    }
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg
          className="w-10 h-10 text-muted/50 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm text-muted">
          {emptyMessage || config.labels.noData}
        </p>
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Toolbar */}
      {(showToolbar || toolbarContent) && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted">
            {config.labels.showingOf(rows.length, data.length)}
          </div>
          <div className="flex items-center gap-2">
            {toolbarContent}
            {config.features.export && (
              <div className="relative">
                <button
                  onClick={() => handleExport("csv")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground border border-border rounded hover:bg-muted-light transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  {config.labels.export}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${config.styling.borderClass} ${config.styling.headerBgClass}`}>
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-3 py-2 text-left text-[10px] font-semibold text-muted uppercase tracking-wide group ${
                      header.column.getCanSort() ? "cursor-pointer select-none hover:text-foreground" : ""
                    }`}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {/* Sort indicator */}
                      {header.column.getCanSort() && (
                        <span className={header.column.getIsSorted() ? "text-primary" : "text-muted"}>
                          {header.column.getIsSorted() === "asc" ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          ) : header.column.getIsSorted() === "desc" ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))
              )}
              {config.features.copyRow && <th className="px-2 py-2 w-8"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, index) => {
              const isStriped = config.styling.stripedRows && index % 2 === 1;
              const isCopied = copiedRowId === row.id;

              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={`
                    ${isStriped ? config.styling.stripeClass : "bg-card-bg"}
                    ${config.styling.hoverHighlight ? config.styling.hoverClass : ""}
                    ${onRowClick ? "cursor-pointer" : ""}
                    ${isCopied ? "bg-success/10" : ""}
                    transition-colors
                  `}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-3 ${config.styling.compactMode ? "py-1.5" : "py-2"} text-xs text-foreground`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  {config.features.copyRow && (
                    <td className={`px-2 ${config.styling.compactMode ? "py-1.5" : "py-2"}`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyRow(row);
                        }}
                        className="p-1 text-muted hover:text-foreground rounded hover:bg-muted-light transition-colors"
                        title={config.labels.copyRow}
                      >
                        {isCopied ? (
                          <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {config.pagination.enabled && (
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2">
            {config.pagination.showPageSizeSelector && (
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="text-xs border border-border rounded px-2 py-1"
              >
                {config.pagination.pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} rows
                  </option>
                ))}
              </select>
            )}
            <span className="text-xs text-muted">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-2 py-1 text-xs border border-border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted-light"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-2 py-1 text-xs border border-border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted-light"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
