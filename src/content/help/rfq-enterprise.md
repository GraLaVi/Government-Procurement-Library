---
title: "The RFQ Enterprise work queue"
meta_title: "RFQ Enterprise Work Queue | GPH Help"
description: "Disburse matched solicitations to buyers by CAGE, work them through a status lifecycle, quote your private vendors, and compare quotes side by side."
---

The **RFQ Enterprise Add-on** turns your bid-matching results into a team work
queue. Solicitations are disbursed to the buyer who owns the relevant CAGE
codes, each one carries a work status your whole team can see, and RFQs go out
to a part's manufacturers **and your own private vendors** from one place.
When quotes come back, they line up side by side.

Enterprise includes everything in the base RFQ Add-on — the Manufacturers-tab
flow, batch cart, contact book, and Received RFQs all keep working exactly as
before. It adds three pages under **Vendor RFQs**: **Send RFQs**, **Private
Vendors**, and **Coverage**, plus **RFQ Buyer Assignments** under My Account.

## In this article

- [How solicitations reach a buyer](#how-solicitations-reach-a-buyer)
- [Taking ownership of a solicitation](#taking-ownership-of-a-solicitation)
- [The Send RFQs page](#the-send-rfqs-page)
- [Work status](#work-status)
- [Requesting quotes](#requesting-quotes)
- [Comparing quotes](#comparing-quotes)
- [Private vendors](#private-vendors)
- [Coverage](#coverage)
- [Settings](#settings)

## How solicitations reach a buyer

An admin assigns CAGE codes to buyers under **My Account → RFQ Buyer
Assignments**. A matched solicitation lands in a buyer's **My solicitations**
view when one of its approved-source manufacturers carries a CAGE assigned to
that buyer. A CAGE can be assigned to several buyers, and one buyer can own
many CAGEs.

Not every solicitation matches an assigned CAGE — those sit in the
**Unassigned** tab, with a count so the backlog is always visible. Anyone on
the team can assign them (select rows → **Assign to buyer**), and sending an
RFQ from an unassigned solicitation automatically makes it yours.

An explicit assignment always beats the CAGE-derived rule, so coverage during
vacations is one bulk re-assign away.

When new matched solicitations land in your queue, you get a bell
notification — and an email too if one of them is already closing soon.

## Taking ownership of a solicitation

Because a CAGE can belong to several buyers, the same solicitation can appear
in more than one person's **My solicitations** view. To keep two buyers from
working it at once, any solicitation without a named assignee can be
**claimed**:

- **Claim it explicitly** with the **Claim** button in the Assignee column.
  The moment you claim, the solicitation leaves every other buyer's default
  queue and shows your name — with a "(you)" marker in your own view. If a
  teammate claims it a moment before you, you'll see who got it instead.
- **Claiming also happens automatically when work starts**: clicking
  **Quote** on an unowned solicitation makes it yours right away, and so
  does saving items from it to the batch cart or sending an RFQ. If you
  start quoting a solicitation someone else already owns, a heads-up names
  them before you invest any time.

Claims protect against *accidental* double work, not against deliberate
reassignment — anyone can still re-assign rows with **Assign to buyer**.
If some of the selected rows already belong to another buyer, GPH asks
before taking them over.

## The Send RFQs page

Three tabs — **My solicitations** (your default queue), **Unassigned**, and
**All** — over every open matched solicitation. Each row shows the
solicitation number and its badges, the **purchase requisition number**,
your work status, the close date with days remaining, set-aside, the
**estimated value** (line quantities × the government acquisition cost —
sortable, like every other column), the solicitation status, and the
assignee. When the solicitation's PDF is on file, a document icon next to
the number opens it right there — same viewer as Parts Search.

### The badges beside a solicitation number

- **Amended** — the solicitation has changed. Click it for a timeline of
  every recorded change, before and since it was matched to you.
- **A green lightning bolt** (fast award) and **IDC** — the DLA type
  indicators. See
  [Solicitation type indicators](/help/solicitations-and-contracts#solicitation-type-indicators).
- **FAT** — a contractor **First Article Test** is required: you must
  produce initial sample units and have them approved before shipping full
  production, which adds cost and lead time to the bid. Click for the
  specifics and the FAR clause. This badge matters here because the
  quotable-items list hides the placeholder line that carries the
  requirement, so it would otherwise be invisible on this page.
- **A trophy with a number** — you have previously been awarded contracts
  for that many of this solicitation's parts. Click it to see which parts,
  how many times, and the unit price you were awarded — usually the most
  useful figure you have when pricing a new bid. It counts awards made to
  your own CAGE; work delivered under a partner's CAGE is their award and
  does not appear. When the most recent win is over five years old the
  badge shows as an outline, since the price is old enough to mislead.
- **View quotes** and **In cart** — work already in flight on the
  solicitation. See [Work in progress you can see](#work-in-progress-you-can-see).
<!-- HIDDEN UNTIL INVENTORY UPLOAD LAUNCH: restore the bullet below into the
     list above (see INVENTORY_UPLOAD_PUBLIC in @/lib/inventory/launch).
- **A green cube with a fraction** (say, 2/4) — that many of the
  solicitation's quotable parts are already in [your uploaded
  inventory](/help/supplier-stock). Solid green means every part is on your
  shelf; an outline means some are. Expand the row to see quantities and
  warehouse locations. The badge only appears if your company uploads its
  inventory to GPH — and it always reflects your own stock, never another
  supplier's.
-->


Two filters sit above the table: your **work status**, and the
**solicitation status** — it defaults to open solicitations, but you can
switch to awarded, closed, or cancelled ones (those views include
solicitations already past close, which is usually why you're looking).

If low-value solicitations aren't worth your time, set a personal
**minimum estimated value** in RFQ Settings — rows below it disappear from
your queue (rows with no estimate stay), and the page shows a "Hiding
under…" note so the filter is never invisible.

The queue changes under you as the matcher lands new solicitations and
teammates claim rows, so it re-checks itself on a timer. The
**Auto-refresh** button in the top right turns that on and off, and the
dropdown beside it sets how often — the timestamp underneath tells you
when the queue was last updated. Refreshes are silent: rows are replaced
in place, and your selection, expanded rows and scroll position stay put.
Nothing refreshes while a dialog is open or while the tab is in the
background, so a row can't move out from under you mid-task. **Refresh**
re-checks immediately.

Click a solicitation number to see its quotable items — NSN, description,
quantity, and unit price — with a **Quote** button on each row. Each NSN is
a link that opens that part in Parts Search in a new tab. DIBBS "first
article test" placeholder lines (GOVERNMENT/CONTRACTOR FIRST ARTICLE)
aren't real purchasable items, so they don't appear here.
<!-- HIDDEN UNTIL INVENTORY UPLOAD LAUNCH: restore the paragraph below after
     the paragraph above, and add supplier-stock to Related articles if the
     article has such a list.

If your company [uploads its inventory](/help/supplier-stock), the expanded
items also gain a **Your stock** column between the quantity and the unit
price: how many you have on hand and in what condition, then the warehouse
and the date of the count. An amber **partial** tag means your on-hand
quantity covers only part of what's solicited, and a stale count date is
called out so you can recount before quoting from it. This is your own
inventory only — other suppliers' shared stock never appears on this page.
-->


## Work status

Every solicitation moves through: **Unworked → RFQ Sent → Quotes In → Priced
→ Bid sent / No Bid / Passed**. Two transitions are automatic: sending an RFQ
marks it **RFQ Sent**, and the first vendor quote back marks it **Quotes
In**. Everything else you set from the status pill on the row — including
**Bid sent**, which you set once the bid has gone to the government — so the
whole team can see who's working what, and what's done.

The status belongs to the *solicitation*, so the same pill appears on every
RFQ you sent for it over on the [RFQ Pipeline](/help/requests-for-quote), and
setting it in either place moves both.

## Requesting quotes

The **Quote** button opens a vendor picker with two sources of vendors:

- **Suggested from my vendors** — the private vendors that match *this*
  part, chosen from your whole book (even thousands of vendors) using the
  capabilities you've recorded and your quoting history. Each suggestion
  says why it's there: *Exact NSN*, *Quoted before*, *CAGE 73808 (approved
  source)*, *FSC 5325*, or a matching keyword. A search box below covers
  the rest of your book for the exceptional case the matcher didn't
  surface.
- **Manufacturers** — the part's manufacturers, approved sources first and
  flagged.

Vendors you've asked before show their track record: *responded 4/5 · ~2d*.
Vendors with a lapsed SAM registration are still selectable (the status is
shown for context only).

If the solicitation is set aside — small business, SDVOSB, and so on — each
suggested vendor is checked against the socioeconomic statuses in your
vendor book. A vendor whose statuses don't include the target shows a
**Set-aside mismatch** warning and sorts to the bottom; one with no
statuses on file shows **Set-aside unknown**. Neither blocks you from
sending — but on a set-aside, a quote from a non-qualifying vendor may not
be usable for your bid, so the warning is worth heeding.

Pick your vendors and continue to the familiar RFQ window. The response due
date is pre-filled from the solicitation's close date minus your configured
lead time, so quotes arrive with room to price and submit.

### Work in progress you can see

Items saved to the batch cart from a solicitation show an amber
**In cart (N)** badge on its row — hover it to see who staged them. It means
a teammate has started on the solicitation even though no RFQ has gone out
yet; the badge clears when the batch is sent. Together with claiming, this
makes in-flight work visible before the status ever changes.

## Comparing quotes

Once RFQs are out, the row shows an **N RFQs · quotes** pill. Click it for a
side-by-side comparison per item: unit price, quantity available, lead time,
and validity for every vendor, with the best price highlighted and no-bids at
the bottom. Notes a vendor wrote on a line appear under it, and the view
tells you who hasn't answered yet. The same quotes and your pricing also
show on the RFQ's own detail page.

One flag deserves special attention: if a vendor quoted an **alternate part
number** but isn't an approved source for the item, the quote is marked
**Not an approved source** — DLA rejects such quotes on items described by
manufacturer CAGE and part number, so don't build your price on one without
an approved exception.

### Pricing your quote to the government

From the comparison table, click **Price** on the winning quote line. Enter
your markup percentage (pre-filled from your company default), shipping, and
any other charges — GPH computes your per-unit price to the government
(vendor price × markup, plus shipping and charges spread over the quantity)
and shows the extended total. Saving marks the solicitation **Priced**.

## Private vendors

**Vendor RFQs → Private Vendors** is your company's own vendor list — shops
you work with that may not be in SAM.gov at all. A vendor needs only a
company name; the identifier field takes a CAGE, UEI, DUNS, or your own code.
Add contacts to each vendor and they're used automatically when you send.
Private-vendor contacts also appear in the shared **Vendor Contacts** page,
labeled with the vendor's company and identifier so you always know who a
contact belongs to.

The page is searchable (name or identifier) and paginated, so it stays fast
even with thousands of vendors.

### Capabilities: teaching GPH who can supply what

Each vendor carries **capabilities** — the data behind the "Suggested from
my vendors" list in the quote picker. A vendor with no capabilities only
surfaces through search or past quoting history, so the more you record,
the better the suggestions:

- **CAGE codes represented** — the manufacturers this vendor makes,
  distributes, or resells for. The strongest signal: it connects the vendor
  to every part those manufacturers appear on. This is *not* the vendor's
  own identifier.
- **NSNs / NIINs supplied** — exact catalog coverage.
- **Supply classes** — 4-digit FSCs, or 2-digit groups to cover a whole
  Federal Supply Group.
- **Keywords** — matched against part descriptions ("o-ring", "hydraulic
  hose") when nothing stronger hits.
- **Socioeconomic statuses** — small business, SDVOSB, WOSB, and so on.
  Used to warn about set-aside mismatches when you pick vendors (see
  Requesting quotes above).

The Capabilities column shows each vendor's coverage at a glance; expand
the row for the full lists, or click the column (or **Capabilities** in the
row actions) to edit. The editor accepts comma- or newline-separated paste,
so tagging in bulk from a spreadsheet is quick.

Deleting a vendor you've already sent RFQs to deactivates it instead, so your
send history stays intact.

Your admin controls whether non-admin users can edit the vendor book
(private vendors, their capabilities, and the CAGE contact book) in
**RFQ Settings**.

## Coverage

**Vendor RFQs → Coverage** answers "what's falling through": solicitations
closing soon that nobody has worked, work started and never finished, vendor
quotes past their due date, the size of the unassigned pool, and each buyer's
workload across every status.

- **Closing soon, unworked** — closing within a few days with no RFQ sent.
- **In flight, not bid** — sitting at RFQ Sent, Quotes In or Priced with no
  outcome recorded. The subtitle calls out how many haven't moved in a week,
  which is the part worth chasing. Links to the RFQ Pipeline.
- **Quotes overdue** — RFQ sent, the vendor's window passed, no quote back.
- **Unassigned pool** — matched solicitations routing to nobody.

In the **By buyer** table, **In queue (derived)** is work that routes to that
buyer through CAGE ownership but nobody has claimed, and **Unworked** is work
routing to them that hasn't been started. The status columns cover everything
routing to a buyer, claimed or not — so derived work they've moved to Priced
shows up under Priced. **In queue (derived)** is a slice of those same
numbers, not an extra column to add to them.

Admins can also set an alert threshold in Settings — when the unassigned pool
grows past it, admins get a bell and email notification.

## Settings

Enterprise adds a section to **Vendor RFQs → Settings**:

- **Vendor quote lead time** — how many days before a solicitation closes
  vendor quotes should be due (drives the pre-filled due date).
- **My Send RFQs queue** *(personal — applies only to you)* — hide
  solicitations under an estimated value from your queue; leave blank to
  show everything.
- **Allow users to add and edit vendor contacts** *(admin)* — restrict the
  vendor book to admins.
- **Vendor reminders** *(admin)* — whether non-responding vendors get
  automatic email nudges, how many, and how far apart.
- **Unassigned pool alert** *(admin)* — the threshold for the backlog
  notification.
