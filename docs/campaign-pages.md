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
- **A campaign may sell several products at once.** A *basket* campaign puts a
  tier and its add-ons on one Stripe subscription — one billing cycle, one
  trial clock, one total. Baskets are declared in `CAMPAIGNS`, not in the
  markdown; see [Basket campaigns](#basket-campaigns-several-products-one-subscription).

## Live campaigns

| Slug | What it sells | Interval | Where the offer is declared |
|---|---|---|---|
| `advanced-annual-q4` | Advanced + RFQ Add-on + GPH Analytics Add-on, 1 seat | annual | `basket` in `CAMPAIGNS` — **and mirrored in the API** |

### The slug does not describe the offer

`advanced-annual-q4` reads as "Advanced, annual, Q4". It sells three products.

That is deliberate and it is the one place this document's naming rule is
broken on purpose: the URL was already in email and paid social, and marketing
chose to move the all-access trial onto it rather than run a second URL. The
campaign it originally carried — Advanced alone, sold on the annual discount —
no longer exists anywhere.

Two consequences worth knowing before reading anything into this campaign:

- **Read the basket, never the slug**, in either registry. Both carry a `note`
  saying so.
- **Landing counts for this URL span both offers.** Visits are logged to
  `activity_log` with `resource_id = <slug>`, so rows from the old
  Advanced-only campaign and the new all-access one share a key. They split
  cleanly on `created_at` at the cutover — record that date when it ships,
  because nothing in the data marks it. (Dev had no landings recorded at all
  at the time of the change; check prod before assuming the same.)

### `/start/advanced-annual-q4`

The all-access trial: every product we sell, on one 14-day trial, no card up
front. It is the first *basket* campaign — three products as three line items
on a single Stripe subscription.

What the visitor gets:

- The H1 from `title`, with `{trial_days}` filled from the tier's
  `default_trial_days`, so the headline can only ever quote the trial the
  offer card is selling.
- A **product row** for each of the three products — see
  [Product rows](#product-rows).
- An offer card naming the three products, then the offer in the order it
  actually happens: `Free for 14 days · no card required`, the price anchored
  **per month**, and the annual total on the line below it.
- A CAGE field. A code that clears eligibility hands off to
  `/signup?campaign=advanced-annual-q4&cage=<CODE>`.

The trial length is the **tier's**, not the add-ons'. One subscription has one
trial clock, so `resolveBundle` reads `default_trial_days` off
`library_search_advanced` and ignores what the add-ons declare — quoting an
add-on's own would promise a second trial that does not exist.

### Why the card reads the way it does

The card is deliberately ordered trial → per-month → annual total, and the
product list carries **no per-item prices**. All three choices are about the
same thing: how many dollar figures a visitor passes before the CAGE field.

- **The trial leads.** It is what happens at checkout — a charge of zero. The
  H1 says it too, but the H1 scrolls away; on mobile the card sits below the
  entire body copy, and on desktop it stays stuck to the viewport long after
  the headline is gone.
- **The price is anchored per month** (`$192.83/mo`), with `then $2,314.00
  billed annually` directly beneath. The plan still *sells* annually — only
  the emphasis changed. A per-month figure is one a supplier can weigh against
  what the products save them; the annual total is purchase-order-sized, and
  leading with it invites "let me think about it" on a page whose entire offer
  is that thinking about it is free.
- **The total is never hidden.** It sits one line down, in the same breath as
  when it is charged. A price the visitor meets late reads as a price we were
  hiding — and `/signup` quotes the full figure on its badge one click from
  here regardless.
- **The items are not priced.** There is no bundle discount, so per-item
  figures sum to exactly the total below them: three more dollar amounts in
  the reader's path, and no information. The names are the value. If a basket
  is ever genuinely discounted, itemise it again — then the list is showing a
  saving rather than repeating a cost. That discount has to come from Stripe
  (a coupon or a bundle price), not from arithmetic on this page.

A single-product campaign renders the same card, minus the product list. On a
campaign that sells *monthly*, the per-month figure is already the charge, so
the "billed …" line is dropped rather than restating it, and the
"Save … vs. paying monthly" badge doesn't render at all.

### Product rows

A basket campaign lists one **row** per product: a small icon, the product's
name, an `Included` pill, a one-line summary, and three features set inline
underneath. All three sit inside **one** bordered container under a
`What's included` label, separated by hairline rules — one card holding three
rows, never a card each.

The container is transparent rather than filled: it sits on the page ground so
it doesn't compete with the offer card's filled surface beside it.

| Part of the row | Comes from |
|---|---|
| Name | The **catalog** — `productName` on the resolved offer |
| Icon, summary, features | `CAMPAIGN_PRODUCT_COPY` in `CampaignLanding.tsx`, keyed by `products.key` |

Rows rather than cards, after a round of layout studies: three bordered cards
read as three separate purchases sitting side by side — the opposite of the
one plan the offer card is selling — and pushed the CAGE field below the fold
on a laptop, which is the only action the page has. Weight and the icon do the
separating the boxes were doing, at roughly a third of the height, and the one
remaining border says the thing the three borders contradicted: this is a
single plan.

Three features, not five. They set inline under the summary, and a fourth
wraps onto a line that reads as a list nobody finishes. What was cut is one
link away — see [The one link off the page](#the-one-link-off-the-page).

Taking the name from the catalog means a row cannot describe a product
differently from the one being sold. The basket includes `request_for_quote`,
so the row says "RFQ Add-on" and carries that product's copy — it cannot
quietly promise `request_for_quote_enterprise`'s feature list. (That product
is live and publicly purchasable, and rendered nowhere in the marketing UI —
tracked separately.)

The pill says `Included`, not the catalog's "Add-on": on this page all three
are part of what the trial hands over, and two of them being add-ons is a
billing fact rather than something the visitor is choosing.

A product with no `CAMPAIGN_PRODUCT_COPY` entry still renders — catalog name,
no summary, no features. That is the right failure for a page that must not
invent claims about a product nobody has written copy for.

Single-product campaigns get no rows. The offer card already names the one
thing on offer, and a lone row repeating it is the same sentence twice.

### An empty markdown body is fine

`advanced-annual-q4.md` is frontmatter and nothing else. Its lead
paragraph was dropped as saying less than the rows below it, and its product
bullets *became* those rows. The file still earns its place: it owns the H1,
the eyebrow, the CTA label, the interval, the seat count and the SEO fields.

`CampaignLanding` skips the markdown block entirely when the body is empty, so
there is no stray spacing where the prose used to be.

### The one link off the page

A single `Compare all plans →` to `/pricing#compare`, last in the column. It
is also where the features the rows had to drop went.

Feature-by-feature comparison lives on `/pricing`, which already has the
table — a second one here would turn a page with a single action into a page
with a decision. For the same reason the rows carry no per-product
`See pricing →` link: three more exits, next to the CAGE field.

## File map

| Path | Role |
|---|---|
| `src/lib/campaigns.ts` | **Single source of truth** — slug registry (route allowlist) plus `parseCampaignFrontmatter`, which validates the offer fields and throws on anything malformed. |
| `src/content/campaigns/<slug>.md` | Campaign copy + YAML frontmatter. The file marketing edits. |
| `src/app/start/[slug]/page.tsx` | Server route: loads the markdown, fetches the catalog, resolves every interval, `generateMetadata`. |
| `src/components/campaign/CampaignLanding.tsx` | Client page: headline, product rows, offer card, CAGE entry, handoff to `/signup`. Also `CAMPAIGN_PRODUCT_COPY`, the per-product row copy. |
| `src/lib/billing/resolveOffer.ts` | Turns `(product key, interval, seats)` into a current price id and the money to print. Also `resolveOfferVariants`, which prices every interval a product sells, and `resolveBundle`/`resolveBundleVariants`, which do the same for a basket. |
| `src/lib/billing/catalog.ts` | Server-side read of `GET /billing/plans`. |
| `src/lib/signup/validateCage.ts` | CAGE eligibility check shared with `/signup` step 1, so the two can't drift on what a 503 means. |
| `src/lib/campaignLanding.ts` | Server-side landing count — see [Counting landings](#counting-landings). |
| **`ALAN-FastAPI-Web/src/billing/campaigns.py`** | *Other repo.* The basket registry that decides what is **charged**. Must carry the same slug as `CAMPAIGNS` here. |

## Launching a campaign

1. Add `src/content/campaigns/<slug>.md`:

   ```yaml
   ---
   title: "Free for {trial_days} days. No card required."   # on-page H1
   title_no_trial: The complete procurement picture         # H1 when no trial to quote
   eyebrow: Limited launch offer               # optional pill above the H1
   cta_label: Start my free trial              # optional button label
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

   **Leading with the trial.** A headline may quote the trial length with the
   `{trial_days}` placeholder — the sentence is yours to edit, the number
   comes from the catalog, so the H1 can never disagree with the offer card
   beside it. Using the placeholder makes `title_no_trial` required: it is
   the headline shown when there is no figure to quote (billing unreachable,
   or a price that sells without a trial). Quote the value in YAML, since it
   contains braces. Nothing else may carry a figure — a price written into
   `title` or `description` is still a price that can go stale.

2. Add the slug to `CAMPAIGNS` in `src/lib/campaigns.ts`. **A markdown file
   alone does not publish a page** — the registry is the allowlist, so a
   half-finished draft can sit on disk safely.
3. Selling more than one product? Add the `basket` to that same entry and the
   matching entry to the API's registry — see
   [Basket campaigns](#basket-campaigns-several-products-one-subscription).
   Give each product an entry in `CAMPAIGN_PRODUCT_COPY` while you're there,
   and leave the markdown body empty: the rows say what the bullets would.
4. Open a PR, merge, deploy. The page is live at `/start/<slug>`.

Naming convention: `<tier>-<interval>-<campaign>`, e.g. `advanced-annual-q4`,
`basic-monthly-linkedin`. It reads well in analytics and the slug states what
the page sells.

The live campaign breaks that rule — see
[The slug does not describe the offer](#the-slug-does-not-describe-the-offer).
Breaking it is a decision to take knowingly, not a precedent: it costs the
ability to read the offer off an analytics row, and it permanently blends the
counts for whatever the URL sold before. Reusing an in-market URL is the only
reason that has been judged worth it.

## Basket campaigns (several products, one subscription)

A basket sells a tier plus add-ons as several line items on **one** Stripe
subscription, so they share a billing cycle, a trial clock and an invoice.

It is declared in TypeScript rather than in the markdown, because unlike a
single-product campaign a basket is not something marketing can launch on its
own — the same basket has to exist in the API — and because `/signup` needs to
name the products on its confirmation badge, which it cannot do from a file it
never reads.

```ts
{
  slug: "advanced-annual-q4",
  note: "All-access trial: Advanced + RFQ + Analytics on one 14-day trial…",
  basket: {
    // Leads the offer card, owns the trial, and is the first line item.
    tierProductKey: "library_search_advanced",
    addonProductKeys: ["request_for_quote", "gph_analytics"],
  },
}
```

The markdown then **omits `offer_product`** — it keeps only `offer_interval`
and `offer_seats`. `parseCampaignFrontmatter` throws if a basket campaign
names a product anyway, so there is exactly one place per campaign that says
what is sold.

### Declared twice, on purpose

| Registry | Repo | Decides |
|---|---|---|
| `src/lib/campaigns.ts` | Government-Procurement-Library | what the page **says** |
| `src/billing/campaigns.py` | ALAN-FastAPI-Web | what the customer is **charged** |

The slug is the only thing that crosses between them. That makes the failure
mode worth knowing: a slug present in one and missing from the other **fails
at checkout, not at render** — the page prices and renders happily, and the
Continue button dies at `/signup-and-checkout`. Ship the pair together, and
click through a real signup on dev before pointing traffic at the URL.

Neither registry names a `product_prices.id`. Those are per-environment row
ids (dev's Advanced prices are 15/16, prod's are 3/4) and are recreated by a
catalog re-sync, so both sides resolve keys against the live catalog instead.

### One basket, two intervals

A basket sells exactly **one** interval: the one both of its registry entries
declare. `?interval=` cannot switch it, and `CampaignLanding` drops the
parameter outright when `isBasket`.

The reason is the handoff. A single-product campaign puts the resolved *price
id* in the URL, so whatever the card quoted is literally what gets bought. A
basket deliberately carries only the slug — that is what stops a visitor
assembling their own basket out of query parameters — so the interval never
reaches the API, which prices the basket from `basket.interval_months` in its
own registry. A card that honoured `?interval=` would have quoted $227.00/mo
and then billed $2,314.00/year.

To sell the same basket on another interval, register a **second campaign**,
not a query parameter — a second slug, a second markdown file, and an entry in
each registry with the other `interval`. (One was built and then dropped as
unwanted; nothing but this paragraph remains of it.) It costs a duplicated
markdown file, and buys three things a toggle would not:

- **The page cannot lie.** There is no client state that can disagree with
  what the API will charge, because the interval is a property of the campaign
  in both repos.
- **Separate landing counts.** `/landing/campaign-visit` records the slug, so
  the two offers stay attributable; one URL with a toggle is one number.
- **No new surface on the checkout path.** Letting the request name an
  interval means re-opening the slug-only handoff far enough to need a
  per-campaign allowlist — real work in `SignupAndCheckoutRequest`,
  `resolve_campaign_basket`, the handoff and `/signup` — to sell something a
  registry entry already sells for nothing.

Worth knowing before doing it: month-to-month is *dearer* per month than the
annual equivalent ($227.00 against $192.83 for this basket), so a monthly page
shows a **larger** headline figure and no savings badge. It is worth having
only for buyers who can't get an annual PO approved off a trial.

### Intervals are the intersection, not the union

`availableBundleIntervals` keeps only the intervals **every** product in the
basket sells, because one subscription has one billing cycle. If an add-on
stops selling annually, `offer_interval: annual` no longer resolves and the
page throws — deliberately, since the alternative is quoting a bundle nobody
can buy. Mixed currencies throw for the same reason.

### Before sending traffic to a basket campaign

- **Migration 047 must be applied** in the target environment
  (`ALAN-FastAPI-Web/database/migrations/047_subscription_items.sql`). It drops the
  UNIQUE on `subscriptions.stripe_subscription_id`; without it the second line
  item cannot be written, and the failure lands *after* the visitor has
  finished signing up.
- **The worker's trial-reminder sweep must dedupe by
  `stripe_subscription_id`.** Every basket signup is a three-row trial, so an
  undeduped `scan_trial_reminders` sends 3× the 7-day/3-day/1-day and
  post-cancel emails, and repeats daily — the per-row stamp never silences its
  siblings. The sender lives in the out-of-tree Celery worker; handoff at
  `ALAN-FastAPI-Web/docs/prompts/trial_reminder_dedupe_worker_prompt.md`.
  Confirm the `DISTINCT ON (stripe_subscription_id)` form is live first.

## Counting landings

`/start/[slug]` records every landing server-side — `recordCampaignLanding`,
called from `after()`, posting slug, the five `utm_*` values, the resolved
`interval`, referrer and user agent to `POST /landing/campaign-visit`. The
visitor's IP is deliberately not collected or forwarded.

GA4 cannot do this job and never will: it stays unloaded until the visitor
accepts the cookie banner, so it never sees the ones who decline or ignore it
— on cold campaign traffic, most of them. This count is first-party,
cookieless and complete. GA4 still owns what visitors do *after* the landing,
for the subset who consent.

It cannot break the page: the call runs after the response is on the wire, is
capped at a 3s timeout, and swallows its own errors into `console.error`.
Locally `INTERNAL_API_SECRET` is usually unset, the API answers 401, and the
landing simply isn't counted.

## URLs to use in campaigns

```
https://www.gphusa.com/start/<slug>                  # the file's own interval
https://www.gphusa.com/start/<slug>?interval=monthly # same copy, monthly price
```

Single-product campaigns only. The one campaign live today is a basket, which
ignores `?interval=` — see the note below.

`?interval=` switches which price the page quotes and which price id is carried
into checkout. Every interval the product sells is priced in the same catalog
fetch, so switching costs no extra round trip. An unknown or unsold value falls
back to the file's `offer_interval` rather than rendering nothing.

Use `?interval=` to A/B the billing period on identical copy. When the *copy*
differs — different audience, headline, or bullets — make a new markdown file
instead, so the slug doesn't lie about what the page sold.

> **`?interval=` is ignored on a basket campaign.** It is silently dropped —
> the card always quotes the interval the campaign's own registry entries
> declare, so it can never advertise a price checkout won't honour. To sell a
> basket on another interval, register a second campaign; see
> [One basket, two intervals](#one-basket-two-intervals).

`utm_*` parameters can be appended freely; nothing collides with them. Note they
currently stop at the campaign page — carrying them through signup into the
Stripe session is not implemented.

## Handoff to signup

Continue navigates to one of two shapes:

```
# Single product — the price id, resolved from the catalog at render time
/signup?tier=<tier>&plan=<resolved price id>&seats=<n>&cage=<CODE>

# Basket — the campaign slug, and nothing else about the purchase
/signup?campaign=<slug>&cage=<CODE>
```

A basket carries **only the slug** because the API resolves the prices itself
from `src/billing/campaigns.py` when it creates the Checkout session. A basket
assembled from query parameters would be a free trial of anything the visitor
cared to name; sending `price_id` alongside `campaign` is refused server-side,
so the two forms stay mutually exclusive on the client too.

`/signup` re-resolves the basket from its own registry for **display only** —
its confirmation badge names the products and quotes the total. The figures
that bill are the API's.

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
| Basket campaign whose markdown names `offer_product` | Throws. | Two places saying what is sold; the stale one is the one nobody reads. |
| Basket products share no interval, or mix currencies | Throws. | One subscription has one billing cycle and one currency. |
| Basket slug missing from the API's `CAMPAIGNS` | Page renders and prices normally; **checkout fails** at `/signup-and-checkout`. | The slug is the only link between the two registries, and only the API's side is consulted at purchase. |
| `?interval=` on a basket campaign | Silently ignored; the card quotes the campaign's own interval. | The handoff carries the slug alone, so nothing could tell the API which interval the visitor was shown — quoting one we can't charge is worse than ignoring the parameter. |
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
