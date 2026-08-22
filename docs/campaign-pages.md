# Campaign Landing Pages (`/start`)

Marketing campaign landing pages: one page per campaign, each showing exactly
what the visitor is about to buy — product, price, billing period, trial — with
the CAGE field right there to start signup. This document is the maintainer's
guide: what exists, where it lives, and how to launch or change a campaign.

## Why it exists

Campaigns used to link straight into the signup form:

```
/signup?plan=4&seats=1&next=%2Fpricing%3Fplan%3D4%26seats%3D1&tier=advanced
```

Three problems with that link:

1. **The visitor was never told what they were buying.** `/signup` only shows
   its "You're signing up for…" badge on step 2, after the CAGE check. Someone
   arriving cold from an email saw a bare CAGE field, then filled in name,
   email, password and accepted the ToS before Stripe Checkout showed them the
   first dollar figure — for what was, in that link, a $1,008/year commitment.
2. **`plan=4` is a database row id, not a stable identifier.** `ProductPrice.id`
   differs per environment (dev's Advanced prices are 15/16, prod's are 3/4) and
   is recreated by a catalog re-sync. A campaign email built on one is silently
   wrong the moment that happens, and the visitor only finds out after
   completing the entire form.
3. **`next=` did nothing.** Nothing in the codebase reads it. It was copied out
   of the URL `/pricing` builds, where it is also never consumed.

`/start/<slug>` fixes all three: a stable URL, copy that states the offer up
front, and a price id resolved from the live catalog at render time.

## What it is

- A page per campaign at **`/start/<slug>`**.
- Content authored as markdown in `src/content/campaigns/`, with an allowlist
  registry in `src/lib/campaigns.ts` — the same pattern as the Help Center
  (`src/lib/help.ts` + `src/content/help/`).
- **Public.** `/start` is in `AUTH_CONFIG.ROUTES.PUBLIC`
  (`src/lib/auth/config.ts`); the prefix match in `src/proxy.ts` extends that to
  every `/start/<slug>`. Without the entry these pages 307 to `/login`, which
  for the top of a paid funnel is fatal.
- **Prices are never authored.** The markdown names *what* is sold
  (`offer_product`, `offer_interval`, `offer_seats`); every figure on the page —
  amount, per-month equivalent, annual saving, trial length — is computed from
  `GET /billing/plans` at render time.

## File map

| Path | Role |
|---|---|
| `src/lib/campaigns.ts` | **Single source of truth** — slug registry (route allowlist) plus `parseCampaignFrontmatter`, which validates the offer fields and throws on anything malformed. |
| `src/content/campaigns/<slug>.md` | Campaign copy + YAML frontmatter. The file marketing edits. |
| `src/app/start/[slug]/page.tsx` | Server route: loads the markdown, fetches the catalog, resolves every interval, `generateMetadata`. |
| `src/components/campaign/CampaignLanding.tsx` | Client page: selling copy, offer card, CAGE entry, handoff to `/signup`. |
| `src/lib/billing/resolveOffer.ts` | Turns `(product key, interval, seats)` into a current price id and the money to print. Also `resolveOfferVariants`, which prices every interval a product sells. |
| `src/lib/billing/catalog.ts` | Server-side read of `GET /billing/plans`. |
| `src/lib/signup/validateCage.ts` | CAGE eligibility check shared with `/signup` step 1, so the two can't drift on what a 503 means. |

## Launching a campaign

1. Add `src/content/campaigns/<slug>.md`:

   ```yaml
   ---
   title: The complete procurement picture     # on-page H1
   eyebrow: Limited launch offer               # optional pill above the H1
   cta_label: Check my CAGE code               # optional button label
   offer_product: library_search_advanced      # products.key
   offer_interval: annual                      # monthly | quarterly | semiannual | annual
   offer_seats: 1
   meta_title: Advanced Procurement Intelligence — Annual   # optional SEO title
   description: Full procurement history…      # optional meta description
   ---

   Selling copy paragraph.

   - Benefit bullet
   - Benefit bullet
   ```

2. Add the slug to `CAMPAIGNS` in `src/lib/campaigns.ts`. **A markdown file
   alone does not publish a page** — the registry is the allowlist, so a
   half-finished draft can sit on disk safely.
3. Open a PR, merge, deploy. The page is live at `/start/<slug>`.

