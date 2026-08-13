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

The date picker at the left of the toolbar lists each run date with the total number of matches generated that day. Open it and select a date to load that run's matches. Keeping the dates in a dropdown rather than a fixed sidebar gives the results table the full width of the page.

New matches also appear in the in-app notification bell (🔔) at the top of the page, so you're alerted without opening the Bid-Matching tab. See [Notifications](/help/notifications#the-notification-bell-in-app-alerts) to turn the bell on or off and choose how matches are grouped.

## Reading a match

Each match row shows:

- **★.** Flag a solicitation to come back to it — see [Flagging solicitations to work later](#flagging-solicitations-to-work-later).  
- **Solicitation.** The solicitation number, with the source agency (DLA, DIBBS, or other) shown below. Solicitations that have changed carry a badge — see [Amended and updated solicitations](#amended-and-updated-solicitations) below. Fast-award candidates carry a green **Fast Award** badge, meaning the buy can be awarded before its close date — prioritize quoting these; see [Solicitation type indicators](/help/solicitations-and-contracts#solicitation-type-indicators).  
- **NSN.** The line item that triggered the match, or the solicitation's largest line where nothing more specific was recorded. The NSN links into Parts Search in a new tab. When the solicitation carries more items, a **+N more** button expands the row to list them all.  
- **Description, Qty, UOM.** The same line item's description, quantity, and unit of issue.  
- **Est. Value.** Line quantities × the government acquisition cost, so the same solicitation reports the same figure here and in the Send RFQs queue.  
- **Posted** and **Close Date.** When the solicitation was issued and the deadline for your bid. Use the close date to prioritize by urgency.  
- **Set-Aside.** The set-aside code (for example **HZC**). Hover for the full name.  
- **Status.** The current state of the solicitation (most commonly **open**, meaning it's still accepting bids).

Two badges can appear next to the NSN:

- **FIRST ARTICLE** — the solicitation requires a contractor first article test. Click it for what that commits you to. See [First article requirements](#first-article-requirements).  
- **★ WON n×** — you have won this part before. Click it for your award history, including what you charged. See [Parts you have won before](#parts-you-have-won-before).

**Which profile matched, and why,** now lives in the expanded row rather than its own columns. Click the arrow at the left of any row to see the profile name, the **Hard** or **Soft** badge, and the reason the match fired — for example *keyword 'carabiner' in description* — alongside the full line-item list.

## Sorting the results

Click a column heading to sort: **Solicitation**, **Qty**, **Est. Value**, **Close Date**, or the **★** column. Sorting runs across every match in the run, not just the rows currently on screen, so the top of the list is genuinely the largest order or the soonest deadline.

The first click picks the direction that column is actually useful in — the biggest quantity and value first, but the *soonest* close date, since that is the urgent end. Click again to reverse it.

## Flagging solicitations to work later

A single run can carry hundreds or thousands of matches. Click the **★** on any row to flag it, then sort by the **★** column to bring everything you flagged to the top, or switch on **Flagged only** in the toolbar to see nothing else.

Flags belong to your organization, not to you personally: everyone on your account sees the same flagged solicitations, so a buyer can mark a batch and a colleague can pick them up. Flags stay put after a solicitation closes.

## Parts you have won before

When you have previously been awarded a contract for the part on a row, it carries a **★ WON n×** badge. Click it to see your award history for that part — contract number, date, quantity, and the unit price you were awarded, which is usually the most useful number on the page when you are deciding what to bid.

Awards older than five years show the badge without its fill and with the year on the face. The award still counts; the price is old enough that material costs have likely moved, so treat it as history rather than a guide.

The badge reflects awards made to your own CAGE code. Work delivered as a subcontractor under another company's CAGE is that company's award and does not appear.

## First article requirements

Some solicitations require a **first article test**: before you may ship full production quantities, you must produce initial sample units and have them approved. It is ordered as a separate line on the solicitation, and it adds real cost and lead time to a bid.

Rows carrying a contractor first article test show a **FIRST ARTICLE** badge next to the NSN. Click it for the specifics. Because the requirement is recorded as a placeholder line rather than a purchasable part, it is not counted in the row's item count and never shown as the row's NSN.

## Amended and updated solicitations

Buyers sometimes change a solicitation after posting it — extending the close date, revising a quantity, or flipping a set-aside. GPH tracks these changes and flags them on the match row with one of two badges:

- **Amended** (yellow) — the solicitation was changed *before* your match was generated. Often the amendment is the reason the match exists (for example, the set-aside flipped to one of yours).  
- **Updated** (blue, e.g. *"Updated 3d ago"*) — the solicitation has changed *since* your match was generated. Worth a second look, as the close date or requirements may have moved.

Click either badge to open a timeline showing every recorded change on the solicitation — what changed, when, and via which source. The same **Amended** indicator also appears on the **Open Solicitations** (Vendor results) and **Recent Solicitations** (Parts results) tabs, so you can see amendment activity even on solicitations you weren't matched on. See [Viewing solicitations and contracts](/help/solicitations-and-contracts) for how to open the PDF and review amendment history.

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

You can also filter the list by run date and issue date from the date picker.

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
