---

## **URL:** `/help/bid-matching-profiles` **Page title:** Setting Up Bid-Matching Profiles | GPH Help **Meta description:** Learn how to create, edit, and manage bid-matching profiles in Government Procurement Hub to automatically surface relevant federal solicitations. **H1:** Setting up bid-matching profiles

A bid-matching profile tells GPH which incoming solicitations to flag as relevant to your business. Each profile defines a set of conditions — for example, "any solicitation in FSC 5310" or "any small business set-aside containing the word *carabiner* in the description." GPH evaluates these conditions against every new solicitation and surfaces the matches.

You can have multiple profiles, each targeting a different product line, customer segment, or competitive watch.

## Where to find your profiles

Go to **Account \> Bid-Matching Profile**. The page shows your existing profiles, your usage against the plan limit, and a **Create Profile** button.

## Create a profile

Click **Create Profile** to open the profile editor. You'll set four things:

1. **Profile name.** Choose something descriptive — for example, "FSC 5935 Alerts" or "Seal and Gasket Watch." This name appears on every match and in your alert emails.  
2. **Match logic.** Choose **AND** to require every condition to match, or **OR** to match any single condition. AND narrows your matches and is the right choice for most profiles. If you're watching several unrelated things, create separate profiles rather than one OR profile — your match reasons stay clearer and each profile is easier to tune.  
3. **Notes (optional).** Add context for your team — for example, the customer or product line this profile supports.  
4. **Conditions.** Click **\+ Add Condition** to define one to five rules. Each condition has a type (the field to check), an operator (how to compare), and a value. The full list of condition types and operators is below.

When you're done, click **Create Profile** to save.

For guidance on *which* conditions to choose and worked examples for common goals, see [Bid-Matching Recipes and Tuning](http:///help/bid-matching-recipes).

## Condition types

Each condition checks one field on incoming solicitations. The available types are:

- **NIIN** — Identifies one part by its 9-digit NIIN. You can paste a full 13-digit NSN and GPH strips the FSC prefix for you (for example, `5310-01-234-5678` becomes `01-234-5678`). A preview confirms the value GPH will save.  
- **FSC Code** — Matches all solicitations in a Federal Supply Class (4-digit category).  
- **Mfg Part Number** — Matches a specific manufacturer part number.  
- **Part Description** — Matches keywords appearing anywhere in a solicitation's part description.  
- **Set-Aside** — Matches solicitations reserved for specific business categories (SBA, HUBZone, SDVOSBC, 8(a), WOSB, and others). Set-aside data is drawn from both DLA/DIBBS and SAM.gov, so a single Set-Aside condition covers solicitations from either source.  
- **CAGE Code** — Matches solicitations associated with a specific vendor.  
- **Status** — Matches by solicitation status — for example, **Open** or **Closed**.

## Operators

Most condition types support four operators:

- **is exactly** — Matches one exact value.  
- **matches pattern (case-sensitive)** — Matches a wildcard pattern, respecting capitalization. You supply the `%` wildcard yourself: `5945%` matches anything beginning with 5945\. A pattern with no `%` behaves the same as **is exactly**.  
- **matches pattern (case-insensitive)** — The same, but capitalization is ignored. Most useful for descriptions and names.  
- **is any of** — Matches any value from a list. Enter values comma-separated with no spaces (for example, `5945,5950,5955`); you can also paste a comma-separated list. Useful when one condition needs to cover several variants.

The **Part Description** condition uses a fifth operator, **full-text match**, which searches for your keywords anywhere in the part description text. It handles word order and word stems, so "pumps" also matches "pump."

Each condition also has an **Exclude matches** checkbox. Check it to turn the condition into a negative filter — for example, to drop solicitations marked with a set-aside type that isn't relevant to your business. A profile needs at least one *non-excluded* condition; an all-exclude profile has nothing to match against, so GPH won't let you save one.

## Edit, deactivate, or delete a profile

Each profile on the Bid-Matching Profile page has three actions:

- **Edit** — Change the profile's name, logic, conditions, or notes.  
- **Deactivate** — Turn the profile off without deleting it. Deactivated profiles don't generate matches and don't count against your plan's profile limit, which makes them useful if you downgrade your plan or want to pause a profile temporarily.  
- **Delete** — Remove the profile permanently. This can't be undone.

To turn a deactivated profile back on, click **Activate**.

## Profile limits by plan

*Note: profile limits vary by plan. Free includes 1 profile, Basic includes 5, and Advanced includes 20\. All plans support up to 5 conditions per profile. Deactivated profiles don't count against your limit.*

## What happens after you save

Once a profile is active, GPH evaluates it against new solicitations daily. New matches appear under the **Bid-Matching** tab in the navigation, and email alerts are sent based on your notification preferences. If you edit a profile, the changes apply on the next day's run.

To learn how matches are scored, surfaced, and acted on, see [How Solicitation Matching Works](http:///help/solicitation-matching).

## Related articles

- [Bid-Matching Recipes and Tuning](http:///help/bid-matching-recipes) — Choose the right conditions, copy worked examples, and tune a noisy or quiet profile  
- [How Solicitation Matching Works](http:///help/solicitation-matching) — How GPH runs matches and how to read your results  
- [Notifications](http:///help/notifications) — Configure email alert frequency for bid matches  
- [Plans and Pricing](http:///help/plans-and-pricing) — Compare profile limits and other features by plan

