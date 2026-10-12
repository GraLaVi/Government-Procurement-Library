"use client";

import { money } from "@/lib/bidding/api";
import { formatDateMmDdYyyy } from "@/lib/dates";
import type { FirstArticleContext } from "@/lib/bidding/types";

/**
 * DLA's first article rules (DLAD subpart 9.3), beside the bid's first-article
 * answer. Guidance only: the batch upload carries just the waiver code (064),
 * price and days, so everything here is what the bidder must know or have on
 * hand, not something we can send for them.
 *
 * 0001S00000053 is contractor testing (FAR 52.209-3), 0001S00000052 is
 * government testing (FAR 52.209-4) — both per DIBBS's batch quote spec.
 */

const WAIVER_LOOKBACK_YEARS = 5;

function withinYears(iso: string | null, years: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return d >= cutoff;
}

export function firstArticleKind(nsnPart: string | null): "contractor" | "government" | null {
  const n = (nsnPart ?? "").toUpperCase();
  if (n === "0001S00000053") return "contractor";
  if (n === "0001S00000052") return "government";
  return null;
}

export function FirstArticleKindNote({ nsnPart }: { nsnPart: string | null }) {
  const kind = firstArticleKind(nsnPart);
  if (!kind) return null;
  return (
    <p className="text-xs text-muted mt-0.5">
      {kind === "contractor"
        ? "Contractor testing (FAR 52.209-3): you test the first units and send DLA a test report before production."
        : "Government testing (FAR 52.209-4): you ship the first units to a government lab, which tests them before production."}
    </p>
  );
}

function Rules({ title, items }: { title: string; items: React.ReactNode[] }) {
  return (
    <div>
      <div className="text-xs font-semibold text-foreground">{title}</div>
      <ul className="mt-1 list-disc pl-4 space-y-0.5 text-xs text-muted">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

export function FirstArticleGuide({
  nsnPart,
  waiver,
  context,
  quoteForCage,
}: {
  nsnPart: string | null;
  waiver: string | null;
  context: FirstArticleContext | null | undefined;
  quoteForCage: string;
}) {
  const kind = firstArticleKind(nsnPart);
  const awards = context?.recent_awards ?? [];
  const recent = awards.filter((a) => withinYears(a.contract_date, WAIVER_LOOKBACK_YEARS));

  return (
    <div className="mt-4 rounded-md border border-border bg-muted-light/40 p-3 space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        DLA first article rules (DLAD 9.3)
      </div>

      {context?.amsc_exempt && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          This item is AMSC {context.amsc}. DLAD 9.304 says first article testing does not normally
          apply to AMSC T, Z, D, H or P items, so it may be worth raising with the contracting officer.
        </p>
      )}

      {waiver !== "N" && (
        <>
          <Rules
            title="A waiver needs all of these to be true"
            items={[
              <>You made and delivered this item, or a similar one, in the last 5 years (3 years for a critical safety item).</>,
              <>No change since then to your manufacturing processes, tooling or place of performance.</>,
              <>No change to the manufacturing data: drawing revisions affecting materials, dimensions, processes, inspection or testing, or the subcontractors you used.</>,
              <>The item is the same design, made by the same method at the same facilities as the one DLA accepted.</>,
            ]}
          />
          <Rules
            title="Have this ready for the contracting officer"
            items={[
              <>The earlier contract numbers, dates and issuing agency.</>,
              <>The part, type or model number of the item you delivered.</>,
              <>If it was similar rather than identical, why making it shows you can make this one.</>,
              <>The engineering control or change number of the item you delivered.</>,
              <>The upload file carries only the waiver request, not this evidence.</>,
            ]}
          />
          <div className="text-xs">
            <div className="font-semibold text-foreground">Your awards of this part ({quoteForCage})</div>
            {awards.length === 0 ? (
              <p className="mt-1 text-muted">
                None on file. We only see awards to your CAGE as prime, so check your own records
                for other deliveries of this or a similar item.
              </p>
            ) : (
              <>
                <ul className="mt-1 space-y-0.5">
                  {awards.map((a) => (
                    <li key={`${a.contract_number}-${a.contract_date}`} className="text-foreground">
                      <span className="data-field">{a.contract_number ?? "—"}</span>
                      <span className="text-muted">
                        {" "}· {formatDateMmDdYyyy(a.contract_date)}
                        {a.quantity != null ? ` · ${a.quantity} @ ${money(a.unit_price)}` : ""}
                        {withinYears(a.contract_date, WAIVER_LOOKBACK_YEARS) ? "" : " · over 5 years ago"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-muted">
                  {recent.length > 0
                    ? "Awarded within 5 years. Delivery and no changes since still have to hold."
                    : "None within 5 years, so these alone do not support a waiver."}
                </p>
              </>
            )}
          </div>
        </>
      )}

      {waiver === "N" && (
        <Rules
          title="Pricing and delivery without a waiver"
          items={[
            <>Put all testing costs and risk in the test price, and none in the production price. DLA must find both fair and reasonable, and can reject a test price that is unbalanced against production.</>,
            kind === "government"
              ? <>Test delivery days: days to deliver the test units to the government lab.</>
              : <>Test delivery days: days to deliver the first article test report.</>,
            <>Production delivery counts from first article approval. The PDF&apos;s schedule sets DLA&apos;s review time.</>,
            ...(kind === "government"
              ? [<>DLA may add its own testing cost to your price when evaluating offers, and the test units may not count toward the production quantity. Check the PDF.</>]
              : []),
          ]}
        />
      )}

      <p className="text-xs text-muted">
        With first article testing, DLA inspects at source and FOB is destination. That clause
        overrides conflicting terms.
      </p>
    </div>
  );
}
