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
  styling: {
    stripedRows: true,
    stripeClass: "bg-gray-50",
    hoverHighlight: true,
    hoverClass: "hover:bg-blue-50",
    compactMode: true,
    headerBgClass: "bg-gray-100",
    borderClass: "border-border",
  },

  features: {
    sorting: true,
    multiSort: false,
    rowSelection: false,
    copyRow: true,
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
