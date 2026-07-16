---
title: "Bid-matching recipes and tuning"
meta_title: "Bid-Matching Recipes and Tuning | GPH Help"
description: "Choose the right conditions for your bid-matching profiles, copy worked examples for common goals, and tune a profile that's returning too many or too few matches."
---

This is the practical companion to [Setting Up Bid-Matching Profiles](/help/bid-matching-profiles). That article covers the mechanics of the profile editor; this one helps you decide *which* conditions to use, gives you copy-and-adapt recipes for common goals, and walks through what to do when a profile returns too many or too few matches.

If you read nothing else: most profiles want **AND** logic, at least one **strong identifier** (NIIN, Mfr part #, or CAGE code), and one or two **narrowing** conditions (FSC or Set-Aside) to keep the noise down.

## Before you start

Have these on hand. You don't need all of them — even one well-chosen condition is enough to begin, and you can refine over time.

- The **NIINs** or **NSNs** you care about (paste NSNs — GPH strips the FSC for you).  
- The **FSCs** (4-digit categories) your business covers.  
- Whether you want only **set-aside** solicitations, and which categories.  
- Any **manufacturer part numbers** or **CAGE codes** you regularly bid against.  
- Optional: a list of words to **exclude** (for example, "prototype" or "sample") if a broad filter would otherwise be noisy.

## Choosing conditions

### When to use NIIN

You know the specific parts you want to bid on, even if it's hundreds of them. NIINs are the most precise condition you can write. NSN pastes are fine — GPH stores the 9-digit NIIN. Use **is any of** for a list, **is exactly** for one.

### When to use FSC

You bid across a *category* of parts and don't have an exhaustive NIIN list — or you want to catch new NIINs in a category as they appear. FSC is a broad filter and will be noisy on its own, so pair it with a narrowing condition (Set-Aside, or a keyword condition) under AND. Use **is exactly** for one FSC, **is any of** for several.

### When to use Mfr part # or CAGE code

You bid against specific manufacturers' parts or specific CAGE-coded suppliers. These behave like NIIN — strong identifiers that produce high-confidence matches. Use **is exactly** or **is any of**.

### When to use a keyword condition

You're watching a *concept* the catalog doesn't model as a code — "pump," "relay," "hydraulic." Keyword conditions all use **full-text match**, which handles word order and stems ("pumps" matches "pump"), so type the keywords plainly; all your words must appear. Pick the field the keyword lives in:

- **Part description keyword** — the everyday part description. The best first choice for a concept search.  
- **Procurement Item Description** — the CTDF procurement item description, useful when the plain description is thin.  
- **Technical characteristics** — material, color, finish, and similar attributes.  
- **End use (weapon system)** — the weapon system a part is used on (for example, `abrams`, `arleigh burke`), when you want everything tied to a platform.  
- **SAM keyword (Navy/Army/AF)** — text in Navy, Army, and Air Force SAM.gov notices, for opportunities that live outside DIBBS.

Use a keyword condition as a complement to FSC or an identifier, not usually as the only condition.

### When to use Set-Aside

Use this when you only want solicitations reserved for a business category you qualify for. A single Set-Aside condition covers both DLA/DIBBS and SAM.gov solicitations, so you don't need separate conditions per source. Use **is any of** to pick several categories at once from the code picker (for example, `SDVOSBC`, `HZC`, `WOSB`).

### When to use NAICS code or PSC

- **NAICS code** matches the NAICS classification of a vendor tied to the part — useful when you think in terms of the industry code you compete under rather than specific parts.  
- **PSC** matches a SAM.gov opportunity's Product Service Code, so it only narrows SAM.gov opportunities. Pair it with other conditions if you also care about DIBBS.

## Strong vs. weak conditions

The condition type you pick determines whether a match is labeled **Hard** or **Soft** on your results page. The rule of thumb: conditions that pinpoint a **specific part** produce Hard hits; broader **category, code, and keyword** conditions produce Soft hits.

| Strong (produces Hard hits) | Weak (produces Soft hits) |
| :---- | :---- |
| NIIN | FSC |
| Mfr part # | Set-Aside |
| CAGE code | NAICS code |
|  | PSC |
|  | Any keyword condition (Part description, Procurement Item Description, Technical characteristics, SAM keyword, End use) |

A profile built only from weak conditions will only ever produce Soft hits. There's nothing wrong with that — *"any SDVOSB 5945 solicitation"* is a legitimate watch — but if you want to filter your results down to the highest-confidence matches, include at least one strong condition. See [How Solicitation Matching Works](/help/solicitation-matching) for how Hard and Soft hits appear on the results page.

## Recipes

### Watch a list of NIINs

One condition: **NIIN** · **is any of** · paste your list. NSNs are accepted and stored as NIINs.

### Watch a category, set-aside only

Two conditions under **AND**:

1. **FSC** · **is any of** · your FSCs  
2. **Set-Aside** · **is any of** · `SDVOSBC`

Result: high signal, manageable volume.

### Watch your NIINs, narrowed to a set-aside

Two conditions under **AND**:

1. **NIIN** · **is any of** · your list  
2. **Set-Aside** · **is any of** · `SDVOSBC,HZC,WOSB`

### Cast a wide net, but drop the noise

Three conditions under **AND**:

1. **FSC** · **is exactly** · `5945`  
2. **Part description keyword** · **full-text match** · `prototype` · **Exclude**  
3. **Part description keyword** · **full-text match** · `sample` · **Exclude**

### Watch small-business set-asides

One condition: **Set-Aside** · **is any of** · `SDVOSBC,HZC,WOSB`. Pair it with an FSC or keyword condition under AND to narrow further.

### Watch everything tied to a platform

One condition: **End use (weapon system)** · **full-text match** · `arleigh burke`. Add an FSC or Set-Aside condition under AND if the platform is too broad on its own.

### Track two unrelated programs

Make **two profiles** — "Program A" and "Program B" — rather than one OR profile. You'll see which program a hit came from in the match reason, and you can tune each profile without affecting the other.

## Tuning over time

### Too many matches

In rough order of how much they help:

1. **Switch to AND** if you're on OR.  
2. **Add a narrowing condition** — Set-Aside or FSC if you're matching on a keyword.  
3. **Add an Exclude** for the noise words you keep seeing.  
4. **Use Hard hits only** on the results page as a quick filter without changing the profile.  
5. **Split one busy profile into two** narrower ones.

### Too few matches, or none

Check these in order:

1. The profile is **Active**. Deactivated profiles don't produce matches.  
2. It has at least one **non-excluded** condition.  
3. **Operator and type make sense together** — keyword conditions only use *full-text match*; identifier conditions use *is exactly*, *matches pattern*, or *is any of*. The editor already restricts each type to the operators it supports.  
4. **Pattern values include `%`** if you're using *matches pattern*. Without `%`, the pattern matches the literal string.  
5. **AND logic isn't over-narrowing.** Does any single condition fire when you remove the others?  
6. **The matcher has had time to run.** Matching runs daily, so give it up to 24 hours after creating a profile.

### I changed something and now nothing matches

Most often this is a *matches pattern* value with no `%` — the editor warns about this. Less often, it's a new condition added under AND that filters out everything the profile used to catch. Remove the new condition to confirm, then reintroduce it more loosely.

## Related articles

- [Setting Up Bid-Matching Profiles](/help/bid-matching-profiles) — Create, edit, and manage profiles  
- [How Solicitation Matching Works](/help/solicitation-matching) — How GPH runs matches and how to read your results  
- [Notifications](/help/notifications) — Configure email alert frequency for bid matches
