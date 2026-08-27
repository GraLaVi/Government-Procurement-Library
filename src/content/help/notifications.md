---
title: "Notifications"
meta_title: "Notifications | GPH Help"
description: "Configure email notification preferences for yourself and your team, including bid matching alerts and system announcements."
---

GPH keeps you informed about new matches, system updates, and other events related to your account in two ways: **in-app alerts** in the notification bell (🔔) at the top of every page, and **email**. The two are configured separately — you can use one, both, or neither. This article explains the notification bell, how to configure your own email preferences, how account admins manage notifications for the whole team, and what other emails you might receive from GPH.

## In this article

- [The notification bell (in-app alerts)](#the-notification-bell-in-app-alerts)  
- [DLA buy-signal alerts](#dla-buy-signal-alerts)  
- [Your notification preferences](#your-notification-preferences)  
- [About notification frequencies](#about-notification-frequencies)  
- [Team Notifications (admin only)](#team-notifications-admin-only)  
- [How individual and team preferences interact](#how-individual-and-team-preferences-interact)  
- [Other emails you might receive](#other-emails-you-might-receive)

## The notification bell (in-app alerts)

The bell (🔔) at the top of the page shows in-app alerts without sending you email. Click it to see your recent items and open the one you want; **Mark all read** clears the badge. Today the bell carries three kinds of alert, each with its own on/off switch in a different place.

### Bid-match alerts

These appear when new solicitations match your saved bid-matching profiles. Turn them on or off under **Account \> Notifications**, in the **In-App Notifications** card, using the **Bid-match alerts** switch. When they're on, choose how they're grouped:

- **Summary** — a single running item that totals your new matches ("3 new bid matches").  
- **Per day** — one item for each day's matching run.

Clicking a bid-match alert opens your [Bid-Matching results page](/help/solicitation-matching). Email alerts for bid matches are separate — see [Bid Matching Alerts](#bid-matching-alerts) below.

### DLA buy-signal alerts

If you hold a [Procurement Analytics](/help/procurement-analytics) seat, the bell tells you when parts you supply go **on backorder** or drop **below DLA's reorder point** — the two strongest signs that a purchase is coming. Turn them on or off under **Account \> Notifications**, in the **In-App Notifications** card, using the **DLA buy-signal alerts** switch.

This arrives as a single rolling summary rather than one alert per part, and it stays unread until you clear it or the next monthly DLA snapshot lands — the underlying data is published monthly, so there's nothing new to say in between. See [Reading Demand & Stock Data](/help/demand-intelligence) for what the signals mean.

There's no email equivalent; this alert is bell-only.

### RFQ response alerts

If you use [RFQs](/help/requests-for-quote) — the tool for sending requests for quote to vendors from a part's **Manufacturers** tab — the bell alerts you when **a vendor responds to an RFQ you sent**. (That's the only RFQ bell event; there are no alerts for creating an RFQ or other status changes.) An alert reads like *Acme Corp responded to "Hydraulic Valve Assembly"* and opens that RFQ when clicked.

Manage these under **RFQ \> Settings**, in **My notifications**:

- **Show a bell alert when a vendor responds** — the on/off switch (a lightweight in-app alert, no email needed).  
- **How the bell groups response alerts** — **One alert per response**, **One alert per RFQ** (responses to the same RFQ collapse into one item with a count), or **A single rolling summary** (one item totaling all new responses).

Account admins can also set **who** gets response alerts on the same Settings page — **Only the RFQ creator** or **Everyone on the team** — and that choice applies to both the bell and email.

## Your notification preferences

To configure your own notifications, go to **Account \> Notifications**. The page organizes notifications into two categories: **Alerts** (time-sensitive events) and **System** (updates and maintenance notices).

### Bid Matching Alerts

Bid Matching Alerts send you **email** when new solicitations match your bid-matching profiles. (This is separate from the in-app [bid-match bell alerts](#bid-match-alerts) above — you can use either, both, or neither.) Click an option to set your frequency:

- **Immediate** — Each match is sent as soon as it's posted. *Available on Advanced.*  
- **Daily** — One digest per day. *Available on Basic and Advanced.*  
- **Weekly** — One digest per week. *Available on all plans.*  
- **Off** — No bid-matching emails. *Available on all plans.*

To learn how matches are generated, see [How Solicitation Matching Works](/help/solicitation-matching).

### System Announcements

System Announcements cover important system updates and maintenance notices. Options are **Immediate** (the default) or **Off**.

We recommend keeping this on Immediate so you don't miss notifications about planned maintenance windows or service updates that could affect your work.

## About notification frequencies

GPH uses three delivery modes:

- **Immediate** — Notifications are sent as soon as the event occurs.  
- **Digest** — Notifications are batched and sent periodically (Daily or Weekly).  
- **Off** — Stops emails for that notification type entirely.

## Team Notifications (admin only)

The Team Notifications page lets account admins manage notification preferences for everyone at your organization in one place. Go to **Account \> Notifications \> Team** to open it.

*Note: Team Notifications is available to account admins only.*

The page is organized by notification type. Within each type, recipients are grouped into two sections:

- **Users (login)** — Team members with login accounts. Each user's current frequency is shown next to their name, with a dropdown to change it.  
- **Contacts (non-login)** — Non-login recipients such as your accounting, HR, or billing contacts. To add or edit contacts, click **Manage contacts →**, which opens the [Contacts page](/help/account-settings#managing-contacts).

If a user hasn't explicitly set a preference for a given notification type, their row shows an "inheriting default" badge, meaning they're using the system default until they set their own preference.

## How individual and team preferences interact

Your own Notifications page and the Team Notifications page write to the same underlying setting, so a change made in either place updates the same preference. A few rules govern how they work together.

When no preference has been set for you, you inherit the default frequency for that notification type. On the Team Notifications page, admins see an "inheriting default" badge next to anyone in this state. The first time a preference is set — whether you set it yourself or an admin sets it from Team Notifications — it becomes your explicit preference and the badge goes away. An admin-set preference is not a locked override: you can still change it yourself afterward.

Because you and your admins edit the same setting, the most recent change always wins. If an admin changes a preference you set earlier, the admin's value takes effect; if you change it again afterward, yours does.

## Other emails you might receive

The Notifications page controls in-app notifications only. You may also receive:

- **Billing emails** — Sent automatically and can't be turned off. These include receipts, payment failures, and subscription changes.  
- **Marketing and product announcement emails** — Use the unsubscribe link at the bottom of any marketing message to opt out.  
- **Transactional emails** — Operational emails like password resets and team invitations can't be disabled.

## Related articles

- [Reading Demand & Stock Data](/help/demand-intelligence) — What the DLA buy signals in the bell mean  
- [How Solicitation Matching Works](/help/solicitation-matching) — How bid-matching alerts are generated  
- [Setting Up Bid-Matching Profiles](/help/bid-matching-profiles) — Define the profiles that drive your matches  
- [Sending RFQs to Vendors](/help/requests-for-quote) — Configure and act on RFQ response alerts  
- [Managing Your Account](/help/account-settings) — Add and edit non-login contacts
