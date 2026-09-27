# Feature changelog

What moved, newest first. A few lines per shipped change.

The generated help articles say what the product does *now*; they can't
describe change, and the Claude repo connector syncs file contents without
commit history. This file is the only place downstream — a person or Claude —
can see a diff.

## Entry shape

```
YYYY-MM-DD — <feature or area>
Added / Changed / Removed: <what actually moved>
Not in scope: <what this deliberately does not do, and which tier or add-on does>
Public terms: <approved customer-facing name; flag anything without one>
Affects: <what's now stale downstream>
```

Only the first line is required every time. The other three appear when they
apply.

**Not in scope** — help articles say what a feature does, rarely what it
deliberately doesn't. That boundary is usually a pricing boundary, and it
exists nowhere else in the repo.

**Affects** — the trigger for downstream work. Pricing pages, Attio fields,
landing copy, and campaign messaging all go stale silently when the product
moves. Naming them turns "the product changed" into a list of things to fix.

## Mechanics

- Entry added in the same commit as the change. A customer-visible change that
  is backend-only gets a docs-only commit here the same day — the entry is
  about what customers see, not where the code moved.
- Keep entries short. If one is getting long, the help article is carrying the
  detail — link to it.
- Click **Sync now** in the Claude Hub project after pushing. The connector
  doesn't pull automatically.

---

2026-09-27 — Bid matching: longer Buying agency lists
Changed: an "is any of" agency list now holds roughly 14 agency names, up
from 2. The stored value cap for AGENCY went 200 → 1000 characters, which
had been held at 200 until migration 054 (varchar → text) reached prod.
Not in scope: no change to any other condition type, which keep the shared
200-character cap — they hold codes, not names. No plan boundary.
Public terms: none needed; nothing in the help articles states a character
limit, and the editor surfaces the cap itself.
Affects: nothing downstream. The overflow error still points customers at
several "is exactly" rows in an OR profile as the alternative, which
remains the right advice past ~14 agencies.

2026-09-24 — Bid matching: Buying agency condition
Added: an AGENCY condition type naming who is buying. Picking a department
takes every bureau under it, picking a bureau takes only that one; values
come from a picker built live from SAM.gov notices and annotated with each
agency's notice count over the last 90 days. Supports all four identifier
operators. Every DLA/DIBBS solicitation is scored as DEPT OF DEFENSE /
DEFENSE LOGISTICS AGENCY, so one condition covers both sources.
Not in scope: no plan boundary — like every condition type it is available
on Free, Basic and Advanced; what varies by plan is the profile and
condition count, unchanged here. It does not filter Parts Search or
Solicitation keyword search, only bid matching.
Public terms: "Buying agency" is the label in the editor. Not "Agency
condition", not AGENCY — that is the stored value.
Affects: bid-matching-profiles and bid-matching-recipes articles (updated
2026-09-27). Whether an agency hit reads Hard or Soft on the results page
is set by the worker and is NOT yet documented — the Strong vs. weak table
in the recipes article deliberately omits it pending an answer.

2026-09-23 — Solicitation keyword search
Added: keyword search over SAM.gov notices that carry no part link —
services, repairs, construction, and the supply buys posted without an NSN
(roughly six in ten of what this surfaces). Reached from Parts Search via
the "Solicitation keyword" search type. Filters, a detail panel, attachment
access, and direct lookup by solicitation or award number. A part-number
search that finds no parts now falls back to the SAM.gov notice instead of
coming back empty.
Not in scope: no plan boundary — every parts-search tier including Free.
Coverage is DoD-oriented: the in-scope filter is a solicitation-number
prefix rule, which currently excludes about 24% of unlinked notices,
including civilian-agency buying. Not a tier limit and not stated in the
article.
Public terms: "Solicitation keyword" is the search-type label;
"Finding solicitations with no part number" is the article title. Never
"non-NSN search" in customer copy.
Affects: parts-search article (updated at ship), help index. Landing and
pricing copy still describe search as part-driven and do not mention this
at all.

2026-09-21 — Request for Quote (naming)
Changed: the base add-on reads "Request for Quote" everywhere customers
see it — Products menu, /products/rfq, landing feature card, plan
comparison row, help article meta. Was three names in three places.
Public terms: "Request for Quote" and "Request for Quote Enterprise".
Both are RFQ add-ons; "RFQ Add-on" is the category the two sit in, not
a name for either. Never ALAN.
Affects: the /help/requests-for-quote slug still carries the old plural
— a URL, so a redirect job rather than a copy edit, not done. Attio,
and any campaign or email copy using the plural.

2026-09-04 — RFQ Enterprise
Added: CAGE-based buyer routing and claiming, Coverage dashboard,
capability-matched vendor suggestions, inventory-aware quoting.
Not in scope: none of this reaches RFQ Basic — this is the boundary
the $49 / $129 split is priced on.
Public terms: "Request for Quote Enterprise". Never ALAN.
Affects: pricing page, Article 7, Attio plan-tier field, landing
page add-on cards.

2026-08-27 — Procurement Analytics
Added: dashboard (Market Pulse, Act Now, Your Business, Opportunity
Targeting, Bid-Matching Health), Demand & Stock tab on every part,
DLA buy-signal alerts, demand column on bid-match results. Per-seat
add-on.
Removed: the Maximum tier — this feature set was its only
differentiator over Advanced.
Not in scope: requires Advanced. Basic and Free cannot hold the
add-on at any seat count. "Your business" sections need the account
CAGE set.
Public terms: "Procurement Analytics". Never gph_analytics, never ALAN.
Affects: pricing page, plans-and-pricing article, landing page,
Attio plan-tier field (Maximum is gone), any campaign copy still
selling Maximum.

2026-08-25 — Supplier Stock
Added: CSV inventory upload, per-field sharing controls, Supplier
Stock tab on part records, In stock badge in search results, own-stock
column on the Send RFQs queue.
Not in scope: contributing is free on every plan including Free;
*viewing* others' stock is Advanced — or any plan while you are a
sharing contributor with current stock. Quoting a stock holder still
needs an RFQ add-on.
Public terms: "Supplier Stock" for the feature. The upload surface is
Library → Inventory. Never "Inventory Upload" in customer copy.
Affects: pricing page supplier-stock section, landing page,
/products/supplier-stock, Attio.

2026-08-21 — Request for Quote (base add-on)
Added: public surfaces for the RFQ add-on — help articles, landing
page, pricing card. Send RFQs from a part's Manufacturers tab, batch
cart, private contact book, structured quote capture.
Not in scope: no buyer routing, no Coverage, no private-vendor
quoting — see RFQ Enterprise.
Public terms: "Request for Quote". Both tiers are RFQ add-ons —
"RFQ Add-on" is the category the two sit in, not a competing name for
the base one. Never ALAN.
Affects: pricing page, plans-and-pricing article, landing page,
/products/rfq.
