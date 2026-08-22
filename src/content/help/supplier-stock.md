---
title: "Sharing and Finding Supplier Stock"
meta_title: "Supplier Stock | GPH Help"
description: "Upload your inventory to GPH, control exactly what other subscribers can see, and use the Supplier Stock tab to find parts that are on the shelf right now."
---

<!--
  HIDDEN UNTIL INVENTORY UPLOAD LAUNCH. This article is deliberately NOT
  registered in src/lib/help.ts — the registry drives the /help route
  allowlist, so this file renders nothing until an entry is added.

  Launch checklist (do these together):
  1. Add to HELP_ARTICLES in src/lib/help.ts:
       { slug: "supplier-stock", title: "Sharing and Finding Supplier Stock",
         blurb: "Upload your inventory, control what other subscribers see, and find parts that are on the shelf right now.",
         group: "platform" }
  2. Restore the two commented-out inventory passages in
     src/content/help/rfq-enterprise.md (row badge + "Your stock" column).
  3. Add a Supplier Stock passage to plans-and-pricing.md (viewing requires
     Basic+ or being a sharing contributor; contributing is free).
  4. Flip INVENTORY_UPLOAD_PUBLIC in src/lib/inventory/launch.ts (unhides
     the Account -> Inventory card outside dev).
-->

GPH's part records tell you what the government knows about a part — procurement history, open solicitations, DLA demand and stock. **Supplier Stock** adds the one thing missing from that picture: what the supply chain actually has on the shelf right now. Suppliers upload their inventory, and — only if they choose to share — their stock becomes visible to other GPH customers on the part's **Supplier Stock** tab, with an **In stock** badge in search results.

Contributing your inventory is **free on every plan**. Viewing *other* companies' stock requires a Basic or Advanced plan — **or** being a sharing contributor yourself: if you feed the network, you see the network, whatever your plan.

## In this article

