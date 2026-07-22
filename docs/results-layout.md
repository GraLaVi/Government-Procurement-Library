# Results layout: Tabs vs. One-pager

This document describes the **results layout** preference that lets a user render
vendor and part **detail** views either as tabs (the historical default) or as a
single scrollable one-pager. Introduced in commit `c0fe123` (2026-07-21).

## Overview

The layout preference controls how the sections of a detail view
(`VendorDetail`, `PartDetail`) are presented:

- **Tabs** (`"tabs"`) — one section at a time, mirroring the historical
  `Tabs`/`TabPanel` markup. Each section loads lazily when its tab is opened.
- **One page** (`"linear"`) — every section stacked on a single scrollable page
  with a sticky jump-rail (scroll-spy). The whole record can be printed or
  exported together.

A single shared preference drives **both** the vendor and the part detail view.
The user-facing control lives on **Account → Preferences** as the **"Results
layout"** setting ("Tabs" / "One page"); default is Tabs.

## Storage & resolution

- Preference key `results_layout: 'tabs' | 'linear'` is stored in the existing
  `customer_user_preferences.preferences` JSONB blob. **No migration and no new
  endpoint** — it reuses `usePreferences()` and the `/account/preferences` flow.
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
- `DetailToolbar` (advanced tier) renders in **both** layouts: Print in both,
  "Export all" (combined CSV) in one-page mode only.

`VendorDetail` and `PartDetail` read the resolved `layout`, build the `sections`
array from their tier-filtered tabs, and — when linear — fire **all**
tier-permitted lazy fetches on mount (guarded by the existing `*Fetched` flags)
plus the same track-view audit event.

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
`.library-detail-print-root` (a class on each detail card root); the jump-rail is
marked `.no-print`.

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
(see `docs/products_roles.md`). The layout toggle itself is available to all
tiers.

## Known UX gap

`usePreferences()` fetches on detail mount, so a linear-preference user may see a
one-frame tabs flash before prefs resolve (tabs is the default). This could be
removed by caching the layout in a context or localStorage.

## Related docs

- `docs/vendor_search_ui.md` — vendor search page implementation
- `docs/help-center.md` — Help Center structure; user-facing coverage of this
  feature lives in the `account-settings`, `vendor-research`, and `parts-search`
  help articles.
