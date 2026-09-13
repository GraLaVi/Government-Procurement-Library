"use client";

import { Fragment, useMemo } from "react";
import { RowBadge } from "@/components/library/RowBadge";
import {
  PLACEHOLDER_LINE_DESCRIPTION,
  rfqStatusLabel, rfqStatusTone,
  WORK_STATUS_LABELS,
  type RfqDetail,
  type RfqResponseDetail,
} from "@/lib/rfq/types";
import { formatDateMmDdYyyy } from "@/lib/dates";
import { formatCurrency, formatNSN } from "@/lib/library/types";
import {
  TableCard, rowClass, tableClass, tableHeadRowClass, tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";

/**
 * The body of an RFQ's detail page: who it went to, what was asked, and what
 * came back — with the buyer's pricing spelled out under each priced line.
 *
 * Presentation only. The page (/rfq/:id) owns loading, the toolbar (Complete,
 * Close, Cancel, Print) and the confirmations; this renders one loaded record.
 * Split out so the public product page can show a real RFQ record on sample
 * data rather than a screenshot of one.
 */
export function RfqRecord({
  rfq,
  responses,
}: {
  rfq: RfqDetail;
  responses: RfqResponseDetail[];
}) {
  // Quote lines reference an rfq_line_items.id; this resolves one back to the
  // requested line it answers.
  const lineItemsById = useMemo(
    () => new Map(rfq.line_items.map((li) => [li.id, li])),
    [rfq],
  );

  return (
    <>
      {/* Recipients */}
      <TableCard as="section" header={<h2 className="text-sm font-semibold text-foreground">Recipients</h2>}>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={thClass}>Vendor</th>
                <th className={thClass}>Contact</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Reminders</th>
              </tr>
            </thead>
            <tbody>
              {rfq.recipients.map((r) => (
                <tr key={r.id} className={rowClass}>
                  <td className={`${tdClass} text-foreground`}>
                    {r.vendor_name || r.cage_code}{" "}
                    <span className="font-mono text-xs text-muted">({r.cage_code})</span>
                  </td>
                  <td className={`${tdClass} text-muted`}>{r.contact_email || "—"}</td>
                  <td className={tdClass}>
                    <RowBadge tone={rfqStatusTone(r.status)}>{rfqStatusLabel(r.status)}</RowBadge>
                  </td>
                  <td className={`${tdClass} text-muted`}>{r.reminder_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>

      {/* Line items */}
      <TableCard as="section" header={<h2 className="text-sm font-semibold text-foreground">Requested items</h2>}>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={thClass}>#</th>
                <th className={thClass}>Part number</th>
                <th className={thClass}>NSN</th>
                <th className={thClass}>Qty</th>
                <th className={thClass}>Need by</th>
                <th className={thClass}>Target $/unit</th>
                <th className={thClass}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rfq.line_items.map((li) => (
                <tr key={li.id} className={rowClass}>
                  <td className={`${tdClass} text-muted`}>{li.line_number}</td>
                  <td className={`${tdClass} font-mono text-xs text-foreground`}>
                    {li.part_number || "—"}
                    {/* The part description, which no longer has a column of
                        its own. Legacy lines carry a placeholder here instead
                        of a real description — don't show that. */}
                    {li.description && li.description !== PLACEHOLDER_LINE_DESCRIPTION && (
                      <div className="font-sans text-xs text-muted">{li.description}</div>
                    )}
                  </td>
                  <td className={`${tdClass} font-mono text-xs text-foreground`}>
                    {formatNSN(li.nsn) || "—"}
                  </td>
                  <td className={`${tdClass} text-foreground`}>
                    {li.quantity}{li.unit_of_measure ? ` ${li.unit_of_measure}` : ""}
                  </td>
                  <td className={`${tdClass} text-muted`}>{formatDateMmDdYyyy(li.need_by_date)}</td>
                  <td className={`${tdClass} text-muted`}>{li.target_unit_price ?? "—"}</td>
                  <td className={`${tdClass} text-muted`}>{li.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Quotes live in the same card as the request: they answer these
            exact lines, and the side-by-side read (asked vs. answered) is
            the whole point of the page. */}
        <div className="mt-6 pt-4 border-t border-border">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Quotes received ({responses.length})
          </h2>
        {responses.length === 0 ? (
          <p className="text-sm text-muted">No quotes yet.</p>
        ) : (
          <div className="space-y-4">
            {responses.map((resp) => (
              <div key={resp.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">
                    {resp.vendor_name || resp.cage_code}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {resp.total_price != null && <span>Total ${resp.total_price}</span>}
                    {resp.lead_time_days != null && <span>· {resp.lead_time_days}d lead</span>}
                    {resp.line_items.some((l) => l.price_to_gov != null) && (
                      <RowBadge tone="green">Priced</RowBadge>
                    )}
                    {/* Progress is per solicitation, so this says the bid went
                        to the government for the solicitation this quote is
                        part of — not that this vendor was the one quoted. */}
                    {rfq.work_status === "bid" && (
                      <RowBadge tone="blue" title="A bid has been sent to the government for this solicitation">
                        {WORK_STATUS_LABELS.bid}
                      </RowBadge>
                    )}
                    <RowBadge tone={rfqStatusTone(resp.status)}>{rfqStatusLabel(resp.status)}</RowBadge>
                  </div>
                </div>
                <div className={tableWrapClass}>
                  <table className={tableClass}>
                    <thead>
                      <tr className={tableHeadRowClass}>
                        <th className={thClass}>Line / Part</th>
                        <th className={thClass}>Unit $</th>
                        <th className={thClass}>Qty avail</th>
                        <th className={thClass}>Lead</th>
                        <th className={thClass}>Alt part</th>
                        <th className={thClass}>No bid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resp.line_items.map((rli, i) => {
                        // rfq_line_item_id is a database id, meaningless next to
                        // the requested-items table above — show the line number
                        // and part it refers to instead.
                        const li = lineItemsById.get(rli.rfq_line_item_id);
                        return (
                        <Fragment key={i}>
                        <tr className={rowClass}>
                          <td className={`${tdClass} text-muted`}>
                            {li ? (
                              <>
                                <span className="text-foreground">{li.line_number}</span>
                                <span className="ml-1.5 font-mono">
                                  {li.part_number || formatNSN(li.nsn) || ""}
                                </span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={`${tdClass} text-foreground`}>{rli.unit_price ?? "—"}</td>
                          <td className={`${tdClass} text-muted`}>{rli.quantity_available ?? "—"}</td>
                          <td className={`${tdClass} text-muted`}>{rli.lead_time_days ?? "—"}</td>
                          <td className={`${tdClass} text-muted`}>{rli.alternate_part_number || "—"}</td>
                          <td className={`${tdClass} text-muted`}>{rli.is_no_bid ? "Yes" : "—"}</td>
                        </tr>
                        {/* What the BUYER did to this line after the vendor
                            quoted it, spelled out rather than summarised behind
                            a popover on a "price to gov" column. The vendor
                            sends unit_price; everything here was added by us,
                            so a bidder reading the record can see exactly how
                            the government number was reached and who reached
                            it. Absent until someone prices the line. */}
                        {rli.price_to_gov != null && (
                          <tr className="border-t border-border/40 bg-muted-light/40">
                            <td colSpan={6} className="px-3 py-1.5">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px]">
                                <span className="text-muted">↳ Buyer priced:</span>
                                <span className="font-mono tabular-nums text-muted">
                                  {formatCurrency(rli.unit_price)} vendor
                                </span>
                                {rli.markup_percent != null && (
                                  <span className="font-mono tabular-nums text-muted">
                                    + {rli.markup_percent}% markup
                                  </span>
                                )}
                                {rli.shipping_amount != null && (
                                  <span className="font-mono tabular-nums text-muted">
                                    + {formatCurrency(rli.shipping_amount)} shipping
                                  </span>
                                )}
                                {rli.other_charges != null && (
                                  <span className="font-mono tabular-nums text-muted">
                                    + {formatCurrency(rli.other_charges)} other
                                  </span>
                                )}
                                <span className="text-muted">→</span>
                                <span className="font-mono tabular-nums font-semibold text-foreground">
                                  {formatCurrency(rli.price_to_gov)} to government
                                </span>
                                {(rli.priced_by_name || rli.priced_at) && (
                                  <span className="text-muted/80">
                                    ·{rli.priced_by_name ? ` ${rli.priced_by_name}` : ""}
                                    {rli.priced_at ? `, ${formatDateMmDdYyyy(rli.priced_at)}` : ""}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {resp.notes && <p className="text-xs text-muted">{resp.notes}</p>}
              </div>
            ))}
          </div>
        )}
        </div>
      </TableCard>
    </>
  );
}
