"use client";

import { formatCurrency } from "@/lib/library/types";
import {
  resolveAidcTerms,
  resolveBidTerms,
  resolveRating,
  type BidTermDefinitions,
  type ResolvedBidTerm,
  type SolicitationBidTerms,
} from "@/lib/library/bidTerms";

/**
 * The bid-qualification terms panel, rendered inside the expanded row on both
 * /bidmatching and /rfq/worklist.
 *
 * These terms decide whether a buyer can bid at all — approved-source and
 * quality gates — and what bidding costs them — freight, source inspection,
 * clause fill-ins. They live in the expanded row rather than the table because
 * both tables are already at their column budget, and because most rows have
 * nothing notable to say: the ordinary solicitation is FOB destination,
 * inspection at destination, no higher-level quality.
 *
 * Two rules the rest of the app already follows and this must too:
 *
 *   - A null is UNKNOWN, not "no". An unstated term is omitted entirely; it
 *     never renders a negative or a dash, which would read as data we hold and
 *     the government answered.
 *   - Labels come from the server (code_definitions), never from this file.
 *     The hover text is the DLA definition verbatim.
 */

function TermCell({ term }: { term: ResolvedBidTerm }) {
  return (
    // The left rule carries the emphasis alongside the color, so a notable
    // term is still distinguishable without relying on hue alone.
    <div
      className={`pl-2 border-l-2 ${
        term.notable ? "border-amber-400 dark:border-amber-500/60" : "border-border"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted leading-tight">
        {term.name}
      </div>
      <div
        className={`text-xs leading-snug ${
          term.notable
            ? "font-semibold text-amber-700 dark:text-amber-300"
            : "text-foreground"
        }`}
        title={term.description || undefined}
      >
        {term.label}
        {/* The raw code, kept visible: buyers who work the BQ file read these
            directly, and it is what appears in DIBBS itself. */}
        <span className="ml-1.5 text-[10px] text-muted/70 data-field font-normal">
          {term.code}
        </span>
      </div>
      <div className="text-[10px] text-muted leading-tight mt-0.5">{term.hint}</div>
    </div>
  );
}

export function BidTermsPanel({
  terms,
  definitions,
  className = "",
}: {
  terms: SolicitationBidTerms | null | undefined;
  definitions: BidTermDefinitions | undefined;
  className?: string;
}) {
  // The eight coded BQ fields, then the DPAS rating. The established order
  // holds — what disqualifies you, then what it costs you — with the rating
  // after it, since it binds you only once you have won.
  const rating = resolveRating(terms, definitions);
  const resolved = [
    ...resolveBidTerms(terms, definitions),
    ...(rating ? [rating] : []),
  ];
  const aidc = resolveAidcTerms(terms);

  // Nothing stated on this solicitation — render nothing rather than an empty
  // heading. A SAM-source row lands here too: it never joins `solicitations`.
  if (resolved.length === 0 && aidc.length === 0) return null;

  return (
    <div className={className}>
      <div className="text-xs text-muted mb-2">Bid qualification terms</div>

      {resolved.length > 0 && (
        <div className="grid gap-x-4 gap-y-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {resolved.map((term) => (
            <TermCell key={term.field} term={term} />
          ))}
        </div>
      )}

      {/* AIDC contract terms. Only Automated Indefinite Delivery Contracts
          (solicitation_type 'I', ~2.6% of solicitations) carry these, so the
          block is absent rather than empty everywhere else. */}
      {aidc.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dashed border-border">
          <div className="text-xs text-muted mb-2">Automated IDC contract terms</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {aidc.map((term) => (
              <div key={term.name}>
                <div className="text-sm font-semibold text-foreground data-field leading-tight">
                  {term.format === "currency"
                    ? formatCurrency(term.value)
                    : term.value.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted leading-tight mt-0.5">
                  {term.name}
                </div>
                <div className="text-[10px] text-muted/80 leading-tight">{term.hint}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
