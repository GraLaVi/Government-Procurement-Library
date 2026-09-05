---
title: "How solicitation matching works"
meta_title: "How Solicitation Matching Works | GPH Help"
description: "Understand how Government Procurement Hub matches federal solicitations to your bid-matching profiles, where to find your matches, and how to interpret match results."
---

GPH's matching engine connects your bid-matching profiles to incoming federal solicitations. Once you've created a profile, you don't need to search for opportunities — they surface automatically.

This article explains how the matching engine runs, where to find your matches, and how to read them.

## How matching runs

GPH ingests new solicitations daily from DLA, DIBBS, and SAM.gov. After ingestion, the matching engine evaluates each new solicitation against every active bid-matching profile in your organization. Any solicitation that satisfies a profile's conditions becomes a match.

Because matching runs once a day, edits to your profiles take effect on the following day's run.

## Where to find your matches

Click **Bid-Matching** in the main navigation to open your match history. The page shows every match generated against your organization's active profiles, organized by run date.

The date picker at the left of the toolbar lists each run date with the number of matches that run produced. Select a run date to load everything it found. The page opens on your most recent run, so the newest matches are the first thing you see. Keeping the dates in a dropdown rather than a fixed sidebar gives the results table the full width of the page.

A run that turned up solicitations posted on more than one day carries an expand arrow. Click the arrow to break the run out by posted date and pick one to narrow the list; click the run date itself to go back to the whole run. Runs that found everything on a single posted date have nothing to expand, so they show no arrow.

New matches also appear in the in-app notification bell (🔔) at the top of the page, so you're alerted without opening the Bid-Matching tab. See [Notifications](/help/notifications#the-notification-bell-in-app-alerts) to turn the bell on or off and choose how matches are grouped.

## Run date and posted date

These are two different dates, and the difference explains most of what the picker shows you:

- **Run date** — when GPH's matching engine found the solicitation for you.
- **Posted date** — when the government put the solicitation on the street. This is the **Posted** column in the results table.

Most of what a run finds was posted that same day. The rest is older, for one of two reasons:

- **It arrived late.** DIBBS and SAM.gov don't always publish a solicitation on the day it's dated, so a day's harvest routinely brings in solicitations posted earlier — sometimes weeks earlier.  
- **An amendment changed it.** The solicitation was already in GPH but didn't match your profiles. A buyer then amended it — adding a line item, revising a quantity, flipping a set-aside — and the amended version does match. These rows carry an **Amended** badge; see [Amended and updated solicitations](#amended-and-updated-solicitations).

Either way it's a first match, not a repeat. Once you've been matched on a solicitation, GPH won't surface it for you again on a later run.

So one run typically spans dozens of posted dates: the bulk from that day, plus a scattering going back weeks. That's why the picker offers both levels — the run date answers *what's new since I last looked*, and a posted date answers *what came out on this particular day*.

Older posted dates are worth reading rather than skipping. Those solicitations have been on the street longer, so their deadlines are nearer. The results are sorted by **Close Date** by default, which puts the most urgent first no matter when anything was posted.

## Reading a match

Each match row shows:

