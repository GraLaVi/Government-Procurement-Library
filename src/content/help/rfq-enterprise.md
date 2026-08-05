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

## The Send RFQs page

Three tabs — **My solicitations** (your default queue), **Unassigned**, and
**All** — over every open matched solicitation. Each row shows the
solicitation number with the same badges as bid-matching (amendments,
fast-award type), your work status, the close date with days remaining,
set-aside, and the assignee.

Click a solicitation number to see its parts — NSN, description, quantity,
and unit price — with a **Quote** button on each row.

## Work status

Every solicitation moves through: **Unworked → RFQ Sent → Quotes In → Priced
→ Bid / No Bid / Passed**. Two transitions are automatic: sending an RFQ
marks it **RFQ Sent**, and the first vendor quote back marks it **Quotes
In**. Everything else you set from the status pill on the row — so the whole
team can see who's working what, and what's done.

## Requesting quotes

The **Quote** button opens a vendor picker showing the part's manufacturers —
approved sources first and flagged — alongside your private vendors. Vendors
with a lapsed SAM registration are still selectable (the status is shown for
context only). Vendors you've asked before show their track record:
*responded 4/5 · ~2d*.

Pick your vendors and continue to the familiar RFQ window. The response due
date is pre-filled from the solicitation's close date minus your configured
lead time, so quotes arrive with room to price and submit.

## Comparing quotes

Once RFQs are out, the row shows an **N RFQs · quotes** pill. Click it for a
side-by-side comparison per item: unit price, quantity available, lead time,
and validity for every vendor, with the best price highlighted and no-bids at
the bottom. It also tells you who hasn't answered yet.

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

Deleting a vendor you've already sent RFQs to deactivates it instead, so your
send history stays intact.

Your admin controls whether non-admin users can edit the vendor book (both
private vendors and the CAGE contact book) in **RFQ Settings**.

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
- **Allow users to add and edit vendor contacts** *(admin)* — restrict the
  vendor book to admins.
- **Vendor reminders** *(admin)* — whether non-responding vendors get
  automatic email nudges, how many, and how far apart.
- **Unassigned pool alert** *(admin)* — the threshold for the backlog
  notification.
