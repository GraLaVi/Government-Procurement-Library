"use client";

import { useMemo } from "react";
import { VendorSearchResult, formatSamStatus, formatVendorTotal } from "@/lib/library/types";
import { RowBadge } from "@/components/library/RowBadge";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { ExportCsvButton, CustomReportLink, type CsvColumn } from "@/components/library/ExportCsvButton";
import type { LibraryTier } from "@/lib/library/tier";

interface VendorResultsListProps {
  results: VendorSearchResult[];
  total: number;
  /** True when the API capped the count at 100 and more vendors matched —
   *  the header then reads "100+ vendors found". */
  totalCapped?: boolean;
  onSelect: (cageCode: string) => void;
  selectedCageCode?: string;
  isLoading?: boolean;
  /** Highest vendor-library tier the current user holds. Drives the
   *  CSV export button (Advanced enabled, Basic/Free upsell-locked,
   *  hidden when null). Resolved by the parent page from
   *  `resolveVendorTier(hasAnyProductAccess)`. */
  tier?: LibraryTier;
}

export function VendorResultsList({
  results,
  total,
  totalCapped,
  onSelect,
  isLoading,
  tier = null,
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
        header: "Vendor name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate max-w-[200px] md:max-w-[300px]">
              {row.original.legal_business_name || "Unknown"}
            </span>
            {row.original.small_business && (
              <RowBadge>SB</RowBadge>
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
            <RowBadge tone={samStatus === "Active" ? "green" : "amber"}>
              {samStatus}
            </RowBadge>
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

  // CSV column spec — mirrors the on-screen columns. The location is
  // split into city + state so spreadsheet filters work cleanly; the
  // SB / SAM status flags are flattened to plain strings.
  const csvColumns = useMemo<CsvColumn<VendorSearchResult>[]>(
    () => [
      { header: "CAGE", value: (r) => r.cage_code },
      { header: "Vendor Name", value: (r) => r.legal_business_name ?? "" },
      { header: "DBA Name", value: (r) => r.dba_name ?? "" },
      { header: "City", value: (r) => r.city ?? "" },
      { header: "State", value: (r) => r.state ?? "" },
      { header: "UEI", value: (r) => r.uei ?? "" },
      { header: "DUNS", value: (r) => r.duns ?? "" },
      { header: "SAM Status", value: (r) => formatSamStatus(r.sam_status) ?? "" },
      { header: "Small Business", value: (r) => (r.small_business ? "Yes" : "No") },
    ],
    [],
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
      <h3 className="text-sm font-medium text-foreground mb-1">No vendors found</h3>
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
    // Card, header rule, inset bordered table — the RFQ tables' panel shape,
    // so search results and /rfq read as one product.
    <div className="bg-card-bg rounded-lg border border-border p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-medium text-muted">
            {formatVendorTotal(total, totalCapped)} vendor
            {total !== 1 || totalCapped ? "s" : ""} found
          </span>
          <span className="text-xs text-muted hidden sm:inline">
            Click a row to view details
          </span>
        </div>
        <div className="ml-auto">
          {/* CSV export — only renders when the user holds any vendor-library
              tier. Advanced exports immediately; Basic/Free see an upsell.
              Compact mode keeps the button inline with the header chrome;
              the custom-reports hint renders below the table so the data
              stays high on the page. */}
          <ExportCsvButton
            tier={tier}
            rows={results}
            columns={csvColumns}
            filename="vendor-search"
            compact
          />
        </div>
      </div>

      {/* DataTable brings its own bordered scroll box. */}
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
      {/* Custom-reports upsell — under the table so the data stays
          at the top of the panel. */}
      {tier !== null && (
        <div className="mt-3 pt-3 border-t border-border flex justify-end">
          <CustomReportLink />
        </div>
      )}
    </div>
  );
}
