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
