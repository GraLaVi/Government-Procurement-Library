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

The left sidebar lists each run date with the total number of matches generated that day. Selecting a date reveals the match list for that run.

New matches also appear in the in-app notification bell (🔔) at the top of the page, so you're alerted without opening the Bid-Matching tab. See [Notifications](/help/notifications#the-notification-bell-in-app-alerts) to turn the bell on or off and choose how matches are grouped.

## Reading a match

Each match row shows:

- **Solicitation.** The solicitation number, with the source agency (DLA, DIBBS, or other) shown below. Solicitations that have changed carry a badge — see [Amended and updated solicitations](#amended-and-updated-solicitations) below.  
- **Status.** The current state of the solicitation (most commonly **open**, meaning it's still accepting bids).  
- **Close Date.** The deadline for submitting your bid. Use this to prioritize matches by urgency.  
- **Profile.** Which of your profiles matched this solicitation. If you have multiple profiles, this tells you which one to credit — or to refine.  
- **Match.** A label and reason explaining why this solicitation triggered. For example, *keyword 'carabiner' in description* tells you exactly which condition fired. Each match also carries a **Hard** or **Soft** badge — see [Filtering and searching matches](#filtering-and-searching-matches).

## Amended and updated solicitations

Buyers sometimes change a solicitation after posting it — extending the close date, revising a quantity, or flipping a set-aside. GPH tracks these changes and flags them on the match row with one of two badges:

- **Amended** (yellow) — the solicitation was changed *before* your match was generated. Often the amendment is the reason the match exists (for example, the set-aside flipped to one of yours).  
- **Updated** (blue, e.g. *"Updated 3d ago"*) — the solicitation has changed *since* your match was generated. Worth a second look, as the close date or requirements may have moved.

Click either badge to open a timeline showing every recorded change on the solicitation — what changed, when, and via which source. The same **Amended** indicator also appears on the **Open Solicitations** (Vendor results) and **Recent Solicitations** (Parts results) tabs, so you can see amendment activity even on solicitations you weren't matched on. See [Viewing solicitations and contracts](/help/solicitations-and-contracts) for how to open the PDF and review amendment history.

## Filtering and searching matches

Two filters appear above the match list:

- **Hard hits only.** Limits the results to your highest-confidence matches. A match is **Hard** when it fired on a strong identifier that pinpoints a specific part — **NIIN, Mfr part #, or CAGE code**. It's **Soft** when it came from a broader filter — **FSC, NAICS code, PSC, Set-Aside, or any keyword condition**. Soft hits are useful for discovery; Hard hits are usually parts you already bid on. For how condition choice drives this, see [Bid-Matching Recipes and Tuning](/help/bid-matching-recipes#strong-vs-weak-conditions).  
- **Search match reason.** Find matches that triggered on a specific term or condition by typing into this field.

You can also filter the list by run date and issue date.

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
