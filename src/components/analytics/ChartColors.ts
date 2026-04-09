/**
 * Shared color palette for analytics charts.
 * Uses CSS custom properties for theme-awareness where possible,
 * with fallback hex values for Recharts (which needs concrete values).
 */

// Primary chart colors (works on both light and dark backgrounds)
export const CHART_COLORS = {
  primary: '#3B82F6',     // blue-500
  secondary: '#10B981',   // emerald-500
  tertiary: '#F59E0B',    // amber-500
  quaternary: '#8B5CF6',  // violet-500
  quinary: '#EC4899',     // pink-500
  senary: '#06B6D4',      // cyan-500
} as const;

// DLA agency colors for bookings chart
export const AGENCY_COLORS = {
  dscp: '#3B82F6',  // blue - Philadelphia
  dscr: '#10B981',  // emerald - Richmond
  dscc: '#F59E0B',  // amber - Columbus
  other: '#8B5CF6', // violet - Other
} as const;

// Set-aside donut chart colors
export const SET_ASIDE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#EF4444', '#84CC16',
  '#F97316', '#6366F1',
] as const;

// Format large dollar amounts
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '$0';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

// Format numbers with commas
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '0';
  return value.toLocaleString();
}
