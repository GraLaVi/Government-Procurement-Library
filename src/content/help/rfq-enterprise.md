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

## The Send RFQs page

Three tabs — **My solicitations** (your default queue), **Unassigned**, and
**All** — over every open matched solicitation. Each row shows the
solicitation number with the same badges as bid-matching (amendments,
fast-award type), the **purchase requisition number**, your work status,
the close date with days remaining, set-aside, the **estimated value**
(line quantities × the government acquisition cost — sortable, like every
other column), and the assignee. When the solicitation's PDF is on file, a
document icon next to the number opens it right there — same viewer as
Parts Search.

Two filters sit above the table: your **work status**, and the
**solicitation status** — it defaults to open solicitations, but you can
switch to awarded, closed, or cancelled ones (those views include
solicitations already past close, which is usually why you're looking).

If low-value solicitations aren't worth your time, set a personal
**minimum estimated value** in RFQ Settings — rows below it disappear from
your queue (rows with no estimate stay), and the page shows a "Hiding
under…" note so the filter is never invisible.

Click a solicitation number to see its quotable items — NSN, description,
quantity, and unit price — with a **Quote** button on each row. Each NSN is
a link that opens that part in Parts Search in a new tab. DIBBS "first
article test" placeholder lines (GOVERNMENT/CONTRACTOR FIRST ARTICLE)
aren't real purchasable items, so they don't appear here.

## Work status

Every solicitation moves through: **Unworked → RFQ Sent → Quotes In → Priced
→ Bid / No Bid / Passed**. Two transitions are automatic: sending an RFQ
marks it **RFQ Sent**, and the first vendor quote back marks it **Quotes
In**. Everything else you set from the status pill on the row — so the whole
team can see who's working what, and what's done.

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
closing soon that nobody has worked, vendor quotes past their due date, the
size of the unassigned pool, and each buyer's workload across every status.

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
