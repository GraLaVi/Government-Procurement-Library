"use client";

import { useEffect, useRef, useState } from "react";
import { SolicitationResultsTable } from "@/components/library/SolicitationResultsTable";
import { SolicitationDetailPanel } from "@/components/library/SolicitationDetailPanel";
import { isEarlyStageNoticeType } from "@/components/library/NoticeTypeBadge";
import {
  SolicitationLookupResponse,
  SolicitationResult,
} from "@/lib/library/solicitationSearch";

// ============================================================================
// SolicitationNumberFallback — the answer when a solicitation number has no parts.
// ============================================================================
// The parts "Solicitation number" search resolves a number to part_ids from
// DIBBS line items and sam_opportunity_parts, and returns nothing when there
// are none. For a services, repair or construction solicitation there are never
// any, so pasting one of those numbers produced an empty results page — while
// the notice sat in sam_opportunities the whole time, never asked about.
//
// This renders only once the parts search has come back empty, so the parts
// path is untouched and nothing here can slow a search that did find parts.
//
// It fetches on its own rather than being handed results by the page: the parts
// page caches searches client-side and replays cache hits down a different code
// path, so a fallback driven by page state would silently not fire the second
// time someone searched the same number.
// ============================================================================

export function SolicitationNumberFallback({
  solicitationNumber,
  mode = "solicitation",
  onResultsFound,
}: {
  solicitationNumber: string;
  /**
   * Called when the number resolves to something on SAM.gov, so the page can
   * record it as a recent search. The parts path skips the record because it
   * only saves searches that produced PARTS, and by definition these produced
   * none — which left a search that plainly succeeded missing from the list.
   */
  onResultsFound?: (number: string) => void;
  /**
   * Which dead end this is filling in. Both searches resolve a number to parts
   * and come back empty for the same underlying reason — the record lives in
   * `sam_opportunities`, not in a parts table — but they are asking different
   * questions and must not answer with each other's rows: a solicitation search
   * that returned an award is the bug this component was extended to avoid.
   */
  mode?: "solicitation" | "contract";
}) {
  const number = solicitationNumber.trim();

  const [results, setResults] = useState<SolicitationResult[]>([]);
  const [excludedTypes, setExcludedTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(number.length >= 2);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SolicitationResult | null>(null);

  // Ref so the fetch effect does not re-run when the callback identity changes.
  const onResultsFoundRef = useRef(onResultsFound);
  useEffect(() => { onResultsFoundRef.current = onResultsFound; }, [onResultsFound]);

  // Resetting for a new number is a prop-change reset, not synchronisation with
  // an external system, so React wants it during render rather than in the
  // effect. It also closes the detail panel, which would otherwise keep showing
  // a notice from the previous search behind the new results.
  const [prevNumber, setPrevNumber] = useState(number);
  if (number !== prevNumber) {
    setPrevNumber(number);
    setResults([]);
    setExcludedTypes([]);
    setError(null);
    setSelected(null);
    setIsLoading(number.length >= 2);
  }

  useEffect(() => {
    if (number.length < 2) return;
    let cancelled = false;
    const endpoint =
      mode === "contract"
        ? "/api/library/sam-opportunities/by-award-number"
        : "/api/library/sam-opportunities/by-number";
    fetch(`${endpoint}?number=${encodeURIComponent(number)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Lookup failed");
        return data as SolicitationLookupResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setResults(data.results);
        setExcludedTypes(data.excluded_notice_types ?? []);
        // The effect is keyed on the number, so this fires once per search.
        // Not recorded when the number only matched an award a solicitation
        // search refuses to return: that is a corrected mistake, not a search
        // worth repeating.
        if (data.results.length > 0) onResultsFoundRef.current?.(number);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Lookup failed"); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [number, mode]);

  if (isLoading) {
    return (
      <div className="bg-card-bg rounded-lg border border-border p-8 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted mt-3">
          {mode === "contract"
            ? "No parts on this contract — checking SAM.gov awards…"
            : "No parts on this solicitation — checking SAM.gov…"}
        </p>
      </div>
    );
  }

  // Two different empty results, and they need different words.
  //
  // `excluded_notice_types` non-empty means the number IS real — it just is not
  // a solicitation. Telling someone who copied an award number correctly to
  // "check the digits" sends them looking for a mistake they did not make, and
  // it is the exact dead end this component exists to remove. So name what the
  // number actually is, and say why a solicitation search will not return it.
  if (error || results.length === 0) {
    const notASolicitation = !error && excludedTypes.length > 0;
    return (
      <div className="bg-card-bg rounded-lg border border-border p-8 text-center">
        <svg className="mx-auto h-10 w-10 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <h3 className="text-sm font-medium text-foreground mt-3 mb-1">
          {notASolicitation
            ? `${solicitationNumber} is not a solicitation number`
            : `No match for ${solicitationNumber}`}
        </h3>
        <p className="text-xs text-muted max-w-md mx-auto">
          {error ? (
            error
          ) : notASolicitation ? (
            <>
              SAM.gov carries this number as{" "}
              {excludedTypes.length === 1 && excludedTypes[0] === "Award Notice"
                ? "an award notice — the record of a contract that has already been awarded"
                : `a ${excludedTypes.join(" / ").toLowerCase()}`}
              , not as a solicitation, so a solicitation search does not return it.
            </>
          ) : (
            mode === "contract"
              ? "No DLA order history and no SAM.gov award under this number. Dashes, spaces and capitalisation are ignored, so check the digits themselves."
              : "Nothing found in DIBBS or SAM.gov under this number. Dashes, spaces and capitalisation are ignored, so check the digits themselves."
          )}
        </p>
      </div>
    );
  }

  // results are newest-first, so [0] is the current state of this number.
  const noticeType = results[0].notice_type;
  // Awards and other non-solicitation notices never reach here — the API bounds
  // this lookup to solicitation stages and reports them through
  // excluded_notice_types instead, handled in the empty state above. What is
  // left is a live solicitation or one of its two pre-award stages.
  const explanation = mode === "contract"
    ? "SAM.gov recorded an award under this number. The contract-number search covers DLA order history, which does not include civilian agencies, so this award is only visible here."
    : isEarlyStageNoticeType(noticeType)
    ? `SAM.gov publishes it as a ${noticeType?.toLowerCase()} notice — an early-stage posting rather than a solicitation on the street, so there is nothing to quote yet and its response date is not a quote deadline.`
    : "It is on SAM.gov as a notice with no part or NSN attached — typically a service, repair or construction buy, or a supply buy the government posted without an NSN.";

  return (
    <div className="space-y-3">
      <div className="bg-primary-light/40 border border-border rounded-lg px-3 py-2">
        <p className="text-xs text-foreground">
          <span className="font-medium">
            {mode === "contract"
              ? "No parts are listed against this contract number."
              : "No parts are listed on this solicitation."}
          </span>{" "}
          {/* Naming the reason matters: a supplier who searches an NSN-less
              solicitation and sees an empty page assumes the system is broken
              or that they mistyped, rather than learning that this is simply a
              buy with no NSN behind it.
              
              But the reason depends on what SAM is actually publishing. An
              award notice has no parts because the contract is already awarded,
              not because it is a services buy, and telling someone it is
              "typically a service or repair buy" would send them to quote
              something that closed. The newest version decides the wording;
              the per-row badge still marks each one. */}
          {explanation}
        </p>
      </div>

      {results.length > 1 && (
        <p className="text-xs text-muted">
          {results.length} versions of this number, newest first — reposts usually
          carry amendments.
        </p>
      )}

      <SolicitationResultsTable
        results={results}
        total={results.length}
        page={1}
        pageSize={results.length}
        sort="posted"
        onSort={() => {}}
        onSelect={setSelected}
        onPageChange={() => {}}
        isLoading={false}
        hasKeyword={false}
        sortable={false}
      />

      <SolicitationDetailPanel result={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
