---
title: "Setting up bid-matching profiles"
meta_title: "Setting Up Bid-Matching Profiles | GPH Help"
description: "Learn how to create, edit, and manage bid-matching profiles in Government Procurement Hub to automatically surface relevant federal solicitations."
---

A bid-matching profile tells GPH which incoming solicitations to flag as relevant to your business. Each profile defines a set of conditions — for example, "any solicitation in FSC 5310" or "any small business set-aside containing the word *carabiner* in the description." GPH evaluates these conditions against every new solicitation and surfaces the matches.

You can have multiple profiles, each targeting a different product line, customer segment, or competitive watch.

## Where to find your profiles

Go to **Account \> Bid-Matching Profile**. The page shows your existing profiles, your usage against the plan limit, and a **Create Profile** button.

## Create a profile

Click **Create Profile** to open the profile editor. You'll set four things:

1. **Profile name.** Choose something descriptive — for example, "FSC 5935 Alerts" or "Seal and Gasket Watch." This name appears on every match and in your alert emails.  
2. **Match logic.** Choose **AND** to require every condition to match, or **OR** to match any single condition. AND narrows your matches and is the right choice for most profiles. If you're watching several unrelated things, create separate profiles rather than one OR profile — your match reasons stay clearer and each profile is easier to tune.  
3. **Notes (optional).** Add context for your team — for example, the customer or product line this profile supports.  
4. **Conditions.** Click **\+ Add Condition** to define one or more rules. Each condition has a type (the field to check), an operator (how to compare), and a value. Your plan sets the maximum number of conditions per profile — the editor shows your limit as you add rows. The full list of condition types and operators is below.

When you're done, click **Create Profile** to save.

For guidance on *which* conditions to choose and worked examples for common goals, see [Bid-Matching Recipes and Tuning](/help/bid-matching-recipes).

## Condition types

Each condition checks one field on incoming solicitations. The editor groups the available types into two families, and the family determines which operators you can use.

### Keyword match

These match your words against a block of text. They use a single operator — **full-text match** — so you just type one or more keywords (see [Operators](#operators) below).

- **Part description keyword** — Keywords in the part's description. (DLA/DIBBS and SAM.gov)  
- **Procurement Item Description** — Keywords in the part's CTDF procurement item description. (DLA/DIBBS and SAM.gov)  
- **Technical characteristics** — Keywords in the part's technical characteristics, such as material, color, or finish. (DLA/DIBBS and SAM.gov)  
- **SAM keyword (Navy/Army/AF)** — Keywords in a SAM.gov notice's title or description. Covers Navy, Army, and Air Force notices only.  
- **End use (weapon system)** — Keywords in the name of a weapon system the part is used on — for example, `arleigh burke` or `abrams`. (DLA/DIBBS and SAM.gov)

### Identifier / code match

These match against a specific code or identifier. They support the four operators below (**is exactly**, the two **matches pattern** variants, and **is any of**).

- **NIIN** — Identifies one part by its 9-digit NIIN. You can paste a full 13-digit NSN and GPH strips the FSC prefix for you (for example, `5310-01-234-5678` becomes `01-234-5678`). A preview confirms the value GPH will save. (DLA/DIBBS and SAM.gov)  
- **FSC** — Matches all solicitations in a Federal Supply Class (4-digit category). (DLA/DIBBS and SAM.gov)  
- **Mfr part #** — Matches a specific manufacturer part number. (DLA/DIBBS and SAM.gov)  
- **CAGE code** — Matches the part's manufacturer CAGE, or any CAGE linked to the part (approved manufacturer or prior supplier). (DLA/DIBBS and SAM.gov)  
- **NAICS code** — Matches the NAICS classification of a vendor tied to the part (through the part's CAGEs) — not the solicitation's own NAICS. (DLA/DIBBS and SAM.gov)  
- **Set-Aside** — Matches solicitations reserved for specific business categories. Choose the set-aside codes from a picker (for example, `SDVOSBC`, `HZC` for HUBZone, or `WOSB`) — GPH stores canonical codes for you. Set-aside data is drawn from both DLA/DIBBS and SAM.gov, so a single Set-Aside condition covers solicitations from either source.  
- **PSC** — Matches a SAM.gov opportunity's Product Service Code. (SAM.gov only)

## Operators

The **identifier / code** condition types support four operators:

- **is exactly** — Matches one exact value.  
- **matches pattern (case-sensitive)** — Matches a wildcard pattern, respecting capitalization. You supply the `%` wildcard yourself: `5945%` matches anything beginning with 5945\. A pattern with no `%` behaves the same as **is exactly**.  
- **matches pattern (case-insensitive)** — The same, but capitalization is ignored. Most useful for names.  
- **is any of** — Matches any value from a list. Enter values comma-separated (for example, `5945,5950,5955`); you can also paste a comma-separated list. Useful when one condition needs to cover several variants. (For **Set-Aside**, "is any of" uses a code picker instead of free text.)

The **keyword match** condition types all use a single operator, **full-text match**, which searches for your keywords anywhere in the target text. It handles word order and word stems, so "pumps" also matches "pump." Enter one or more words — all of them must appear.

Each condition also has an **Exclude matches** checkbox. Check it to turn the condition into a negative filter — for example, to drop solicitations marked with a set-aside type that isn't relevant to your business. A profile needs at least one *non-excluded* condition; an all-exclude profile has nothing to match against, so GPH won't let you save one.

## Edit, deactivate, or delete a profile

Each profile on the Bid-Matching Profile page has three actions:

- **Edit** — Change the profile's name, logic, conditions, or notes.  
- **Deactivate** — Turn the profile off without deleting it. Deactivated profiles don't generate matches and don't count against your plan's profile limit, which makes them useful if you downgrade your plan or want to pause a profile temporarily.  
- **Delete** — Remove the profile permanently. This can't be undone.

To turn a deactivated profile back on, click **Activate**.

## Profile limits by plan

*Note: profile limits vary by plan. Free includes 1 profile, Basic includes 5, and Advanced includes 20\. Each plan also caps the number of conditions per profile — the editor shows your limit as you build a profile. Every condition type is available on every plan. Deactivated profiles don't count against your limit.*

## What happens after you save

Once a profile is active, GPH evaluates it against new solicitations daily. New matches appear under the **Bid-Matching** tab in the navigation, in the in-app notification bell (🔔), and in email alerts sent based on your notification preferences. If you edit a profile, the changes apply on the next day's run.

To learn how matches are scored, surfaced, and acted on, see [How Solicitation Matching Works](/help/solicitation-matching).

## Related articles

- [Bid-Matching Recipes and Tuning](/help/bid-matching-recipes) — Choose the right conditions, copy worked examples, and tune a noisy or quiet profile  
- [How Solicitation Matching Works](/help/solicitation-matching) — How GPH runs matches and how to read your results  
- [Notifications](/help/notifications) — Configure email alert frequency for bid matches  
- [Plans and Pricing](/help/plans-and-pricing) — Compare profile limits and other features by plan
