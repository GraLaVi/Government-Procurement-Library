"use client";

import { formatCurrency } from "@/lib/library/types";
import { useCodeDefinitions } from "@/lib/hooks/useCodeDefinitions";
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
            directly, and it is what appears in DIBBS itself.

            Separated from the label by SHAPE, not by shade. The two previous
            attempts both tuned the grey, and both failed the same way: any
            colour dim enough to read as secondary against a bg-muted-light/30
            row is also too dim to read at all (undimmed --muted tops out near
            4.7:1 there). Boxing the code keeps it at full --foreground — 14:1
            light, 8.4:1 dark on its own chip — while the border and fill say
            "this is the raw value" without spending any contrast to do it. */}
        {/* Absent on First Article, which is not a coded BQ field. */}
        {term.code && (
          <span
            className="ml-1.5 inline-block align-[1px] rounded border border-border
              bg-muted-light px-1 py-px text-[10px] leading-none text-foreground
              data-field font-normal"
          >
            {term.code}
          </span>
        )}
      </div>
      <div className="text-[10px] text-muted leading-tight mt-0.5">{term.hint}</div>
    </div>
  );
}

export function BidTermsPanel({
  terms,
  definitions,
  firstArticle,
  solicitationType,
  fastAward = false,
  className = "",
}: {
  terms: SolicitationBidTerms | null | undefined;
  definitions: BidTermDefinitions | undefined;
  /**
   * Contractor First Article requirement. Pass it on a page that does NOT
   * badge it in the row (see /rfq/worklist): it is a bid cost like any other
   * term here, and the row it came from was carrying six badges. Omit it and
   * the panel renders exactly as before — /bidmatching still badges it inline.
   */
  firstArticle?: boolean;
  /**
   * DLA Solicitation Type Indicator. Only 'I' means anything to this panel:
   * it names the contract vehicle for the AIDC block below, so the block can
   * appear on an Automated IDC that states none of the numbers. Same bargain
   * as firstArticle — pass it where the row does not badge it.
   */
  solicitationType?: string | null;
  /**
   * Show a fast-award ('F') solicitation type as a term. Opt-in, unlike the
   * IDC block: /rfq/worklist keeps fast award as a row badge, because it is
   * urgency — the award can come before the return date — and must read
   * without expanding anything. /bidmatching moves it here.
   */
  fastAward?: boolean;
  className?: string;
}) {
  // Label and definition for the fast-award term, from the same vocabulary
  // the row badge reads. Hooks run unconditionally; the cache is shared.
  const { byCode } = useCodeDefinitions("SOLICITATION_TYPE");
  // First Article, then the nine coded fields, then the DPAS rating. The
  // established order holds — what disqualifies you, then what it costs you —
  // with the rating after it, since it binds you only once you have won.
  // First Article leads because it is the most expensive of the gates: a test
  // report before production delivery, priced into a bid or not at all.
  const rating = resolveRating(terms, definitions);
  const typeCode = solicitationType?.trim().toUpperCase();
  const fast = fastAward && typeCode === "F" ? byCode.get("F") : undefined;
  const resolved: ResolvedBidTerm[] = [
    ...(firstArticle
      ? [{
          field: "first_article" as const,
          name: "First article",
          label: "Required",
          hint: "Tested before production delivery",
          // Both first article CLINs: contractor testing (0001S00000053,
          // FAR 52.209-3) and government testing (0001S00000052, 52.209-4).
          // The waiver rule is DLAD 9.306's.
          description:
            "Initial units are tested and approved before production delivery: by you, with a test report (FAR 52.209-3), or by a government lab you ship them to (FAR 52.209-4). Price the testing separately on the first article line. A waiver needs the same or a similar item made and delivered within the last 5 years (3 for critical safety items) with no changes since (DLAD 9.306).",
          notable: true,
        }]
      : []),
    // Fast award after First Article: it changes when you must bid, not
    // whether you can.
    ...(fastAward && typeCode === "F"
      ? [{
          field: "solicitation_type" as const,
          name: "Solicitation type",
          label: fast?.label ?? "Fast award",
          code: "F",
          hint: "Can be awarded before the return date",
          description: fast?.description,
          notable: true,
        }]
      : []),
    ...resolveBidTerms(terms, definitions),
    ...(rating ? [rating] : []),
  ];
  const aidc = resolveAidcTerms(terms);
  // 'I' is the only indicator this panel reads. Null is unknown, as everywhere
  // else here — an untyped solicitation says nothing about its vehicle.
  const isAidc = solicitationType?.trim().toUpperCase() === "I";

  // Nothing stated on this solicitation — render nothing rather than an empty
  // heading. A SAM-source row lands here too: it never joins `solicitations`.
  if (resolved.length === 0 && aidc.length === 0 && !isAidc) return null;

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
          block is absent rather than empty everywhere else.

          It also opens on the indicator alone, for a page that hands us
          `solicitationType` instead of badging it in the row: the vehicle is
          worth stating even where none of its numbers are. */}
      {(aidc.length > 0 || isAidc) && (
        <div className="mt-3 pt-3 border-t border-dashed border-border">
          {/* The heading names what is actually below it: the numbers where
              they are stated, the vehicle itself where they are not. */}
          <div className="text-xs text-muted mb-2">
            {aidc.length > 0 ? "Automated IDC contract terms" : "Contract vehicle"}
          </div>
          {aidc.length > 0 ? (
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
          ) : (
            <p className="text-[11px] text-muted leading-snug">
              An Automated Indefinite Delivery Contract — awards run as
              delivery orders across its life rather than as one buy.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
