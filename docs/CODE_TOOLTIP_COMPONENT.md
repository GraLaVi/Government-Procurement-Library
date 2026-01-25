# CodeTooltip Component Documentation

## Overview

The `CodeTooltip` component provides a consistent, elegant tooltip implementation for displaying code definitions throughout the application. It matches the look and feel of tooltips used on the packaging information tab and provides a standardized way to display code information with hover tooltips.

## Location

**File:** `Government-Procurement-Library/src/components/library/PartDetail.tsx`

The component is defined at the top level of the file (after imports, before the `PartDetail` component) so it can be shared across all tabs.

## Usage

### Basic Example

```tsx
<CodeTooltip
  code="20"
  title="Acquisition Method Code (AMC)"
  content="This code indicates the method used to acquire the item..."
  codeType="AMC"
>
  <span className="text-primary underline decoration-dotted">20</span>
</CodeTooltip>
```

### With Null/Empty Content

If there's no tooltip content, the component will simply return the children without any styling:

```tsx
<CodeTooltip
  code=""
  title=""
  content=""
  codeType={null}
>
  <span>—</span>
</CodeTooltip>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `code` | `string` | Yes | The code value (e.g., "20", "1", "A"). Used to build the "learn more" link. |
| `title` | `string` | Yes | The tooltip title/header displayed in bold at the top (e.g., "Acquisition Method Code (AMC)"). |
| `content` | `string` | Yes | The tooltip content/description. Will be truncated at 150 characters if longer. |
| `codeType` | `string \| null` | Yes | The code type (e.g., "AMC", "SLC", "PIC"). If provided, creates a clickable link to the code definitions page. |
| `children` | `React.ReactNode` | Yes | The element that triggers the tooltip (typically the code value wrapped in a span). |

## Features

### 1. Smart Positioning
- Automatically positions tooltip above or below the trigger element based on available space
- Horizontally centers, left-aligns, or right-aligns based on viewport space
- Uses fixed positioning to avoid overflow clipping
- Ensures tooltip never goes off-screen

### 2. Content Truncation
- Content is truncated at 150 characters
- Shows "Click to learn more" link when content is truncated and `codeType` is provided
- Full content is still available via the native `title` attribute

### 3. Clickable Links
- When `codeType` is provided, the code value becomes a clickable link
- Link opens the code definitions page in a new tab
- URL format: `/library/code-definitions?code_type={codeType}&code_value={code}`

### 4. Styling
- **Header Section**: Bold text with `bg-muted-light` background
- **Content Section**: Regular text with padding
- **Border**: Rounded corners with shadow
- **Trigger Element**: Primary color with dotted underline (becomes solid on hover)

## Visual Structure

```
┌─────────────────────────────────────┐
│  Title (Bold, Gray Background)     │  ← Header section
├─────────────────────────────────────┤
│  Content text here...               │  ← Content section
│  (truncated if > 150 chars)         │
│                                     │
│  ─────────────────────────────      │  ← Divider (if truncated)
│  Click to learn more                │  ← Footer (if truncated)
└─────────────────────────────────────┘
```

## CSS Classes Used

### Tooltip Container
- `fixed w-72 max-w-[90vw]` - Fixed positioning, 288px width, max 90% viewport width
- `text-xs rounded shadow-lg` - Small text, rounded corners, shadow
- `bg-card-bg border border-border` - Background and border colors
- `text-foreground` - Text color

### Header Section
- `font-bold px-2 py-1.5` - Bold text with padding
- `bg-muted-light text-foreground` - Background and text colors

### Content Section
- `p-2` - Padding
- `mt-2 pt-2 border-t border-border` - Footer divider styling (when truncated)
- `text-muted text-[11px]` - Footer text styling

### Trigger Element
- `text-primary` - Primary color
- `underline decoration-dotted hover:decoration-solid` - Underline styling
- `cursor-help` or `cursor-pointer` - Cursor style

## Implementation Details

### State Management
- Uses `useState` for tooltip visibility and positioning
- Uses `useRef` for DOM element references
- Uses `useEffect` to calculate position when tooltip becomes visible

### Positioning Algorithm
1. Calculates available space on all sides of the trigger element
2. Prefers showing tooltip above the trigger
3. Falls back to below if insufficient space above
4. Horizontally centers when possible, otherwise aligns to left or right
5. Ensures tooltip stays within viewport bounds (8px margin)

### Accessibility
- Includes `title` attribute for native browser tooltip fallback
- Includes `aria-label` for screen readers
- Maintains keyboard navigation support

## Examples in Codebase

### Overview Tab (PartDetail.tsx)
```tsx
const renderCodeWithTooltip = (code: string | null, codeType: string, label: string) => {
  // ... lookup definition logic ...
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted font-medium">{label}</span>
      <span className="text-sm font-mono font-semibold">
        {code ? (
          <CodeTooltip
            code={code}
            title={`${label} (${codeType})`}
            content={definition}
            codeType={codeType}
          >
            <span className="text-primary underline decoration-dotted hover:decoration-solid">
              {code}
            </span>
          </CodeTooltip>
        ) : (
          <span className="text-muted">—</span>
        )}
      </span>
    </div>
  );
};
```

### Packaging Tab (PartDetail.tsx)
```tsx
const renderCode = (code: string | null, fieldName: string, uniqueId: number) => {
  const codeType = CODE_TYPE_MAP[fieldName] || null;
  const definition = getCodeDefinition(code, codeType);
  const title = codeType ? CODE_TYPE_TITLES[codeType] || '' : '';
  const content = definition && codeType 
    ? `${codeType} ${code}: ${definition}`
    : definition || '';

  if (definition) {
    return (
      <CodeTooltip
        code={code}
        title={title}
        content={content}
        codeType={codeType}
      >
        <span>{code}</span>
      </CodeTooltip>
    );
  }
  return <span className="text-primary">{code}</span>;
};
```

## Code Type Mappings

When using `CodeTooltip`, ensure you're using the correct code types that match the `library_code_definitions` table:

- **DLA/IDS**: `'IDS'` - Item Description Segment (for `ids_indicator` field)
- **AMC**: `'AMC'` - Acquisition Method Code (for `acquisition_method_code` field)
- **PIC**: `'PIC'` - Procurement Info Code (for `pi_code` field)
- **SLC**: `'SLC'` - Shelf Life Code (for `shelf_life_code` field)
- **PMC**: `'PMC'` - Preservation Method Codes
- **CPMC**: `'CPMC'` - Contact Preservative Material Codes
- **WMC**: `'WMC'` - Wrapping Material Codes
- **CDMC**: `'CDMC'` - Cushioning and Dunnage Material Codes
- **TCDC**: `'TCDC'` - Thickness of Cushioning or Dunnage Codes
- **UICC**: `'UICC'` - Unit and Intermediate Container Codes
- **OPIC**: `'OPIC'` - Optional Procedure Indicator Codes
- **CPC**: `'CPC'` - Cleaning Procedure Codes
- **QUPC**: `'QUPC'` - Quantity Per Unit Pack Codes

## Special Handling

### AMC Codes
AMC codes are 2 characters where:
- First character maps to AQM (Acquisition Quality Method)
- Second character maps to AMS (Acquisition Method Source)

The tooltip will show both definitions if available:
```
AQM X: [definition] / AMS Y: [definition]
```

## Best Practices

1. **Always provide meaningful titles** - Use descriptive titles like "Acquisition Method Code (AMC)" rather than just "AMC"

2. **Handle null/empty codes gracefully** - Check if code exists before rendering tooltip

3. **Use consistent styling** - Wrap code values in spans with consistent classes

4. **Provide codeType when available** - This enables the "learn more" link functionality

5. **Keep content concise** - While truncation is handled, aim for clear, concise descriptions

## Troubleshooting

### Tooltip not appearing
- Check that `content` is not empty
- Verify `codeType` and `code` values match what's in `library_code_definitions`
- Check browser console for errors

### Tooltip positioning issues
- Tooltip uses fixed positioning, so it should work even in scrollable containers
- If tooltip appears off-screen, check viewport calculations in the positioning logic

### Link not working
- Ensure `codeType` is provided (not `null`)
- Verify the code definitions page route exists
- Check that URL encoding is correct

## Related Files

- `Government-Procurement-Library/src/components/library/PartDetail.tsx` - Component definition and usage
- `Government-Procurement-Library/src/app/library/code-definitions/page.tsx` - Code definitions page
- `ALAN-FastAPI-Web/src/api/v1/library/parts/service.py` - Backend code definitions service
- `ALAN-FastAPI-Web/src/api/v1/library/parts/controller.py` - Code definitions API endpoint
