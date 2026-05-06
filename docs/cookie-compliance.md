# Cookie Compliance

Customer-facing consent layer for `Government-Procurement-Library`. Visitors see a banner on first load, can opt in/out of categories, and can change their mind any time from the footer. Decision is persisted in a first-party cookie.

Scope today: there are no analytics or marketing trackers on this site — the banner discloses what we already store (auth + a few functional entries) and gates the functional storage behind opt-in. The architecture is ready for analytics/marketing tools to plug in later without re-architecting.

## Why we built it instead of using CookieYes / OneTrust / Cookiebot

A managed CMP earns its money when the cookie surface is large or unstable. Ours is six known first-party entries, all auditable in the repo, all listed in `/legal/cookies`. The fixed cost of integrating a third-party CMP (extra script tag, styling iframe, separate dashboard, billing) wasn't justified.

**Trip-wires that should make us revisit this decision:** adding GA4 / Google Tag Manager / Meta pixel / LinkedIn Insight / Hotjar / Intercom / any third-party `<script>`; selling into the EU/UK; crossing CCPA thresholds (~$25M rev / 100K consumers). Migration to a CMP from here is mostly drop-in — replace `<ConsentProvider>` with the vendor's `<Script>` tag and remove our banner/modal.

## File structure

```
src/
├── app/
│   ├── layout.tsx                            # ConsentProvider mounted here
│   └── legal/
│       ├── cookies/page.tsx                  # Cookie policy + inventory table
│       ├── privacy/page.tsx                  # Stub (placeholder pending counsel)
│       ├── terms/page.tsx                    # Stub
│       └── security/page.tsx                 # Stub
├── components/
│   ├── consent/
│   │   ├── ConsentBanner.tsx                 # First-visit bottom banner
│   │   └── ConsentSettingsModal.tsx          # Granular per-category toggles
│   ├── layout/
│   │   ├── CookiePreferencesLink.tsx         # Footer button that re-opens the modal
│   │   └── Footer.tsx                        # Adds Legal links + the prefs button
│   └── legal/
│       └── LegalPlaceholder.tsx              # Shared shell for stub legal pages
├── contexts/
│   └── ConsentContext.tsx                    # React provider + useConsent() hook
└── lib/
    └── consent/
        ├── types.ts                          # ConsentChoice, StoredConsent, version
        └── storage.ts                        # Cookie read/write + hasConsent()
```

## Data model

The visitor's choice lives in a first-party cookie:

| Property | Value |
|---|---|
| Name | `gph_cookie_consent` |
| Value | `encodeURIComponent(JSON.stringify({ version, choices, timestamp }))` |
| Path | `/` |
| Max-Age | 12 months (`60 * 60 * 24 * 365` seconds) |
| SameSite | `Lax` |
| Secure | Yes when served over HTTPS |
| HttpOnly | **No** — the React app reads it client-side |

`StoredConsent` shape (`src/lib/consent/types.ts`):

```ts
{
  version: 1,                        // CONSENT_VERSION constant
  choices: {
    necessary: true,                 // always true
    functional: boolean,
    analytics: boolean,
    marketing: boolean,
  },
  timestamp: "2026-05-05T12:34:56.000Z"
}
```

The cookie is treated as strictly necessary (we have to remember the choice to honor it) and isn't itself gated.

## Categories

| Category | Always on? | What gets gated today |
|---|---|---|
| **Strictly necessary** | Yes | `govt_proc_hub_access_token`, `govt_proc_hub_refresh_token`, `gph_cookie_consent` |
| **Functional** | Opt-in | `theme` (localStorage), `gph_pending_signup` (sessionStorage), `gph_waitlist` / `gph_waitlist_submitted` (localStorage) |
| **Analytics** | Opt-in | Nothing today — reserved for future tools |
| **Marketing** | Opt-in | Nothing today — reserved for future tools |

Stripe Checkout cookies are set on `stripe.com` (not our domain) so they're disclosed in `/legal/cookies` but not enforceable through this banner.

## How consent is checked

There are two access patterns depending on whether the caller is a React component or a plain module.

**Plain module / non-React** — `src/lib/consent/storage.ts`:

```ts
import { hasConsent } from "@/lib/consent/storage";

if (hasConsent("functional")) {
  localStorage.setItem("theme", value);
}
```

`hasConsent()` reads the cookie directly. Returns `false` when no choice has been made yet (safe default). Used today by:

- `src/contexts/ThemeContext.tsx` — gates the two `localStorage.setItem('theme', ...)` calls.
- `src/lib/signup/pendingSignup.ts` — `writePendingSignup()` returns early without writing if no functional consent.
- `src/app/trial/page.tsx` — gates the `gph_waitlist` writes.

