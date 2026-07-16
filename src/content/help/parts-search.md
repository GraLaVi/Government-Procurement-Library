---
title: "Searching for parts"
meta_title: "Searching for Parts | GPH Help"
description: "Learn how to search for parts in Government Procurement Hub, read part records, and use the data tabs that provide complete part intelligence."
---

The Library Search lets you look up any part in the federal procurement catalog by its NSN, NIIN, solicitation number, manufacturer part number, contract number, or description. Once you've found a part, GPH shows everything it knows about that item across a set of detailed tabs — from procurement history and recent solicitations to manufacturers, technical specs, and packaging requirements. How many tabs you see depends on your plan; the tabs below are listed in the order they appear.

## In this article

- [Where to search](#where-to-search)  
- [The five search types](#the-five-search-types)  
- [Reading a part record](#reading-a-part-record)  
- [Overview tab](#overview-tab)  
- [Procurement History tab](#procurement-history-tab)  
- [Recent Solicitations tab](#recent-solicitations-tab)  
- [Manufacturers tab](#manufacturers-tab)  
- [Technical Characteristics tab](#technical-characteristics-tab)  
- [End Use Description tab](#end-use-description-tab)  
- [Packaging Information tab](#packaging-information-tab)  
- [Procurement Item Description tab](#procurement-item-description-tab)  
- [Recent and pinned searches](#recent-and-pinned-searches)  
- [Exporting data](#exporting-data)

## Where to search

GPH offers two entry points for part search.

**Dashboard quick search.** The **Search by NSN/NIIN** bar at the top of your dashboard is the fastest way to look up a part by its NSN or NIIN. Type or paste the number and click **Go**.

**Library Search.** For full search options, click **Library Search** in the main navigation. The Library Search page lets you search by any of five fields, view recent searches, and pin frequently used searches.

## The five search types

On the Library Search page, choose a search type using the radio buttons above the search bar:

- **NSN/NIIN** — Search by National Stock Number or National Item Identification Number. Either format works. You can paste a full 13-digit NSN (e.g., `5306-001234567`) or just the 9-digit NIIN (e.g., `00-001-0882`).  
- **Solicitation number** — Look up a specific solicitation by its identifier.  
- **Mfg Part Number** — Find a part by its manufacturer part number. Useful when you know the OEM part code but not the NSN.  
- **Contract number** — Find parts associated with a specific contract.  
- **Description** — Search by keywords in the part description. Use this when you know what the part is but not what it's called in the system.

## Reading a part record

When you select a part from the search results, GPH opens its full record. At the top, you'll see the NSN, the part description (e.g., *TUBE ASSEMBLY, METAL*), and a series of tabs covering different aspects of the part. Parts that exist only as a manufacturer part number with no assigned NSN (common for DIBBS records) carry a **P/N only — no NSN** badge in the header.

Each tab name includes a count in parentheses showing how many records are available — for example, "Procurement History (9)" or "Manufacturers (8)." Tabs with zero records are still selectable but contain no data for that part.

The data shown in each tab is described below.

## Overview tab

The Overview tab is the part's at-a-glance summary. A **hero card** at the top restates the part description and its identity, followed by three cards:

- **Identifiers.** The part's NSN, NIIN, and FSC (Federal Supply Class). Hover the FSC to see its **Federal Supply Classification** description. For part-number-only records with no NSN, this card shows the CAGE and manufacturer part number instead.  
- **Part Details.** The part description, its **Unit of Issue**, and its standard price (if known).  
- **Part Codes.** Management codes describing how the government catalogs and acquires the part — **DLA** (Item Description Segment), **AMC** (Acquisition Method Code), **PIC** (Procurement Info Code), and **SLC** (Shelf Life Code). Each code links to the **Code Definitions** reference.

## Procurement History tab

The Procurement History tab shows past contract awards for the part. Columns are **Contract #**, **Date**, **CAGE**, **Vendor**, **Qty**, **Unit Price**, and **Total** (the total contract value).

The **CAGE** column links to the awarded vendor's profile — useful for researching competitive history on the part — and the **Contract #** cell has an icon button that opens the award document as a PDF. To learn more about viewing contract documents, see [Viewing solicitations and contracts](/help/solicitations-and-contracts).

*Note: this tab is available on the Advanced plan.*

## Recent Solicitations tab

The Recent Solicitations tab shows active and recently closed solicitations for the part. Each row includes:

- **Close Date** — When the bid window closes  
- **Solicitation \#** — The solicitation identifier. DLA solicitations with a PDF open it in a viewer; SAM.gov opportunities open on SAM.gov.  
- **Purchase req** — The internal purchase requisition number  
- **Status** — Solicitation status (open, closed, and so on)  
- **Rating** — The solicitation's DPAS (Defense Priorities and Allocations System) rating, a government-assigned priority for defense and emergency orders. **DX** is the highest national-defense priority and **DO** is the standard priority; both take precedence over unrated commercial work. Most solicitations are unrated and show a dash.  
- **Agency** — Source agency (DLA, DIBBS, or other)  
- **Set-Aside** — The set-aside category, shown as a code badge; hover it for the full label  
- **Qty** — Required quantity (with unit of measure)  
- **Est. Value** — Estimated contract value  
- **Buyer** — The contracting officer or buyer name  
- **Buyer contact** — Email (with a copy button) or phone for the buyer, where available

Solicitations that have been changed show an amber **Amended** badge (with a **×N** count for multiple amendments); click it for a change timeline. SAM.gov rows that carry attachments show a documents button with the attachment count. To learn more about viewing a solicitation PDF or amendment history, see [Viewing solicitations and contracts](/help/solicitations-and-contracts).

*Note: on the Free plan this tab shows a count of recent solicitations and an upgrade prompt rather than the full table.*

## Manufacturers tab

The Manufacturers tab lists every known manufacturer or supplier of the part, including:

- **CAGE** — The manufacturer's CAGE code (clickable to their vendor profile)  
- **Vendor Name** — The company name  
- **Source** — An **Approved** badge marks government-approved sources for the part  
- **Part Number** — The manufacturer's internal part number  
- **RNCC** and **RNVC** — Government cataloging codes describing the relationship between the manufacturer's part number and the NSN

This is the part's competitive intelligence at a glance — you can see exactly who else makes or supplies the part.

If you have the RFQ add-on, this tab is also where you start a Request for Quote: select one or more vendors and click **Create RFQ** to send them a quote request. See [Sending RFQs to vendors](/help/requests-for-quote) for the full workflow.

## Technical Characteristics tab

The Technical Characteristics tab shows specifications and attributes of the part — material composition, dimensions, performance characteristics, operating parameters, and other technical details. The format is key-value pairs (for example, *TUBE TYPE: MICROWAVE*).

Coverage varies by part: some parts have only one or two characteristics, others have dozens.

## End Use Description tab

The End Use Description tab tells you which military platforms or equipment use the part — for example, HEMTT trucks, Oshkosh M-ATV, light hydraulic cranes, or specific weapons systems.

For suppliers, this is useful context: it tells you which programs your parts feed into, which can inform both bidding strategy and sales conversations with prime contractors.

## Packaging Information tab

The Packaging Information tab has two parts. A **Packaging Data** section lists the part's packaging and preservation codes following government cataloging conventions — for example QUP, PRES MTHD, CLNG/DRY, PRESV MAT, WRAP MAT, CUSH/DUNN MAT, CUSH/DUNN THKNESS, UNIT CONT, OPI, INTRMDTE CONT, and special marking codes. Each code links to its full definition in the **Code Definitions** reference.

Below it, a supplemental narrative section (usually titled **Packaging Requirements**) may include military specification references (MIL-DTL-75, FED-STD-313), hazardous material disclosure obligations, and source control directives.

## Procurement Item Description tab

The Procurement Item Description tab contains the full procurement description for the part — quality requirements, military specifications, compliance standards (including CMMC where applicable), drawing references, and inspection criteria. It's rendered as formatted text with clickable links to referenced standards and documents.

This is dense, formal content. If you're preparing a bid, treat this as the authoritative description of what the government expects from the part you'll supply.

## Recent and pinned searches

The Library Search page displays your recent searches as clickable chips below the search bar. Click any chip to re-run the search.

On the Advanced plan, click the pin icon next to a recent search to save it. Pinned searches stay accessible regardless of how many other searches you run, which is useful for parts, vendors, or solicitations you check frequently.

*Note: pinned searches are available on the Advanced plan.*

## Exporting data

Several tabs include an **Export CSV** button that downloads the visible data to a spreadsheet — particularly useful for Procurement History, Recent Solicitations, and Manufacturers, where the tables can be large.

For more detailed or custom exports, click the **Request a custom report →** link at the bottom of any data table.

*Note: CSV export is available on the Advanced plan.*

## Related articles

- [Researching Vendors](/help/vendor-research) — Vendor profiles and competitive intelligence  
- [Sending RFQs to Vendors](/help/requests-for-quote) — Request quotes from a part's manufacturers  
- [Setting Up Bid-Matching Profiles](/help/bid-matching-profiles) — Match incoming solicitations automatically  
- [Plans and Pricing](/help/plans-and-pricing) — Compare feature access by plan
