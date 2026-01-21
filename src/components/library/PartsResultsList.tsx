"use client";

import { useMemo } from "react";
import { PartSearchResult, formatNSN, formatCurrency } from "@/lib/library/types";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";

interface PartsResultsListProps {
  results: PartSearchResult[];
  total: number;
  onSelect: (nsn: string) => void;
  selectedNSN?: string;
  isLoading?: boolean;
}

export function PartsResultsList({
  results,
  total,
  onSelect,
  isLoading,
}: PartsResultsListProps) {
  // Define columns using TanStack Table column definitions
  const columns = useMemo<ColumnDef<PartSearchResult>[]>(
    () => [
      {
        id: "nsn",
        accessorKey: "nsn",
        header: "NSN",
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-primary">
            {formatNSN(row.original.nsn) || row.original.nsn}
          </span>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="font-medium text-foreground truncate max-w-[300px] md:max-w-[500px]" title={row.original.description || undefined}>
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "unit_of_issue",
        accessorKey: "unit_of_issue",
        header: "Unit",
        cell: ({ row }) => (
          <span className="text-muted">
            {row.original.unit_of_issue || "—"}
          </span>
        ),
        meta: { className: "hidden sm:table-cell" },
      },
      {
        id: "unit_price",
        accessorKey: "unit_price",
        header: () => <span className="w-full text-right block">Unit Price</span>,
        cell: ({ row }) => (
          <span className="text-right block">
            {formatCurrency(row.original.unit_price)}
          </span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "chevron",
        header: "",
        cell: () => (
          <svg
            className="w-4 h-4 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        ),
        enableSorting: false,
        size: 40,
      },
    ],
    []
  );

  // Custom empty state
  const emptyComponent = (
    <div className="bg-card-bg rounded-lg border border-border p-6 text-center">
      <svg
        className="w-10 h-10 text-muted mx-auto mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <h3 className="text-sm font-medium text-foreground mb-1">No parts found</h3>
      <p className="text-xs text-muted">Try adjusting your search criteria</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-card-bg rounded-lg border border-border p-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted">Searching...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return emptyComponent;
  }

  return (
    <div className="bg-card-bg rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 bg-muted-light border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted">
          {total} part{total !== 1 ? "s" : ""} found
        </span>
        <span className="text-xs text-muted">Click a row to view details</span>
      </div>

      {/* DataTable */}
      <DataTable
        data={results}
        columns={columns}
        onRowClick={(row) => onSelect(row.nsn)}
        getRowId={(row) => row.nsn}
        exportFilename="parts-search-results"
        config={{
          features: {
            sorting: true,
            multiSort: false,
            rowSelection: false,
            copyRow: false, // Disabled for this table since rows are clickable
            export: false,
            exportFormats: ["csv"],
            columnResize: false,
            columnVisibility: false,
          },
        }}
      />
    </div>
  );
}
