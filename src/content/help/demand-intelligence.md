---
title: "Reading Demand & Stock Data"
meta_title: "Demand & Stock Data | GPH Help"
description: "Understand the DLA demand forecast and inventory signals on a part's Demand & Stock tab, and how to use them when deciding which solicitations to bid on and at what price."
---

The **Demand & Stock** tab on a part record adds a forward-looking layer to your research. Procurement history tells you what the government *bought*, and Recent Solicitations tells you what it's *buying now* — Demand & Stock tells you what the Defense Logistics Agency (DLA) expects to buy, and roughly when. It draws on two DLA datasets, keyed to the part's NIIN, to help you decide **which** opportunities are worth pursuing and **how aggressively to price**.

This tab is part of the **Procurement Analytics** add-on, available on the Advanced plan. Because add-on seats are assigned per user, your account admin controls who on your team sees it — see [Plans and pricing](/help/plans-and-pricing#add-ons).

## In this article

- [Where the data comes from](#where-the-data-comes-from)
- [Annual demand vs. forecast demand](#annual-demand-vs-forecast-demand)
- [The buy signals](#the-buy-signals)
- [The forecast chart](#the-forecast-chart)
- [Stock position and reorder point](#stock-position-and-reorder-point)
- [Using it to price a bid](#using-it-to-price-a-bid)
- [Important caveats](#important-caveats)

## Where the data comes from

Two monthly DLA datasets feed this tab:

- **Demand forecast** — DLA's own projection of how much it expects to be demanded for the item, month by month, up to two years out.
- **Inventory position** — a snapshot of how much DLA currently holds, how much is on backorder, its annual demand quantity (ADQ), and its reorder point.

Both are published monthly, so every figure carries an "as of" date. Always read the freshness line at the bottom of the tab before acting on the numbers.

## Annual demand vs. forecast demand

Two of the stat tiles look similar and are easy to confuse. They point in opposite directions in time:

- **Annual demand** is DLA's Annual Demand Quantity (ADQ) — the *realized*, backward-looking rate at which the item has actually been issued from stock. It is a measurement of what already happened.
- **Forecast demand (12 mo)** is DLA's *forward* projection of demand over the coming year, taken from a separate file.

The distinction matters when you are sizing a future opportunity. Annual demand should not be multiplied out to estimate what DLA will buy — it describes the past, and doubling it does not produce a two-year forecast. Use the forecast tile and the chart beneath it for anything forward-looking.

When the two agree closely, that is a good sign: DLA's own projection is consistent with the rate the item has really been consuming. When they diverge sharply, DLA is expecting a change in demand.

Note also that neither number is a projection of what DLA will *purchase*. Both describe consumption — how fast the item leaves the shelf. What DLA needs to buy is consumption minus the stock it already holds, which is why an item with heavy demand and a full warehouse may see no solicitation for a year or more. The **months of supply** and **coverage** readings are what tell you where an item sits in that cycle.

## The buy signals

At the top of the tab you may see one or more colored chips summarizing the item's status:

- **On backorder** — DLA has demand it has already failed to fill. This is the most urgent signal: expect expedited or priority buys.
- **Below reorder point** — on-hand stock has dropped beneath the level at which DLA's system triggers a replenishment buy.
- **Recurring demand** — DLA has both an ongoing annual demand and a forward forecast for the item, meaning it is likely to be bought again and again.
- **One-off buy** — the data shows no ongoing demand, suggesting a single purchase rather than a repeating stream.
- **Stock trending down** — on-hand quantity has fallen across recent monthly snapshots.

These chips are descriptive, not a recommendation — they summarize what DLA's own data says so you can draw your own conclusion.

## The forecast chart

The bar chart shows DLA's projected monthly demand for every month remaining in its published forecast window, which runs up to 24 months out. The headline above it sums the projected demand across the months shown. Because DLA publishes a fixed horizon that is only refreshed monthly, the window shortens slightly as the month progresses and then extends again when the next release lands — so the headline total is the *remaining* forecast, not a fixed two-year figure. A tall, steady curve points to a durable revenue stream on the item; a flat or empty curve suggests little forward demand.

## Stock position and reorder point

The stat tiles report on-hand quantity, backordered quantity, DLA's annual demand quantity, months of supply (on-hand divided by the monthly demand rate), and the next 12 months of forecast demand with a **coverage ratio** — on-hand stock divided by forecast demand. A coverage ratio below 1× means DLA holds less than it expects to need.

When DLA publishes a **reorder point**, a bar compares current on-hand stock against it, and the "gap to reorder point" estimates the size of the pending buy (DLA generally buys back above the reorder point). Many items have no reorder point on file; when that is the case, the bar is simply omitted — it means "no signal," not zero.

## Using it to price a bid

- **Recurring items** are worth winning even at a thin margin: the item will be bought again, so a competitive price now can secure a repeating stream. Pair this with the winning-price context on the part's other tabs.
- **One-off buys** carry no follow-on, so price them on their own merits.
- **Backorders and below-reorder-point items** suggest DLA needs stock quickly, which can favor suppliers with short lead times as much as the lowest price.

## Important caveats

- **Estimates, not guarantees.** These are DLA's forecasts and inventory figures. A backorder or a below-reorder-point reading raises the probability of a solicitation; it does not guarantee one, and DLA may fill demand from existing contracts.
- **Monthly freshness.** Both datasets lag reality by a few weeks. Check the "as of" date.
- **A backorder of zero is a real reading.** The backorder tile shows `0` when DLA owed nothing on the item at its latest snapshot, and a dash only when no inventory snapshot exists at all. Zero backorders is information, not a gap.
- **No reorder point is not zero.** About half of items have no reorder point on file; that is a missing signal, not a stock level of zero.
- **No forecast is not zero demand.** DLA only forecasts a subset of items. An item with no forecast may still be bought irregularly — check the annual demand quantity before concluding it is dead.
- **No revision history.** Each monthly release replaces the last, so the tab always shows DLA's latest published figures.