**React component** — `src/contexts/ConsentContext.tsx`:

```ts
const { consent, openSettings, setConsent } = useConsent();
if (consent.functional) { /* ... */ }
```

`useConsent()` exposes:

| | |
|---|---|
| `consent` | Current `ConsentChoice`. SSR-safe default is "all rejected" until mount. |
| `hasDecided` | `true` once the visitor has saved a choice. False on first visit / SSR. |
| `setConsent(choice)` | Persist a custom choice (used by the settings modal). |
| `acceptAll()` / `rejectNonEssential()` | Convenience writers. |
| `openSettings()` | Open the settings modal — used by the footer button. |

## How the banner shows up

`<ConsentProvider>` wraps the rest of the app in `src/app/layout.tsx`. On mount it reads the cookie. If no record exists (or version mismatches), it renders `<ConsentBanner>` pinned to the bottom of the viewport. The banner is delayed until after mount via `useEffect` to avoid a hydration flash.

Three primary actions, all visually equal weight (GDPR convention — Reject must be no harder than Accept):

- **Accept all** → all categories on
- **Reject non-essential** → only necessary on
- **Customize** → opens `ConsentSettingsModal` with toggles

Saving from the modal persists the cookie and closes the banner.

## Adding a new cookie or storage entry

1. Decide which category it belongs to. If unsure, default to `functional`.
2. Gate the write site with `hasConsent('<category>')` (or `useConsent().consent.<category>` in components).
3. Add a row to the `COOKIES` table in `src/app/legal/cookies/page.tsx` so the policy stays accurate.
4. Add the cookie name to the relevant `examples` string in `src/components/consent/ConsentSettingsModal.tsx` so the per-category description on the modal matches reality.
5. If the new cookie materially changes what consenting *means* (e.g., introducing GA4 brings tracking nobody opted into when they consented to v1), bump `CONSENT_VERSION` in `src/lib/consent/types.ts`. Every visitor will be re-prompted on their next page load.

## Adding a third-party tracker (e.g. GA4) later

1. Bump `CONSENT_VERSION` so the re-consent banner appears for everyone.
2. Update the `analytics` (or `marketing`) row's `examples` in the settings modal.
3. Wrap the tracker initialization in `useConsent().consent.analytics === true` (or `hasConsent('analytics')` in non-component code). Don't load the script tag at all until consent is given — gating after the script loads doesn't satisfy GDPR.
4. Add a row to the `/legal/cookies` table per cookie the tracker will set.
5. **Strongly consider switching to a managed CMP at this point.** Maintaining a hand-curated list of third-party cookies stops being free as soon as you have more than one tracker.

## Verification

**First-visit flow** — incognito window, load `/`:
1. Banner slides up at the bottom.
2. Click **Reject non-essential** → banner closes, `gph_cookie_consent` cookie set with all-but-necessary `false`.
3. Toggle the theme switch — page changes but `localStorage.theme` is **not** written.

**Accept all flow** — clear cookies, reload, click **Accept all**:
1. Toggle theme → `localStorage.theme` *is* written.
2. Reload → theme persists.

**Re-open from footer** — click "Cookie preferences" in the footer:
1. Modal opens with current choice pre-selected.
2. Toggle and save → cookie updates without page reload.

**Versioning** — manually edit the stored cookie in DevTools to `version: 0`, reload:
1. Banner reappears as if it's a first visit.

**Stub pages** — visit `/legal/privacy`, `/legal/terms`, `/legal/security`, `/legal/cookies` from the footer:
1. All four render (no 404).
2. `/legal/cookies` shows the inventory table.
3. The other three show the "draft pending legal review" notice.

**Auth not gated** — log in:
1. Both `govt_proc_hub_access_token` and `govt_proc_hub_refresh_token` cookies are set regardless of consent state.

## Out of scope

- **Server-side consent log.** Worth adding (write a row to a `consent_events` table) when a regulator or auditor asks for proof. Not needed today.
- **Geo-aware variants.** Same banner for everyone. Audience is US; if EU/UK customers become real, revisit.
- **DSAR / "delete my data" workflow.** Covered by the contact form for now.
- **Translations.** English-only audience.

## What real-world legal text is still needed

The placeholder pages (`/legal/privacy`, `/legal/terms`, `/legal/security`) need real copy from counsel before we go to general availability. Each renders a yellow "draft pending legal review" notice in-page so anyone landing there sees that clearly.

`/legal/cookies` is intentionally NOT in this category — it's a technical disclosure (what we store, what for, how long), and the engineering team owns its accuracy. Update it whenever a cookie is added/removed.
