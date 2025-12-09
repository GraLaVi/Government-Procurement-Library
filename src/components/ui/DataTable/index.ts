export { DataTable } from "./DataTable";
export type { DataTableProps } from "./DataTable";

// Re-export TanStack Table types that consumers might need
export type { ColumnDef, Row, Cell, Header } from "@tanstack/react-table";

// Re-export config types
export type { DataTableConfig } from "@/config/dataTable.config";
export { dataTableConfig, mergeConfig } from "@/config/dataTable.config";

// Re-export utils
export {
  exportToCsv,
  exportToJson,
  copyRowToClipboard,
  copySelectedRowsToClipboard,
  formatCellValue,
} from "@/lib/dataTable/utils";
