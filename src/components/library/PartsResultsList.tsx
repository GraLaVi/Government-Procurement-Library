"use client";

import { useMemo } from "react";
import { PartSearchResult, formatCurrency, partKey, formatPartIdentity, isPartNumberOnly } from "@/lib/library/types";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { ExportCsvButton, CustomReportLink, type CsvColumn } from "@/components/library/ExportCsvButton";
import { RowBadge } from "@/components/library/RowBadge";
import type { LibraryTier } from "@/lib/library/tier";
import type { PartAvailability } from "@/lib/inventory/types";

interface PartsResultsListProps {
  results: PartSearchResult[];
  total: number;
  onSelect: (nsn: string) => void;
  selectedNSN?: string;
  isLoading?: boolean;
  /** Highest parts-library tier the current user holds. Drives the CSV
   *  export button (enabled on Advanced, upsell-locked on Basic/Free,
   *  hidden when null). Resolved by the parent page from
   *  `resolvePartsTier(hasAnyProductAccess)`. */
  tier?: LibraryTier;
  /** Supplier-stock availability by part id (Inventory Upload). Best-effort
   *  enrichment fetched by the parent after results land — the badge simply
   *  doesn't render for parts (or viewers) without it. */
  availability?: Record<number, PartAvailability>;
}

export function PartsResultsList({
  results,
  total,
  onSelect,
  isLoading,
  tier = null,
  availability,
}: PartsResultsListProps) {
  // Define columns using TanStack Table column definitions
  const columns = useMemo<ColumnDef<PartSearchResult>[]>(
    () => [
      {
        id: "nsn",
        accessorKey: "nsn",
        header: "NSN",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono font-semibold text-primary">
              {formatPartIdentity(row.original)}
            </span>
            {isPartNumberOnly(row.original) && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted-light text-muted whitespace-nowrap"
                title="This DIBBS solicitation has no NSN — the part is identified by manufacturer CAGE and part number."
              >
                P/N only
              </span>
            )}
            {availability?.[row.original.id]?.network_in_stock && (
              <RowBadge
                tone="green"
                title="One or more GPH suppliers report this part in stock — see the Supplier Stock tab."
              >
                In stock
              </RowBadge>
            )}
            {(availability?.[row.original.id]?.my_listings ?? 0) > 0 && (
              <RowBadge
                tone="sky"
                title="Your company's inventory includes this part."
              >
                My stock
              </RowBadge>
            )}
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
        header: () => <span className="w-full text-right block">Unit price</span>,
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
    [availability]
  );

  // CSV column spec — mirrors the on-screen columns the user sees.
  // Values are plain strings (the visible cells use JSX with formatters
  // and icons, which doesn't translate cleanly to CSV).
  const csvColumns = useMemo<CsvColumn<PartSearchResult>[]>(
    () => [
      { header: "NSN", value: (r) => formatPartIdentity(r) },
      { header: "Description", value: (r) => r.description ?? "" },
      { header: "Unit", value: (r) => r.unit_of_issue ?? "" },
      // Unit price as a plain number so spreadsheets can sum it.
      { header: "Unit Price", value: (r) => r.unit_price ?? "" },
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
    // Card, header rule, inset bordered table — the RFQ tables' panel shape,
    // so search results and /rfq read as one product.
    <div className="bg-card-bg rounded-lg border border-border p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-medium text-muted">
            {total} part{total !== 1 ? "s" : ""} found
          </span>
          <span className="text-xs text-muted hidden sm:inline">
            Click a row to view details
          </span>
        </div>
        <div className="ml-auto">
          {/* CSV export — only renders when the user holds any parts-library
              tier. Advanced exports immediately; Basic/Free see an upsell.
              Compact mode keeps the button inline with the header chrome;
              the custom-reports upsell hint renders below the table so
              the data stays high on the page. */}
          <ExportCsvButton
            tier={tier}
            rows={results}
            columns={csvColumns}
            filename="parts-search"
            compact
          />
        </div>
      </div>

      {/* DataTable brings its own bordered scroll box. */}
      <DataTable
        data={results}
        columns={columns}
        onRowClick={(row) => onSelect(partKey(row))}
        getRowId={(row) => partKey(row)}
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
