// How vendor/part detail sections are presented. Stored in
// user_preferences.results_layout and read by VendorDetail / PartDetail.
//
//   "tabs"   → one section at a time (the historical default)
//   "linear" → a one-pager: every section stacked, with a sticky jump-rail
//
// A single shared preference drives both the vendor and the part detail view.

import type { UserPreferences } from "@/lib/preferences/types";

export type ResultsLayout = "tabs" | "linear";

export const RESULTS_LAYOUT_DEFAULT: ResultsLayout = "tabs";

export const RESULTS_LAYOUT_OPTIONS: ReadonlyArray<{
  value: ResultsLayout;
  label: string;
  description: string;
}> = [
  {
    value: "tabs",
    label: "Tabs",
    description:
      "Show one section at a time. Compact — each section loads when you open its tab.",
  },
  {
    value: "linear",
    label: "One page",
    description:
      "Stack every section on a single scrollable page with a jump-to nav. See the whole record at once; print or export it all together.",
  },
];

export function resolveResultsLayout(
  prefs: UserPreferences | null | undefined,
): ResultsLayout {
  return prefs?.results_layout === "linear" ? "linear" : RESULTS_LAYOUT_DEFAULT;
}
