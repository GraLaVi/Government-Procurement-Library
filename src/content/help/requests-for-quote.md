---
title: "Sending RFQs to vendors"
meta_title: "Sending RFQs to Vendors | GPH Help"
description: "Create and send Requests for Quote to vendors from a part's Manufacturers tab, track responses, and collect structured quotes in Government Procurement Hub."
---

A Request for Quote (RFQ) lets you ask vendors for pricing on a part and collect their answers in one place. You start an RFQ from a part's manufacturers, send it to one or more vendors, and GPH gathers each vendor's structured quote — unit price, lead time, alternates, and notes — back on the RFQ.

RFQ is an add-on. It's unlocked by the **RFQ product**, which is assigned per user (a seat). If you don't have it, the RFQ pages show an upgrade prompt instead of the tools below. Everything RFQ lives under the **Vendor RFQs** menu in the top navigation: **My RFQs**, **Batch**, **Vendor Contacts**, **Settings**, and **Received RFQs**.

## In this article

- [Creating an RFQ](#creating-an-rfq)  
- [Batch RFQs](#batch-rfqs)  
- [Tracking your RFQs](#tracking-your-rfqs)  
- [Reading an RFQ and its quotes](#reading-an-rfq-and-its-quotes)  
- [Closing or cancelling an RFQ](#closing-or-cancelling-an-rfq)  
- [Vendor Contacts](#vendor-contacts)  
- [Settings](#settings)  
- [Received RFQs](#received-rfqs)

## Creating an RFQ

You start every RFQ from a part. Open a part record, go to the **Manufacturers** tab, check the vendors you want to ask, and click **Create RFQ** (the button shows a count, e.g. **Create RFQ (3)**).

Every listed manufacturer can be selected, regardless of SAM.gov registration state. Vendors whose registration is inactive, expired, or missing show a tooltip on the checkbox noting it — many vendors renew a lapsed registration before award, so a stale status shouldn't stop you from asking for a quote. Confirm the registration before relying on the vendor for an award.

One case is different: a vendor with an **active SAM.gov exclusion** (debarment or suspension) shows a red **⚠ Excluded** badge. Federal awards cannot be made to excluded vendors, so a quote from one is unusable unless the exclusion is lifted — you can still select them, but check SAM.gov before spending time there.

The **Create RFQ** window opens with everything pre-filled from the part. You don't write a title or cover message — GPH generates the RFQ title automatically. You set:

- **Response due date** — the deadline you're giving vendors to respond (applies to the whole send).
- **Recipient** (per vendor) — who to send to. GPH offers your saved contacts and a SAM.gov-suggested email, or you can choose **Custom / enter manually…** and type a **Contact name** and **Contact email**. An email address is required to send.
- **Line items** (per part) — for each part you're asking about, set **Qty**, **UOM** (unit of measure), an optional **Need by** date, an optional **Target $/unit**, and optional **Notes**.

Leave **Save entered contacts for future RFQs** checked to add any addresses you typed to your [Vendor Contacts](#vendor-contacts) book.

Finish with one of:

- **Send now** — sends immediately. GPH creates **one RFQ per vendor**, emails each vendor an invitation with a private response link, and shows a confirmation.
- **Save to batch** — stages the items for later instead of sending (see below). This doesn't require a contact email yet.

## Batch RFQs

The **Batch** page (**Vendor RFQs › Batch**) is a staging area shared across your whole team. Add items to it with **Create RFQ → Save to batch** from any part, then send them together later. This is handy when you're assembling a large request over time or across several parts.

On the batch page you can filter by **Added by** (yourself, a teammate, or everyone), edit a line's quantity inline, and remove items. When you're ready, use **Send selected** or **Send all** — GPH groups the staged items into **one RFQ per vendor**, exactly like an immediate send. (Items staged from the RFQ Enterprise work queue also keep track of which solicitation they came from: they send as one RFQ per vendor *per solicitation*, and the quotes flow back into that solicitation's comparison view.)

## Tracking your RFQs

**My RFQs** (**Vendor RFQs › My RFQs**) lists the RFQs your organization has sent. Columns show the **RFQ** title, the **Vendor**, who it was **Created by**, its **Status**, **Responses** (how many recipients have replied out of how many were sent), the **Due** date, and when it was **Sent**. Use the **Created by** filter to narrow the list to yourself or a teammate.

The **Status** badge summarizes where an RFQ stands across all the vendors it went to:

- **Sent** — delivered, no vendor has opened it yet.
- **Viewed** — at least one vendor has opened it.
- **Responded** — at least one vendor has submitted a quote.
- **Declined** — vendors have declined to quote.
- **Stale** — the response window has passed without a reply.
- **Closed** / **Cancelled** — you ended the RFQ (see below).

## Reading an RFQ and its quotes

Click an RFQ to open its detail page. It shows three things:

- **Recipients** — every vendor the RFQ went to, with the contact email, that vendor's status, and how many reminder emails GPH has sent them.
- **Requested items** — the line items you asked about (part/NSN, quantity, unit of measure, need-by date, target price, and notes).
- **Quotes received** — each vendor's response. A quote's header shows its **total** and **lead time**, and a per-line table shows the vendor's **unit price**, **quantity available**, **lead time**, any **alternate part** they're offering, whether they marked a line **no bid**, and their notes.

## Closing or cancelling an RFQ

While an RFQ is still open, the detail page offers two actions:

- **Close** — finalizes the RFQ. Vendors can no longer respond and their links stop working, but quotes already submitted are kept. This can't be undone.
- **Cancel** — stops all vendor responses and invalidates their links. Quotes already submitted are kept. This can't be undone.

You don't need to close RFQs by hand. GPH sends vendors up to two reminder emails before the due date, and — if auto-close is enabled in [Settings](#settings) — automatically closes an RFQ once its due date (plus any grace period) has passed. There's no separate "award" step; the RFQ simply gives you the quotes to act on.

## Vendor Contacts

**Vendor Contacts** (**Vendor RFQs › Vendor Contacts**) is your organization's private contact book. The default contact you save for a vendor pre-fills automatically when you compose an RFQ; GPH only falls back to a SAM.gov-suggested email when you have no saved contact.

Adding a contact needs three things: the vendor's **CAGE / Private Vendor** identifier, a **Name**, and an **Email**. **Phone** and **Title** are optional. The required fields are marked with an asterisk, and if you submit without one, the message names the field and the box itself is outlined in red — so you never have to guess which of the five it means.

The identifier field takes a CAGE for a SAM.gov vendor. On the Enterprise add-on it also takes the identifier you gave one of your own private vendors, which may be a CAGE, UEI, DUNS, or an internal code of your own.

You can edit any field inline, mark one contact as the **Default** for a vendor, or delete a contact. Contacts are visible only to your organization.

## Settings

**Settings** (**Vendor RFQs › Settings**) has two panels.

**My notifications** (just for you) controls how you're alerted when a vendor responds:

- **Email me when a vendor responds** — one email per quote.
- **Show a bell alert when a vendor responds** — a lightweight in-app alert, no email needed.
- **How the bell groups response alerts** — one alert per response, one alert per RFQ (collapsed with a count), or a single rolling summary.

For more on the in-app bell, see [Notifications](/help/notifications#the-notification-bell-in-app-alerts).

**Company settings** (for your whole organization, admin-managed) controls:

- **Who gets response alerts** — only the RFQ's creator, or everyone on the team. This applies to both bell and email alerts.
- **Auto-close overdue RFQs** — automatically close RFQs once their due date passes, with an optional **grace period** in days.
- **Default response window** — a number of days that pre-fills the due date on new RFQs.

## Received RFQs

**Received RFQs** (**Vendor RFQs › Received RFQs**) is the opposite direction — RFQs that other companies have sent *to you* to respond to. It's a separate workflow from the outbound RFQs described in this article; open a received RFQ to submit or decline a quote.

## Related articles

- [Searching for Parts](/help/parts-search) — Start an RFQ from a part's Manufacturers tab  
- [Notifications](/help/notifications) — Configure bell and email alerts for RFQ responses  
- [Researching Vendors](/help/vendor-research) — Look up a vendor before you send
