# Results layout: Tabs vs. One-pager

This document describes the **results layout** preference that lets a user render
vendor and part **detail** views either as tabs (the historical default) or as a
single scrollable one-pager. Introduced in commit `c0fe123` (2026-07-21); the
per-record toggle was added in `ee85cb1` (2026-09-16).

## Overview

The layout preference controls how the sections of a detail view
(`VendorDetail`, `PartDetail`) are presented:

- **Tabs** (`"tabs"`) — one section at a time, mirroring the historical
  `Tabs`/`TabPanel` markup. Each section loads lazily when its tab is opened.
- **One page** (`"linear"`) — every section stacked on a single scrollable page
  with a sticky jump-rail (scroll-spy). The whole record can be printed or
  exported together.

A single shared preference drives **both** the vendor and the part detail view.
It can be set from two places — **Account → Preferences** ("Results layout":
"Tabs" / "One page") and the toggle on any detail record (below). Both write the
same preference key, so they can never disagree. Default is Tabs.

## Storage & resolution

- Preference key `results_layout: 'tabs' | 'linear'` is stored in the existing
  `customer_user_preferences.preferences` JSONB blob. **No migration and no new
  endpoint** — it reuses `usePreferences()` and the `/account/preferences` flow.
- Read/write hook: `src/lib/hooks/useResultsLayout.ts` (`useResultsLayout`) —
  returns the layout in force plus a `changeLayout` setter. See below.
- Resolver: `src/lib/preferences/resultsLayout.ts`
  (`resolveResultsLayout`, `RESULTS_LAYOUT_OPTIONS`, `RESULTS_LAYOUT_DEFAULT`).
  Default is `tabs`; anything other than the literal `"linear"` resolves to tabs.
- Type declared in `src/lib/preferences/types.ts`.

## Shared renderer

`src/components/library/DetailSections.tsx` renders both modes from a single
`sections` array:

- **Tabs mode** reproduces the previous tab UI.
- **One-page mode** renders a sticky jump-rail (IntersectionObserver scroll-spy,
  keyed on section id) plus each section as its own elevated card
  (`bg-card-bg`, border, rounded, shadow) on an inset `bg-background` panel with
  a tinted header strip.
- The `toolbar` slot renders in **both** layouts, in the same right-hand
  position. It holds the ungated layout toggle plus, on the advanced tier,
  `DetailToolbar`: Print in both layouts, "Export all" (combined CSV) in
  one-page mode only. See [Per-record toggle](#per-record-toggle).

`VendorDetail` and `PartDetail` read the resolved `layout`, build the `sections`
array from their tier-filtered tabs, and — when linear — fire **all**
tier-permitted lazy fetches on mount (guarded by the existing `*Fetched` flags)
plus the same track-view audit event.

## Per-record toggle

`ResultsLayoutToggle` (exported from `DetailSections.tsx`) is an icon-only
segmented control — a tab-strip glyph and a stacked-sections glyph, rendered
from `RESULTS_LAYOUT_OPTIONS` — that switches the layout of the record you are
currently looking at. It is sized to `toolbarButtonClass` so it sits flush
beside Print, and carries `role="group"` / `aria-pressed` with `sr-only` labels.

`useResultsLayout()` backs it:

- The layout is **derived**, not seeded into state: `override ?? resolveResultsLayout(preferences)`.
  `usePreferences()` fetches on mount, so seeding into `useState` would either
  need an effect or let an in-flight GET snap the layout back after a click.
  Before any click the layout tracks the preference as it arrives; after one the
  override wins.
- `changeLayout` sets the override **and** PUTs `results_layout` through
  `updatePreferences`. The toggle *is* the preference, just reachable from the
  record — which is why the preferences page never disagrees with the last
  choice made here.
- The write is **best-effort** (`.catch(() => {})`). Detail pages render for
  signed-out visitors, whose PUT 401s; their switch still works for the session,
  and there is nothing to roll back because the layout already switched on
  screen and `usePreferences` has logged the failure.

### Toolbar composition

`toolbar` is now passed in **both** layouts and by **all** tiers — the toggle is
ungated, and `DetailToolbar` (Print / Export all) is conditionally rendered
*inside* it for Advanced:

```tsx
const toolbar = (
  <>
    <ResultsLayoutToggle layout={layout} onChange={changeLayout} />
    {tierMeets(tier, "advanced") && <DetailToolbar ... />}
  </>
);
```

`LinearSections` wraps the slot in `flex items-center gap-2` so the two controls
read as one cluster. Both layouts render the cluster in the same right-hand
position, so the toggle stays under the cursor across a switch.

## Print

Print works from **both** layouts:

1. The detail components hold `expandForPrint` / `printRequested` /
   `preparingPrint` state and a `loadAllSections()` that `Promise.all`s the
   tier-permitted fetches.
2. `handlePrint` awaits load-all, flips the effective layout to `linear` (so
   every section is mounted), then `requestAnimationFrame(() => window.print())`.
3. An `afterprint` listener resets `expandForPrint`, returning to the tab view.
   The button shows "Preparing…" while sections load.

`@media print` rules in `globals.css` use a visibility trick scoped to
`.print-root` (a class on each detail card root — also used by the RFQ detail
page); the jump-rail is marked `.no-print`. Companion classes: `.no-print`
(hidden on paper) and `.print-only` (hidden on screen).

## CSV export

CSV helpers were extracted to `src/lib/library/csv.ts`
(`buildCsv`, `escapeCsvCell`, `triggerDownload`, `todayIsoDate`, and the new
`buildCombinedCsv`). `ExportCsvButton.tsx` re-exports `CsvColumn` for
back-compat and now shows a "Downloaded" confirmation. The combined "Export all"
CSV only covers sections that declare `*_CSV_COLUMNS` specs
(awards / bookings / solicitations for vendors; procurement / solicitations for
parts).

## Tier gating

Print, per-section CSV, and combined "Export all" are Advanced-tier features
(see `docs/products_roles.md`). Choosing a layout is not gated: both the
Preferences setting and the per-record toggle are available on every tier —
including to signed-out visitors, for whom the choice simply isn't persisted.

## Known UX gap

`usePreferences()` fetches on detail mount, so a linear-preference user may see a
one-frame tabs flash before prefs resolve (tabs is the default). The per-record
toggle does not change this — it overrides only after a click, and an
un-clicked record still waits on the fetch. This could be removed by caching the
layout in a context or localStorage.

## Related docs

- `docs/vendor_search_ui.md` — vendor search page implementation
- `docs/help-center.md` — Help Center structure; user-facing coverage of this
  feature lives in the `account-settings`, `vendor-research`, and `parts-search`
  help articles.
