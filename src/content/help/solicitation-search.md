---
title: "Finding solicitations with no part number"
meta_title: "Finding Solicitations With No Part Number | GPH Help"
description: "Search SAM.gov solicitations that aren't tied to an NSN — services, repairs, construction, and supply buys posted without a part number — and read the results."
last_updated: "2026-09-23"
---

Most of what GPH shows you starts from a part: you search an NSN, and GPH shows the solicitations that want it. But a large share of government buying never names a part. Services, repairs, construction and maintenance contracts have no NSN to search from, and neither do the many supply solicitations the government posts without one.

Solicitation keyword search finds those. It searches SAM.gov notices directly, so you can look for work by what it *is* — "hydraulic repair", NAICS 336611, a set-aside you qualify for — rather than by a part number that was never published.

## In this article

- [When to use it](#when-to-use-it)
- [Running a search](#running-a-search)
- [Filters](#filters)
- [Reading the results](#reading-the-results)
- [Opening a solicitation](#opening-a-solicitation)
- [Documents](#documents)
- [Which agencies are covered](#which-agencies-are-covered)
- [Looking up a solicitation number directly](#looking-up-a-solicitation-number-directly)
- [Recent searches](#recent-searches)
- [How this relates to bid matching](#how-this-relates-to-bid-matching)

## When to use it

Use **Parts Search** when you know the part. Use **Solicitation keyword** when you don't have one — either because the work isn't about a part at all, or because the government didn't publish an NSN for it.

It's worth knowing that the second case is the bigger one. These aren't only services solicitations: roughly six in ten of the notices here are ordinary supply buys that were simply posted without an NSN attached. If you sell products and you've only ever searched by NSN, there is a substantial amount of product buying you have not been seeing.

## Running a search

Open **Library → Parts Search**, then choose **Solicitation keyword** from the search-type dropdown.

**The keyword is optional.** Leave the box empty and click search to browse by filters alone — "every open Navy solicitation closing this month" is a perfectly good search with no keyword in it.

When you do enter a keyword, it's matched against the solicitation number, the notice title, and the body of the notice. The body matters: SAM titles average about 47 characters, so the real description of the work is usually in the text underneath, and searching it finds far more than searching titles would.

## Filters

The filter rail sits to the left of the results. Set as many as you like, then click **Apply filters**.

- **Status** — **Open only** is the default. **Closed (last 3 months)** shows recently expired solicitations, which is useful for researching what an office buys and who else bid. **Open and recently closed** shows both.
- **Agency** — One of the agencies listed below.
- **NAICS** — An exact NAICS code.
- **PSC** — Product Service Code, matched as a prefix, so `53` returns the whole Hardware family and `5305` returns just screws. A PSC beginning with a letter is a service or R&D buy; one beginning with a digit is a product.
- **Set-aside** — The set-aside code, such as `SBA` or `SDVOSBC`.
- **State** — The two-letter state where the work is performed, not where the office sits.
- **Posted from / Posted to** — Narrow by when the notice appeared.
- **Documents** — Limit to notices GPH holds attachments for, or to ones it doesn't. See [Documents](#documents) below for why this is about what GPH holds rather than what SAM published.

**Clear all** appears whenever a filter is set, and resets everything including the status back to open-only.

## Reading the results

Each row is one notice: number, title, agency and contracting office, set-aside, NAICS and PSC, place of performance, when it was posted, and when it closes.

The **Number** column is labelled generically because it does not always hold a solicitation number — a contract-number search returns awards, and those show the award number instead. Anything that is not an ordinary solicitation is named underneath: *Award*, *Pre-solicitation*, *Sources sought*. A row with no label is a solicitation.

The **Closes** column carries a countdown — "Closes in 5 days" — and turns amber inside a week and red inside three days. Results are sorted by closing date by default, soonest first. With a keyword you can also sort by **Recently posted** or **Best match**.

Two things about deadlines are worth knowing:

- **SAM does not require a response deadline**, and about one notice in eight doesn't have one. Those show **No deadline posted** rather than a date. GPH treats them as open while SAM still flags them active and they were posted within the last six months, so they don't accumulate forever — but if you're interested in one, check the notice on SAM.gov for the real date.
- **A solicitation is re-posted every time it's amended.** The results list shows only the current version of each number, so you see one row per solicitation rather than one per amendment.

## Opening a solicitation

Click any row to open the detail panel. It shows the full notice on one screen: title, agency and office, the dates, set-aside, NAICS and PSC, place of performance, the contracting officer's name and email where SAM published them, and the notice description.

There are no tabs here, and that's deliberate. The tabs on a part record — procurement history, manufacturers, technical characteristics, packaging — are all driven by a part. These solicitations don't have one, so those tabs would be empty on every row. Everything a notice actually carries fits on one screen.

Press **Escape** or click outside the panel to close it and return to your results, exactly where you left them.

## Documents

For this kind of solicitation the attachments usually *are* the solicitation — the statement of work, drawings, wage determinations and pricing sheets are where the requirement is actually described, not in the notice text.

Where GPH holds those files, the **Documents** column shows a count, and clicking it lists them. PDFs open in an in-app viewer; other file types download.

Where GPH doesn't hold them yet, the column shows a **SAM.gov** link that opens the notice on SAM.gov instead, where the attachments are always available. Coverage is uneven by agency and is actively being expanded: it is strong for Navy, Army, Air Force and Veterans Affairs solicitations, and thinner for the civilian agencies added more recently. A notice showing a SAM.gov link today may show its documents in GPH later, with nothing to re-do on your side.

## Which agencies are covered

Solicitation keyword search covers:

| | |
|---|---|
| Defense | Navy, Army, Air Force, DLA |
| Civilian | Veterans Affairs, Homeland Security, Interior, Health & Human Services, Agriculture |

These are the agencies whose solicitations our subscribers actually bid, rather than all of SAM.gov. If you're regularly bidding an agency that isn't on this list, tell us — the list is a deliberate choice, not a technical limit.

Only solicitations you can currently quote are included. Pre-solicitation announcements, sources-sought notices, award notices and special notices are not part of this search.

## Looking up a solicitation number directly

If you already have a solicitation number, you don't need this search type at all. Paste it into the ordinary **Solicitation number** search.

That search looks for the parts on a solicitation, so for a services or repair solicitation it used to come back empty. It no longer does: when a number has no parts behind it, GPH checks SAM.gov and shows you the notice instead, along with a short explanation that the solicitation simply has no part or NSN attached.

**Task orders against a schedule contract.** When an order is placed against an existing contract — a GSA schedule, for example — SAM.gov publishes the two numbers joined together, like `GS35F235BA36C24226F0091`. GPH splits them: the results row shows the order number you searched for (`36C24226F0091`), and the detail panel names the parent contract (`GS35F235BA`) separately under **Parent contract**.

**Looking up a contract or award number.** Use the **Contract number** search instead. It looks through DLA order history first, and if the number isn't there — which is the case for every VA, Homeland Security, Interior, HHS and Agriculture contract — it looks for a matching award on SAM.gov and shows you the awardee, the amount and the award number.

**Award and order numbers are not solicitation numbers.** In a standard federal number the ninth character says what kind of document it is — `Q` is a request for quotation, `R` a request for proposals, while `F` is a task or delivery order and `C` a contract. SAM.gov files award notices under the same field as solicitations, so it is easy to paste one by mistake. A solicitation search will not return an award; it tells you the number is an award notice rather than leaving you to wonder whether you mistyped it.

For a number lookup you'll see **every version** of that number, newest first, rather than just the current one — the reposts are how a solicitation's amendment history is recorded, and you often want to see that an amendment answered vendor questions or moved the due date.

Dashes, spaces and capitalisation are ignored, so `N4523A-26-Q-1110`, `n4523a26q1110` and `N4523A 26 Q 1110` all find the same solicitation.

## Recent searches

A solicitation keyword search is saved to your recent searches once it returns something, the same as a parts search — including the number lookups that fall through to SAM.gov when a solicitation or contract has no parts behind it. Clicking one from the recent list re-runs it.

Two things are deliberately not saved: a search that found nothing, and a filters-only search with no keyword, which has no term to offer back. Filters are not part of the saved search, so re-running one restores the keyword and leaves the rail at its defaults.

## How this relates to bid matching

Searching is something you do; bid matching is something that runs for you. They cover the same ground here.

A bid-matching profile has an **Include SAM notices with no part link** setting. Turned on, your keyword conditions are evaluated against exactly the notices this search covers, and matches arrive in your results without you going looking. It's off by default, because it widens a profile into noisier ground.

A good way to use the two together: search here first to find out whether a keyword returns work worth having, then add that keyword to a profile once you know it does. See [Setting Up Bid-Matching Profiles](/help/bid-matching-profiles) and [Bid-Matching Recipes and Tuning](/help/bid-matching-recipes).