Naming convention: `<tier>-<interval>-<campaign>`, e.g. `advanced-annual-q4`,
`basic-monthly-linkedin`. It reads well in analytics and the slug states what
the page sells.

## URLs to use in campaigns

```
https://www.gphusa.com/start/advanced-annual-q4                  # the file's own interval
https://www.gphusa.com/start/advanced-annual-q4?interval=monthly # same copy, monthly price
```

`?interval=` switches which price the page quotes and which price id is carried
into checkout. Every interval the product sells is priced in the same catalog
fetch, so switching costs no extra round trip. An unknown or unsold value falls
back to the file's `offer_interval` rather than rendering nothing.

Use `?interval=` to A/B the billing period on identical copy. When the *copy*
differs — different audience, headline, or bullets — make a new markdown file
instead, so the slug doesn't lie about what the page sold.

`utm_*` parameters can be appended freely; nothing collides with them. Note they
currently stop at the campaign page — carrying them through signup into the
Stripe session is not implemented.

## Handoff to signup

Continue navigates to:

```
/signup?tier=<slug>&plan=<resolved price id>&seats=<n>&cage=<CODE>
```

`/signup` accepts `?cage=`, re-validates it server-side (the query string is
visitor-editable, so the code still has to earn its way past the eligibility
API) and drops onto step 2. An ineligible or tampered code just leaves the
visitor on step 1 with the normal error. Existing `/signup?plan=…` links
without `?cage=` are unaffected.

## Rendering mode — why `force-dynamic`

`/start/[slug]` is rendered per request, not prerendered. This is deliberate and
worth not "optimising" back to SSG.

`next build` loads `.env.production`, whose `INTERNAL_API_URL` points at the
prod-internal address. A build host that cannot reach it prerenders the page
with **no offers at all** — and with ISR that priceless page is then served for
a full revalidate window after every deploy. A campaign page without a price is
the exact failure this route exists to prevent.

Per-request rendering removes the build-time dependency. It is not expensive:
`fetchCatalog` caches in the Data Cache for an hour, so it costs one upstream
call per hour, not one per visitor.

## Failure modes

| Condition | Behaviour | Why |
|---|---|---|
| Billing service unreachable | Page renders; offer card degrades to a "See current plans and pricing" link to `/pricing`. Logged via `console.error`. | A billing blip should not take a marketing page down, and inventing a figure is worse than linking to the live one. |
| `offer_product` / `offer_interval` not in the catalog | Throws. | A typo in a campaign file. A 500 is a far louder signal than quietly serving a page with the price missing. |
| Malformed or missing frontmatter | Throws, naming the file and the field. | Same reasoning. |
| Slug not in `CAMPAIGNS` | `notFound()`. | The registry is the allowlist. |
| Registered slug, missing markdown | `notFound()`, logged. | Half-finished launch; the registry entry is the thing to fix. |

## Known issue: unknown slugs return HTTP 200

`/start/does-not-exist` returns **200** with the "This page could not be found"
body. So do `/help/does-not-exist` and `/legal/does-not-exist` — this is
pre-existing, app-wide behaviour, confirmed in dev and under
`node .next/standalone/server.js` (what the Dockerfile runs).

Cause: the root layout's shell streams and commits the 200 status before the
page's `notFound()` resolves, so Next can only render 404 *content* into an
already-committed response. It is not the prerender cache — it reproduces under
`force-dynamic` with `Cache-Control: no-store`.

Consequence for campaigns: a typo'd campaign URL can be indexed as real content,
and broken campaign links won't show up in 404 monitoring. Fixing it properly
means a `not-found.tsx` that doesn't sit behind the `AuthProvider` gate
(`src/contexts/AuthContext.tsx` renders `{hasInitialized ? children : spinner}`).
Tracked as follow-up work; it does not block a launch.

## Related changes outside `/start`

`/signup` previously hardcoded a tier→name map that had drifted from the
catalog — it said "Parts and Vendor Library — Advanced" while the catalog,
`/pricing` and `/account/billing` all said "Procurement Intelligence —
Advanced". That map is gone; the badge now resolves the product name from
`GET /billing/plans` by the `?plan=` price id, and quotes the price alongside
it. For a visitor arriving straight from a campaign link, that badge may be the
first figure they see.
