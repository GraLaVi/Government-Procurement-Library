# Vendor Search UI Documentation

This document describes the vendor search page implementation, including its components, features, and configuration.

## Overview

The vendor search page (`/library/vendor-search`) allows users to search for government vendors by CAGE code, UEI, or business name. After a successful search, the results are displayed with detailed vendor information organized in tabs.

## File Structure

```
src/
├── app/library/vendor-search/
│   └── page.tsx                    # Main search page with collapsible search panel
├── components/library/
│   └── VendorDetail.tsx            # Vendor detail component with tabbed interface
├── components/ui/
│   ├── DataTable/
│   │   ├── DataTable.tsx           # Reusable data table component
│   │   └── index.ts
│   ├── Input.tsx                   # Form input component
│   ├── Tabs.tsx                    # Tab navigation component
│   └── Badge.tsx                   # Status badge component
├── config/
│   └── dataTable.config.ts         # Global DataTable configuration
└── lib/
    ├── library/
    │   └── types.ts                # Vendor type definitions and formatters
    └── dataTable/
        └── utils.ts                # DataTable utilities (clipboard, etc.)
```

## Features

### 1. Collapsible Search Panel

The search form automatically collapses after a successful search to maximize screen space for viewing results.

**Behavior:**
- Search form is expanded by default
- After successful search with results, form collapses
- Compact summary bar shows: search type, query, result count
- "New Search" button expands the form again

**State Management:**
```typescript
const [isSearchExpanded, setIsSearchExpanded] = useState(true);
const [lastSearchType, setLastSearchType] = useState<string>("");
const [lastSearchQuery, setLastSearchQuery] = useState<string>("");
```

### 2. Search Types

| Type | Description | Example |
|------|-------------|---------|
| CAGE Code | 5-character alphanumeric identifier | `1ABC2` |
| UEI | Unique Entity Identifier (12 chars) | `ABCD1234EFGH` |
| Business Name | Partial or full company name | `Acme Corp` |

### 3. Vendor Detail Tabs

The `VendorDetail` component displays vendor information in five tabs:

#### Demographics Tab
3-column card layout displaying:
- **Left Column**: Identifiers (CAGE, UEI, DUNS, DoDAAC) + Registration status
- **Middle Column**: Business details (Entity Structure, Website, State/Country of Inc, Fiscal Year End)
- **Right Column**: Physical and Mailing addresses

Key features:
- Empty values are filtered out (no placeholder dashes)
- Identifier codes displayed in monospace font
- Website links are clickable
- Responsive: single column on mobile, 3 columns on large screens

#### Contacts Tab
List of vendor contacts with:
- Contact type (Government Business POC, etc.)
- Name, title, phone, email
- Formatted contact types via `formatContactType()`

#### Recent Awards Tab (Lazy Loaded)
DataTable showing recent contract awards:
- Columns: Contract #, NSN (FSC-NIIN), Description, Qty, Unit Price, Total
- NSN combines FSC and formatted NIIN (e.g., `5935-0123-45-678`)
- Qty and money columns are right-justified
- Data fetched on tab click

#### Contracts Booked Tab (Lazy Loaded)
DataTable showing monthly booking data:
- Columns: Month, DSCP, DSCR, DSCC, Other, Total
- All numeric columns right-justified
- Footer row with totals

#### Open Solicitations Tab (Lazy Loaded)
DataTable showing active solicitations:
- Columns: Close Date, Solicitation #, NSN, Description, Qty, Est. Value, Set-Aside, Agency
- NSN combines FSC and formatted NIIN
- Qty and Est. Value columns right-justified
- Est. Value = Qty × unit price from parts master data
- Agency links to DIBBS solicitation page
- Shows solicitations from the last 7 years (max 150 records)
- Data fetched on tab click

## DataTable Configuration

Global configuration in `src/config/dataTable.config.ts`:

```typescript
export const dataTableConfig: DataTableConfig = {
  styling: {
    stripedRows: true,
    stripeClass: "bg-gray-50",        // Alternating row background
    hoverHighlight: true,
    hoverClass: "hover:bg-blue-50",   // Row hover effect
    compactMode: true,                 // Reduced row padding (py-1.5)
    headerBgClass: "bg-gray-100",
    borderClass: "border-border",
  },
  features: {
    enableSorting: true,
    enableFiltering: false,
    enablePagination: true,
    enableRowSelection: false,
    enableColumnVisibility: false,
    enableExport: false,
    enableRowCopy: true,              // Right-click to copy row
  },
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
  },
};
```

### Sort Indicators

Sort indicators are always visible on sortable columns:
- Unsorted: Gray sort icon (`text-gray-400`)
- Sorted ascending: Primary color up arrow (`text-primary`)
- Sorted descending: Primary color down arrow (`text-primary`)

### Row Copy Feature

Right-click any row to copy its data as tab-separated values.

**Implementation** (`src/lib/dataTable/utils.ts`):
- Uses `navigator.clipboard.writeText()` when available
- Falls back to `document.execCommand('copy')` for older browsers
- Handles columns without accessors via `row.original` fallback

## Column Definitions

### Right-Justified Headers for Numbers/Currency

For columns containing quantities or monetary values, use JSX header functions:

```typescript
{
  accessorKey: "total_value",
  header: () => <span className="w-full text-right block">Total</span>,
  cell: ({ row }) => (
    <span className="text-right block">
      {formatCurrency(row.getValue("total_value"))}
    </span>
  ),
}
```

### Formatting Functions

Located in `src/lib/library/types.ts`:

| Function | Description |
|----------|-------------|
| `formatCurrency(value)` | Formats number as USD currency |
| `formatNumber(value)` | Formats number with commas |
| `formatNiin(value)` | Formats NIIN with dashes |
| `formatAwardDate(value)` | Formats date for awards |
| `formatSamStatus(value)` | Maps SAM status codes to labels |
| `formatContactType(value)` | Maps contact type codes to labels |
| `formatFiscalYearEnd(value)` | Formats fiscal year end month |

## Input Component

The search input uses reduced padding for a more compact appearance:

```typescript
// src/components/ui/Input.tsx
className="w-full px-3 py-2 rounded-md border border-border ..."
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/library/vendor/search` | Search vendors by CAGE, UEI, or name |
| `GET /api/library/vendor/[cageCode]` | Get vendor details |
| `GET /api/library/vendor/[cageCode]/awards` | Get vendor awards |
| `GET /api/library/vendor/[cageCode]/bookings` | Get vendor bookings |
| `GET /api/library/vendor/[cageCode]/solicitations` | Get vendor solicitations |

## Responsive Design

- **Mobile**: Single column layouts, stacked cards
- **Tablet**: 2-column grids where appropriate
- **Desktop (lg+)**: Full 3-column Demographics layout, wide tables

## Styling Notes

1. **Use standard Tailwind classes** for dynamic styling (e.g., `bg-gray-50` not custom color variables with opacity)
2. **Cards** use `bg-gray-50 rounded-lg p-3` pattern
3. **Section headers** use `text-[10px] font-semibold text-muted uppercase tracking-wide`
4. **Data values** use `text-xs font-medium text-foreground`
5. **Monospace values** (codes) use `font-mono text-primary`