- [Uploading your inventory](#uploading-your-inventory)
- [The preview screen](#the-preview-screen)
- [Keeping your stock current](#keeping-your-stock-current)
- [Sharing: who sees what](#sharing-who-sees-what)
- [Freshness: the stale badge and auto-hide](#freshness-the-stale-badge-and-auto-hide)
- [Finding supplier stock as a buyer](#finding-supplier-stock-as-a-buyer)
- [Your stock on the Send RFQs page](#your-stock-on-the-send-rfqs-page)
- [Fixing rejected rows](#fixing-rejected-rows)
- [Who can do what](#who-can-do-what)

## Uploading your inventory

Go to **Account → Inventory** and drop in a CSV export from your ERP or spreadsheet. Only account admins can upload.

Three things are required on every line:

- an **NSN or NIIN**, *or* a **part number** (either identifies the item),
- a **quantity**.

Everything else is optional, but the more you include, the more useful — and more findable — your listings are:

- **Your own SKU or stock-record ID.** The most important optional column. It's how GPH recognizes the same line across uploads, so updates update instead of duplicating.
- **Manufacturer CAGE.** A bare part number can exist under many manufacturers; CAGE + part number roughly doubles clean-match rates.
- **Unit of measure and condition code.** "12" of what, and in what condition? Missing values default to EA and A (new/serviceable) with a warning. *A listing without a condition code is not shown to other customers.*
- **As-of date** — the date the count was taken. Without it we use the upload date.
- **Commercial fields** — unit price, minimum order quantity, lead time. A line with zero on hand but a lead time is a legitimate listing: "can source in 21 days."
- **Compliance and traceability** — country of origin, material source (OEM / authorized distributor / broker / surplus), paperwork that ships with it (CofC, test reports, government traceability), lot and cure dates, DFARS/ITAR/hazmat flags. In this market, buyers filter on provenance before they filter on price — these fields are what make a listing quotable.

You don't need to match our column names. The first time you upload, GPH shows your headers next to its fields and lets you map them; the mapping is saved, so every later upload is one click. Common names (Qty, P/N, CAGE, U/M, bin…) are recognized automatically.

**A note on Excel.** Most CSVs come out of Excel, which quietly damages part numbers — stripping leading zeros from NSNs and collapsing long part numbers into scientific notation (`5.4E+11`). GPH repairs lost leading zeros automatically. Scientific-notation part numbers are unrecoverable and those rows are rejected with a clear message: format the column as **Text** in Excel and re-export.

Limits: 20 MB / 100,000 rows per file, 100,000 live lines per company.

## The preview screen

Nothing touches your live catalog until you confirm. After parsing, GPH shows one review screen:

- the column mapping it used,
- a sample of parsed rows — including what GPH already knows about each matched part (description, unit of issue, shelf-life code), so you can sanity-check the matching,
- full counts: how many rows are valid, rejected, or carry warnings,
- a **shrink warning** if this snapshot would remove a large share of your currently published lines — the classic symptom of a truncated ERP export.

Confirm, and the import runs in the background. You'll see an "import queued" banner immediately and get an **email when it completes**, with match results in your upload history. If something went wrong, the upload history has a one-click **rollback**.

## Keeping your stock current

Two ways to update, same catalog:

- **Snapshot (default).** Each upload is your complete current stock. Lines present are updated, lines missing are removed from your listings (recoverable — nothing is ever hard-deleted). No delete files, no drift.
- **Changes-only (upsert).** For ERPs that can only export changed rows: supplied lines are updated, everything else is left alone.

Editing a single line by hand is also possible from the Items list (admins only). An inline edit counts as a fresh stock check — but remember your next snapshot upload will overwrite it, so make the change in your ERP too.

An API for nightly automated pushes from your ERP is planned; snapshot re-upload is the supported method today.

## Sharing: who sees what

Sharing is **off by default**. Until an admin turns it on (and accepts the sharing terms), your inventory is visible only inside your own company — you can use GPH purely as a private stock lookup against part records.

When you do share, you control the exposure column by column, from **Account → Inventory → Settings**:

- **Quantity** — show the exact number, a range ("100–499"), or just "in stock."
- **Price, MOQ, lead time, condition, traceability, ship-from region** — each independently on or off. Prices are **off** by default.
- **Your identity** — hidden by default. Other customers see an anonymous label like *"Authorized distributor · ships from US-East"*, never your company name, unless you explicitly choose to display one.
- **Inquiries** — routed through GPH's RFQ system by default, so buyers can reach you without you revealing who you are. You can instead publish a direct inquiry email.

Your warehouse and bin locations are **never** shared, regardless of settings. The settings page shows a live preview of exactly what another subscriber would see. Non-admins can view the settings read-only.

Two things decide whether a specific line appears to others: it must be **matched to a GPH part record** and it must carry a **condition code**. Unmatched lines stay visible to you, and GPH quietly re-checks them as its parts database grows — lines that don't match today often match later with no action on your part.

## Freshness: the stale badge and auto-hide

Every listing shows its as-of date. From there:

- After **30 days** without a refresh, the listing gets a **stale** badge (still visible, still quotable).
- After **90 days**, it is **withdrawn from the network** — other customers stop seeing it. You still see it, flagged "hidden — needs refresh," and a single fresh upload restores it automatically. You'll get a warning email about a week before listings are due to disappear.

Both thresholds and the auto-hide behavior are adjustable by your admin. Auto-hide exists to protect you: a buyer who chases stock you sold three months ago won't come back.

## Finding supplier stock as a buyer

On any part record, the **Supplier Stock** tab shows two sections:

- **My stock** — your own company's lines for this part, always with full detail.
- **Network stock** — other suppliers' shared listings, each showing exactly what its owner chose to expose: quantity or range, condition, price if shared, lead time, traceability, ship-from region, and the as-of date. Use the inquiry button to reach the supplier — through GPH's RFQ flow for anonymous listings.

Search results show an **In stock** badge on parts with live network listings, so you can spot sourceable parts while scanning solicitations.

If your plan doesn't include network viewing, the tab still shows your own stock — and shows how to unlock the network: upgrade, or start sharing your own inventory.

## Your stock on the Send RFQs page

If your company also uses the **RFQ Enterprise** add-on, your uploaded inventory shows up right where bid decisions get made: the [Send RFQs worklist](/help/rfq-enterprise#the-send-rfqs-page).

- Solicitations whose parts are already on your shelf carry a **green cube badge** with a fraction — say, **2/4** means two of the four solicited parts are in your inventory. Solid green means everything is stocked; an outline means some of it is. No badge simply means none of it is.
- Expanding the row adds a **Your stock** column to the solicited items: how many you have and in what condition, plus the warehouse and the date of the count. A **partial** tag warns when your on-hand quantity covers only part of what's solicited, and an old count date is flagged so you can recount before quoting from it.

This view is **your own inventory only** — other suppliers' shared stock never appears on the Send RFQs page. It also doesn't require sharing: even with network sharing off, your private catalog powers these badges for your own team.

## Fixing rejected rows

The upload history offers an **error report** download for every upload — a CSV listing each rejected or warned row with its original columns and a plain-language reason (missing quantity, unrecognizable NSN, part number destroyed by Excel, and so on). Fix the rows in your source file and re-upload; already-imported lines are simply updated.

## Who can do what

| Action | Who |
|---|---|
| Upload, confirm, roll back, edit or delete items, change settings | Account **admins** only |
| View your company's own stock, uploads, and settings (read-only) | Everyone on your account |
| View network stock | Basic and Advanced plans — or any account actively sharing its own inventory |

Inventory is treated as a company asset: it belongs to your account, not to the person who uploaded it.
