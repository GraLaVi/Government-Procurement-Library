/**
 * Global DataTable Configuration
 *
 * This configuration applies to ALL DataTable instances across the application.
 * Modify these settings to change table behavior site-wide.
 */

export interface DataTableConfig {
  // Styling
  styling: {
    /** Enable alternating row backgrounds */
    stripedRows: boolean;
    /** Background color class for odd rows (when striped) */
    stripeClass: string;
    /** Enable hover highlight on rows */
    hoverHighlight: boolean;
    /** Hover background class */
    hoverClass: string;
    /** Compact row padding */
    compactMode: boolean;
    /** Table header background class */
    headerBgClass: string;
    /** Type treatment for header cells (size, weight, casing, color). */
    headerTextClass: string;
    /** Table border class */
    borderClass: string;
  };

  // Features
  features: {
    /** Enable column sorting */
    sorting: boolean;
    /** Enable multi-column sorting */
    multiSort: boolean;
    /** Enable row selection */
    rowSelection: boolean;
    /** Enable copy row to clipboard */
    copyRow: boolean;
    /** Enable export functionality */
    export: boolean;
    /** Available export formats */
    exportFormats: ("csv" | "xlsx" | "json")[];
    /** Enable column resizing */
    columnResize: boolean;
    /** Enable column visibility toggle */
    columnVisibility: boolean;
  };

  // Pagination
  pagination: {
    /** Enable pagination */
    enabled: boolean;
    /** Default page size */
    defaultPageSize: number;
    /** Available page size options */
    pageSizeOptions: number[];
    /** Show page size selector */
    showPageSizeSelector: boolean;
  };

  // Text/Labels (for i18n support)
  labels: {
    noData: string;
    loading: string;
    export: string;
    copyRow: string;
    rowsCopied: string;
    sortAsc: string;
    sortDesc: string;
    showingOf: (showing: number, total: number) => string;
  };
}

/**
 * Default configuration - modify these values to change defaults site-wide
 */
export const dataTableConfig: DataTableConfig = {
  // These mirror the RFQ tables' tokens in components/rfq/TableCard.tsx, so
  // the library's tables and /rfq's read as one product rather than two.
  // Keep the two in step: a change here usually wants the same change there.
  styling: {
    // Rules between rows carry the scanning job instead, which is what the
    // RFQ tables do. Striping on top of them is one texture too many.
    stripedRows: false,
    stripeClass: "bg-muted-light/40",
    hoverHighlight: true,
    // Neutral hover. The teal wash competed with the teal NSN and CAGE
    // columns, which are the values worth seeing first.
    hoverClass: "hover:bg-muted-light/50",
    compactMode: true,
    // Neutral header band. The brand does not need to sit behind every
    // column label; on vendor search the tinted band sat directly above a
    // column of teal CAGE codes.
    headerBgClass: "bg-muted-light",
    // Sentence case at the body size, not tracked micro-caps: column labels
    // read as labels without shouting.
    headerTextClass: "text-xs font-semibold text-foreground",
    borderClass: "border-border",
  },

  features: {
    sorting: true,
    multiSort: false,
    rowSelection: false,
    // Off everywhere by design — the per-row copy icon was removed from the
    // parts/vendor search tabs (Aug 2026). The render path and clipboard
    // util remain for tables that opt back in.
    copyRow: false,
    export: true,
    exportFormats: ["csv"],
    columnResize: false,
    columnVisibility: false,
  },

  pagination: {
    enabled: false,
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    showPageSizeSelector: true,
  },

  labels: {
    noData: "No data available",
    loading: "Loading...",
    export: "Export",
    copyRow: "Copy row",
    rowsCopied: "Row copied to clipboard",
    sortAsc: "Sort ascending",
    sortDesc: "Sort descending",
    showingOf: (showing, total) =>
      `Showing ${showing} of ${total.toLocaleString()}`,
  },
};

/**
 * Helper to merge partial config with defaults
 */
export function mergeConfig(
  partial: Partial<DataTableConfig>
): DataTableConfig {
  return {
    styling: { ...dataTableConfig.styling, ...partial.styling },
    features: { ...dataTableConfig.features, ...partial.features },
    pagination: { ...dataTableConfig.pagination, ...partial.pagination },
    labels: { ...dataTableConfig.labels, ...partial.labels },
  };
}