- **★.** Flag a solicitation to come back to it — see [Flagging solicitations to work later](#flagging-solicitations-to-work-later).  
- **Solicitation.** The solicitation number, with the source agency (DLA, DIBBS, or other) shown below. Solicitations that have changed carry a badge — see [Amended and updated solicitations](#amended-and-updated-solicitations) below. Fast-award candidates carry a green **lightning bolt**, meaning the buy can be awarded before its close date — prioritize quoting these; see [Solicitation type indicators](/help/solicitations-and-contracts#solicitation-type-indicators).  
- **NSN.** The line item that triggered the match, or the solicitation's largest line where nothing more specific was recorded. The NSN links into Parts Search in a new tab. When the solicitation carries more items, a **+N more** button expands the row to list them all.  
- **Description, Qty, UOM.** The same line item's description, quantity, and unit of issue.  
- **Est. Value.** Line quantities × the government acquisition cost, so the same solicitation reports the same figure here and in the Send RFQs queue.  
- **Posted** and **Close Date.** When the solicitation was issued and the deadline for your bid. Use the close date to prioritize by urgency.  
- **Set-Aside.** The set-aside code (for example **HZC**). Hover for the full name.  
- **Status.** The current state of the solicitation (most commonly **open**, meaning it's still accepting bids).

Two badges can appear next to the NSN:

- **FAT** — the solicitation requires a contractor First Article Test. Click it for what that commits you to. See [First article requirements](#first-article-requirements).  
- **A trophy with a number** — you have won this part before, that many times. Click it for your award history, including what you charged. See [Parts you have won before](#parts-you-have-won-before).

**Which profile matched, and why,** now lives in the expanded row rather than its own columns. Click the arrow at the left of any row to see the profile name, the **Hard** or **Soft** badge, and the reason the match fired — for example *keyword 'carabiner' in description* — alongside the full line-item list.

## Sorting the results

Click a column heading to sort: **Solicitation**, **Qty**, **Est. Value**, **Close Date**, or the **★** column. Sorting runs across every match in the run, not just the rows currently on screen, so the top of the list is genuinely the largest order or the soonest deadline.

The first click picks the direction that column is actually useful in — the biggest quantity and value first, but the *soonest* close date, since that is the urgent end. Click again to reverse it.

## Flagging solicitations to work later

A single run can carry hundreds or thousands of matches. Click the **★** on any row to flag it, then sort by the **★** column to bring everything you flagged to the top, or switch on **Flagged only** in the toolbar to see nothing else.

Flags belong to your organization, not to you personally: everyone on your account sees the same flagged solicitations, so a buyer can mark a batch and a colleague can pick them up. Flags stay put after a solicitation closes.

## Parts you have won before

When you have previously been awarded a contract for the part on a row, it carries a trophy badge with the number of times you have won it. Click it to see your award history for that part — contract number, date, quantity, and the unit price you were awarded, which is usually the most useful number on the page when you are deciding what to bid.

When the most recent award is more than five years old the badge loses its fill and shows as an outline. The award still counts; the price is old enough that material costs have likely moved, so the popover names the year and tells you to treat it as history rather than a guide.

The badge reflects awards made to your own CAGE code. Work delivered as a subcontractor under another company's CAGE is that company's award and does not appear.

## First article requirements

Some solicitations require a **first article test**: before you may ship full production quantities, you must produce initial sample units and have them approved. It is ordered as a separate line on the solicitation, and it adds real cost and lead time to a bid.

Rows carrying one show a **FAT** badge next to the NSN — the abbreviation buyers use for First Article Test. Click it for the specifics, including the FAR clause the requirement falls under. Because the requirement is recorded as a placeholder line rather than a purchasable part, it is not counted in the row's item count and never shown as the row's NSN.

## Amended and updated solicitations

Buyers sometimes change a solicitation after posting it — extending the close date, revising a quantity, or flipping a set-aside. GPH tracks these changes and flags them on the match row with one of two badges:

- **Amended** (yellow) — the solicitation was changed *before* your match was generated. Often the amendment is the reason the match exists (for example, the set-aside flipped to one of yours).  
- **Updated** (blue, e.g. *"Updated 3d ago"*) — the solicitation has changed *since* your match was generated. Worth a second look, as the close date or requirements may have moved.

Click either badge to open a timeline showing every recorded change on the solicitation — what changed, when, and via which source. The same **Amended** indicator also appears on the **Open Solicitations** (Vendor results) and **Solicitations** (Parts results) tabs, so you can see amendment activity even on solicitations you weren't matched on. See [Viewing solicitations and contracts](/help/solicitations-and-contracts) for how to open the PDF and review amendment history.

## Filtering and searching matches

The toolbar above the match list carries:

- **Hard hits only.** Limits the results to your highest-confidence matches. A match is **Hard** when it fired on a strong identifier that pinpoints a specific part — **NIIN, Mfr part #, or CAGE code**. It's **Soft** when it came from a broader filter — **FSC, NAICS code, PSC, Set-Aside, or any keyword condition**. Soft hits are useful for discovery; Hard hits are usually parts you already bid on. For how condition choice drives this, see [Bid-Matching Recipes and Tuning](/help/bid-matching-recipes#strong-vs-weak-conditions).  
- **Flagged only.** Shows just the solicitations your organization has flagged — see [Flagging solicitations to work later](#flagging-solicitations-to-work-later).  
- **Search.** Pick which field to search, then type your term. The options are:
  - **Match reason** — find matches that triggered on a specific term or condition.
  - **Description** — find solicitations by what the item *is*. This searches every line item on the solicitation, not only the one shown on the row, so a search for *bearing* finds a solicitation that lists one anywhere.
  - **NSN / part #** — search by NSN, NIIN, or manufacturer part number, again across every line item.
  - **Solicitation #** — jump straight to a known solicitation number.

Searching and sorting apply to the whole run, not just the page you are looking at, and the results reset to page 1 whenever you change either.

You can also narrow the list to a single posted date from the date picker — see [Run date and posted date](#run-date-and-posted-date).

## How matches connect to email alerts

Every match appears on your Bid-Matching results page regardless of plan. Email alerts are separate — they're sent only to users who have opted in to **Bid Matching Alerts** in their notification preferences, at the frequency they've chosen.

Alert frequency options vary by plan:

- **Free** — Off or Weekly  
- **Basic** — Off, Weekly, or Daily  
- **Advanced** — Off, Weekly, Daily, or Immediate

To change your alert frequency, see [Notifications](/help/notifications).

## When matches stop appearing

If you're no longer seeing matches, check these in order:

1. **Profile status.** Make sure at least one profile is **Active**. Deactivated profiles don't generate matches. Note that downgrading a plan can result in profiles being deactivated to fit the new profile limit.  
2. **Conditions.** If your conditions are too narrow (especially with AND logic), you may not be matching anything. Try removing a restrictive condition, or split independent watches into separate profiles.  
3. **Recent edits.** If you edited a profile today, changes won't reflect until tomorrow's run.

For a fuller walkthrough of tuning a noisy or quiet profile, see [Bid-Matching Recipes and Tuning](/help/bid-matching-recipes#tuning-over-time).

## Related articles

- [Setting Up Bid-Matching Profiles](/help/bid-matching-profiles) — Create, edit, and deactivate the profiles that drive matching  
- [Bid-Matching Recipes and Tuning](/help/bid-matching-recipes) — Choose conditions, copy worked examples, and tune your matches  
- [Notifications](/help/notifications) — Configure email alert frequency for bid matches  
- [Plans and Pricing](/help/plans-and-pricing) — Compare alert frequency and profile limits by plan
