"use client";

import { useMemo } from "react";
import { VendorSearchResult, formatSamStatus } from "@/lib/library/types";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";

interface VendorResultsListProps {
  results: VendorSearchResult[];
  total: number;
  onSelect: (cageCode: string) => void;
  selectedCageCode?: string;
  isLoading?: boolean;
}

export function VendorResultsList({
  results,
  total,
  onSelect,
  isLoading,
}: VendorResultsListProps) {
  // Define columns using TanStack Table column definitions
  const columns = useMemo<ColumnDef<VendorSearchResult>[]>(
    () => [
      {
        id: "cage_code",
        accessorKey: "cage_code",
        header: "CAGE",
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-primary">
            {row.original.cage_code}
          </span>
        ),
      },
      {
        id: "legal_business_name",
        accessorKey: "legal_business_name",
        header: "Vendor Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate max-w-[200px] md:max-w-[300px]">
              {row.original.legal_business_name || "Unknown"}
            </span>
            {row.original.small_business && (
              <Badge variant="info" size="sm">SB</Badge>
            )}
          </div>
        ),
      },
      {
        id: "location",
        accessorFn: (row) => [row.city, row.state].filter(Boolean).join(", "),
        header: "Location",
        cell: ({ row }) => (
          <span className="text-muted">
            {[row.original.city, row.original.state].filter(Boolean).join(", ") || "—"}
          </span>
        ),
        meta: { className: "hidden sm:table-cell" },
      },
      {
        id: "uei",
        accessorKey: "uei",
        header: "UEI",
        cell: ({ row }) => (
          <span className="font-mono text-muted">
            {row.original.uei || "—"}
          </span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "sam_status",
        accessorKey: "sam_status",
        header: "Status",
        cell: ({ row }) => {
          const samStatus = formatSamStatus(row.original.sam_status);
          return samStatus ? (
            <Badge
              variant={samStatus === "Active" ? "success" : "warning"}
              size="sm"
            >
              {samStatus}
            </Badge>
          ) : null;
        },
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
    <div className="bg-white rounded-lg border border-border p-6 text-center">
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
      <h3 className="text-sm font-medium text-foreground mb-1">No vendors found</h3>
      <p className="text-xs text-muted">Try adjusting your search criteria</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-border p-4">
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
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 bg-muted-light border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted">
          {total} vendor{total !== 1 ? "s" : ""} found
        </span>
        <span className="text-xs text-muted">Click a row to view details</span>
      </div>

      {/* DataTable */}
      <DataTable
        data={results}
        columns={columns}
        onRowClick={(row) => onSelect(row.cage_code)}
        getRowId={(row) => row.cage_code}
        exportFilename="vendor-search-results"
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
