---
title: "Managing your company profile"
meta_title: "Managing Your Company Profile | GPH Help"
description: "Correct your SAM.gov demographics, choose which contacts appear in vendor search, and publish your certifications and set-asides from the Company Profile page."
---

Everything GPH knows about your company starts with your SAM.gov registration, pulled in under your CAGE code. SAM data goes stale: you move, a point of contact leaves, the legal name on file is an old one, and none of your certifications are in there at all. The **Company Profile** page is where you fix that — and where you decide what other GPH subscribers see when they look your company up in vendor search.

Go to **Account → Company Profile**, or open [/account/company](/account/company) directly.

*Company Profile is available to account admins only.* If you don't see the card on the Account page, ask an admin at your company to make the change, or to give you the admin role from [Manage Users](/help/account-settings#managing-users).

## In this article

- [How your edits work](#how-your-edits-work)
- [Demographics](#demographics)
- [Contacts in vendor search](#contacts-in-vendor-search)
- [Certifications and set-asides](#certifications-and-set-asides)
- [Checking how your profile looks to others](#checking-how-your-profile-looks-to-others)
- [Common tasks](#common-tasks)

## How your edits work

Three rules explain almost everything about this page:

**1. Nothing here changes your SAM.gov registration.** Your edits are stored separately in GPH and layered over the SAM data at the moment a page is drawn. GPH never writes back to SAM. If your SAM record itself is wrong — and it's the record contracting officers actually use — fix it at [SAM.gov](https://sam.gov) as well. Editing it here only changes what GPH shows.

**2. Your edits survive the SAM refresh.** GPH re-syncs SAM data periodically. Because your changes live in a separate layer, a refresh never overwrites them. The flip side: once you override a field, GPH shows *your* value even if SAM later catches up. Clear the field when you no longer need the override.

**3. Changes are live immediately.** There's no publishing step and no overnight job. As soon as you save, the next person to open your vendor profile sees the new value.

Throughout the Demographics form, small grey **SAM.gov:** hints sit under each field showing the original registered value, so you can always tell what you've changed and what the government has on file.

## Demographics

The Demographics section covers your company's identity and locations. Your CAGE code is shown at the top of the section — it's the key everything is joined on and can't be edited here.

| Field | Where it shows |
| --- | --- |
| **Legal Business Name** | Your vendor profile, and your company name inside GPH (Account page) |
| **DBA Name** | Your vendor profile, next to the legal name |
| **Website** | The Business Details card on your vendor profile |
| **Physical Address** | The Physical Address card on your vendor profile |
| **Mailing Address** | The Mailing Address card (shown only when it differs from the physical address) |
| **Point of Contact** | Not published — this is the primary business contact GPH uses to reach your company |

Fill in address lines, city, state, ZIP, and country code for each address block. To publish a **contact** to your vendor profile, use the Contacts section below rather than the Point of Contact fields — the POC block is your company's own record with GPH, and its email and phone have no SAM.gov equivalent, so those two fields start blank.

Click **Save Demographics** when you're done; a green confirmation appears above the form.

### Reverting a field to SAM.gov

There's no separate "reset" button in Demographics — clearing does it. **Empty a field and save**, and the override is removed, so the field falls back to whatever SAM.gov has. Retyping a value so it matches the SAM.gov hint exactly has the same effect. Either way, from then on the field tracks SAM again and updates with each refresh.

## Contacts in vendor search

This section controls the **Contacts** tab on your public vendor profile. It starts out as your SAM-registered points of contact — the roles SAM defines, such as Government Business, Electronic Business, and Past Performance, each with an Alternate variant. Those arrive automatically; you don't add them.

Each row gives you three actions:

- **Hide** — The contact stops appearing in vendor search entirely. The row stays in your list, dimmed, with a **hidden** badge so you know it's suppressed rather than deleted. Click **Show** to bring it back. This is the right tool for a person who has left the company.
- **Edit** — Change the name, title, email, or phone shown to other subscribers. Anything you leave blank keeps the SAM value; anything you fill in replaces it. Edited rows are marked so you can spot them.
- **Reset** — Available once a SAM contact has been edited or hidden. It throws away your changes for that row and restores the SAM values (and unhides it).

**To publish someone who isn't in SAM at all**, click **Add Contact** and fill in the name, title, email, and phone. Added contacts show an **added** badge, appear alongside your SAM contacts in vendor search, and can be hidden or edited the same way. The **Remove** button deletes an added contact permanently — unlike Reset on a SAM row, there's nothing underneath to fall back to.

One caution before you publish an email address or direct line: your vendor profile is visible to other GPH subscribers, who use these contacts to send quote requests. A shared sales inbox usually ages better than an individual's address.

## Certifications and set-asides

SAM doesn't carry your quality certifications, and its socioeconomic data is often thin. This section lets you publish both. They render as chips on the **Certifications & Set-Asides** card of your vendor profile — one of the first things a buyer evaluating you will read.

Click **Add**, then fill in:

- **Type** — **Certification** (a credential you hold, such as ISO 9001 or CMMC) or **Set-Aside** (a socioeconomic designation, such as SBA small business, 8(a), HUBZone, WOSB/EDWOSB, or SDVOSB). The badge on the chip tells buyers which is which.
- **Standard** — Pick from GPH's standard list for the type you chose. Using a standard entry gets you the canonical wording buyers expect: ISO 9001:2015, AS9100, ISO 13485, ISO 14001, CMMC / NIST 800-171, ITAR Registered, JCP Certification, NADCAP, and more. Look for yours here before typing one by hand — the list changes with the Type you picked above.
- **Custom Label** — Appears once you choose **Other (custom)…** at the bottom of the Standard list. Use it for anything not on the list, such as a state MBE or DBE certification. Saving without either a standard option or a custom label returns an error.
- **Detail / Number** (optional) — A certificate or registration number, e.g. "Cert #12345". Buyers see it when they hover the chip.
- **Expires** (optional) — The expiration date, also shown on hover.

Every entry starts visible. **Hide** takes one off your public profile without deleting it — useful while a certification is being renewed — and **Show** puts it back. **Delete** removes it for good.

Note that an expiration date is displayed, not enforced: an expired certification keeps showing until you hide or delete it. It's worth a look through this list once a year.

## Checking how your profile looks to others

Nothing on this page previews the result, so check it from the buyer's side: go to **Library → Vendor Search** (or the **Look up a vendor by CAGE** bar on your dashboard), enter your own CAGE code, and open your profile. Your demographics and certifications appear on the **Demographics** tab, and your curated contacts on the **Contacts** tab. See [Researching vendors](/help/vendor-research) for a tour of what else is on that profile.

## Common tasks

**We moved.** Update the Physical Address (and Mailing Address, if it changed) in Demographics and save. Then update SAM.gov too — contracting officers work from the SAM record, not from GPH.

**Someone left the company.** Find them in Contacts and click **Hide**. If a colleague took over the role, click **Edit** on the same row and replace the name and details instead — that keeps the SAM role label intact.

**Our name is wrong or we rebranded.** Set the Legal Business Name (or DBA Name) in Demographics. This also changes the company name shown on your own Account page.

**We just got certified.** Add it under Certifications & Set-Asides. It's live on your vendor profile as soon as you save.

**I already fixed it in SAM.gov — do I need to do it here?** No. Once SAM has the correct value, the next GPH re-sync picks it up on its own. Just make sure you don't have a stale override on that field: if the field shows something other than the **SAM.gov:** hint beneath it, clear the field and save so it tracks SAM again.

**The page shows an error instead of my profile.** That usually means your account isn't an admin, or your CAGE code has no matching registration in our SAM data. Contact support and we'll sort out which it is.

## Related articles

- [Researching vendors](/help/vendor-research) — What buyers see on the vendor profile you're editing
- [Managing your account](/help/account-settings) — Your own profile, users, roles, and non-login contacts
- [Sharing and finding supplier stock](/help/supplier-stock) — Publish your inventory to the same vendor profile
- [Sending RFQs to vendors](/help/requests-for-quote) — How quote requests reach the contacts vendors publish
