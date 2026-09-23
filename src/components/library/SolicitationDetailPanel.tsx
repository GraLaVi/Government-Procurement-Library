"use client";

import { useEffect, useState } from "react";
import { RowBadge } from "@/components/library/RowBadge";
import {
  NoticeTypeBadge, isBiddableNoticeType, numberKindLabel,
} from "@/components/library/NoticeTypeBadge";
import { SamDocumentsButton } from "@/components/library/SamDocumentsButton";
import {
  SamContact,
  SolicitationDetailResult,
  SolicitationResult,
  describeCloseDate,
} from "@/lib/library/solicitationSearch";
import {
  displayNumber, parentContractNumber, parseAwardAmount,
} from "@/lib/library/solicitationSearch";
import { formatContractDate, formatCurrency } from "@/lib/library/types";

// ============================================================================
// SolicitationDetailPanel — one SAM.gov notice, as a slide-over.
// ============================================================================
// A panel rather than a route, and deliberately not the parts detail page.
//
// PartDetail renders nine tabs — Overview, Solicitations, Procurement history,
// Manufacturers, Inventory, Technical, End use, Packaging, PID — and every one
// of them is driven by a part. These notices have no part, so on that page all
// nine would be empty and the customer would be left hunting for the one thing
// that IS here. Everything a notice actually carries fits on one screen, so it
// gets one screen.
//
// Staying a panel also keeps the result list behind it: these searches return
// hundreds of rows and scanning them is the job, so closing a notice should put
// the customer back exactly where they were, with no route change to undo.
// ============================================================================

function ContactBlock({ label, contact }: { label: string; contact: SamContact | null }) {
  if (!contact) return null;
  const name = typeof contact.fullName === "string" ? contact.fullName : null;
  const email = typeof contact.email === "string" ? contact.email : null;
  const phone = typeof contact.phone === "string" ? contact.phone : null;
  const title = typeof contact.title === "string" ? contact.title : null;
  if (!name && !email && !phone) return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-xs text-foreground mt-0.5">
        {name && <span className="block">{name}</span>}
        {title && <span className="block text-muted">{title}</span>}
        {email && (
          <a href={`mailto:${email}`} className="block text-primary hover:underline break-all">
            {email}
          </a>
        )}
        {phone && <span className="block text-muted">{phone}</span>}
      </dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-xs text-foreground mt-0.5">{value}</dd>
    </div>
  );
}

export function SolicitationDetailPanel({
  result,
  onClose,
}: {
  /** The clicked row. The panel paints from this immediately and fills in the rest. */
  result: SolicitationResult | null;
  onClose: () => void;
}) {
  const oppId = result?.opp_id ?? null;

  const [detail, setDetail] = useState<SolicitationDetailResult | null>(null);
  const [isLoading, setIsLoading] = useState(oppId !== null);
  const [error, setError] = useState<string | null>(null);

  // Clearing the previous notice is a state RESET on a prop change, not a
  // synchronisation with anything outside React, so it belongs in render rather
  // than in the effect — same pattern PartsSearchForm uses for its defaults.
  // Doing it inside the effect made the panel paint the old notice's
  // description for one frame before blanking it, and tripped the
  // set-state-in-effect rule for the same underlying reason.
  const [prevOppId, setPrevOppId] = useState(oppId);
  if (oppId !== prevOppId) {
    setPrevOppId(oppId);
    setDetail(null);
    setError(null);
    setIsLoading(oppId !== null);
  }

  useEffect(() => {
    if (oppId === null) return;
    let cancelled = false;
    fetch(`/api/library/sam-opportunities/${oppId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load solicitation");
        return data as SolicitationDetailResult;
      })
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    // Ignore a response for a row the user has already clicked past.
    return () => { cancelled = true; };
  }, [oppId]);

  // Escape closes, matching every other overlay in the app.
  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [result, onClose]);

  if (!result) return null;

  // Seeded from the row so the panel has content on the first paint, then
  // replaced wholesale when the fetch lands. Typed as the LIST shape, not cast
  // to the detail shape: the row genuinely does not carry description,
  // contacts or the PoP zip, and asserting otherwise would let a field that is
  // only ever undefined before the fetch read as populated. Those four are
  // read off `detail` directly, so they simply stay absent until it arrives.
  const d: SolicitationResult = detail ?? result;
  // Must be the same number the results row displayed, or clicking a row
  // appears to open a different record.
  const number = displayNumber(d);
  const kind = numberKindLabel(d.notice_type);

  // Status chip, derived from notice_type FIRST and only then from is_open.
  //
  // is_open answers "is the deadline in the future, or absent on a notice SAM
  // still flags active" — which is the right question for the search surface,
  // where every result is a solicitation you could quote. The by-number lookup
  // deliberately applies no notice-type filter, so is_open lands on notices it
  // was never meant to describe: an award notice has no deadline and stays
  // active for a while after the award, which made it read "Open" — the exact
  // opposite of the truth, on the one word a bidder acts on.
  //
  // So: an award says Awarded. Anything else that is not quotable says nothing
  // at all, because NoticeTypeBadge already carries that meaning ("Not
  // biddable", "Pre-solicitation", "Market research") and a second chip reading
  // Open beside it would contradict it.
  const statusChip: { label: string; tone: "neutral" | "amber"; title?: string } | null =
    d.notice_type === "Award Notice"
      ? {
          label: "Awarded",
          tone: "neutral",
          title: "This contract has been awarded — there is nothing to quote.",
        }
      : !isBiddableNoticeType(d.notice_type)
      ? null
      : d.is_open
      ? { label: "Open", tone: "neutral" }
      : { label: "Closed", tone: "amber" };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Solicitation ${number}`}
        className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl bg-card-bg border-l border-border shadow-xl flex flex-col"
      >
        <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-foreground break-all">{number}</p>
            <p className="text-xs text-muted mt-0.5">
              {kind ? `${kind} · ` : ""}
              {d.agency}
              {d.office ? ` · ${d.office}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-muted hover:text-foreground cursor-pointer p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <div>
            <h2 className="text-sm font-medium text-foreground">{d.title || "Untitled notice"}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <NoticeTypeBadge noticeType={d.notice_type} />
              {d.set_aside_code && (
                <RowBadge title={d.set_aside_description || undefined}>{d.set_aside_code}</RowBadge>
              )}
              {statusChip && (
                <RowBadge tone={statusChip.tone} title={statusChip.title}>
                  {statusChip.label}
                </RowBadge>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Fact label="Posted" value={formatContractDate(d.posted_date)} />
            {/* Only shown where a deadline means something. On an award notice
                "No deadline posted" is noise at best: the buy is finished. */}
            {(isBiddableNoticeType(d.notice_type) || d.close_date) && (
            <Fact
              label="Closes"
              value={
                d.close_date ? (
                  <>
                    {formatContractDate(d.close_date)}
                    <span className="block text-muted">{describeCloseDate(d.close_date, d.is_open)}</span>
                  </>
                ) : (
                  // Not an error: SAM does not require a deadline, and about
                  // one in eight of these notices has none. Saying so is more
                  // useful than an em dash the customer has to interpret.
                  <span className="text-muted">No deadline posted</span>
                )
              }
            />
            )}
            <Fact label="NAICS" value={d.naics_code} />
            <Fact label="PSC" value={d.psc_code} />
            <Fact
              label="Place of performance"
              value={
                [d.place_of_performance_city, d.place_of_performance_state, detail?.place_of_performance_zip]
                  .filter(Boolean).join(", ") || null
              }
            />
            <Fact label="Set-aside" value={d.set_aside_description || d.set_aside_code} />
            <ContactBlock label="Primary contact" contact={detail?.primary_contact ?? null} />
            <ContactBlock label="Secondary contact" contact={detail?.secondary_contact ?? null} />
          </dl>

          {/* Award block. A contract number is asked in order to learn who won
              and for how much, so "Awarded" without these is a dead end. Only
              rendered when SAM actually published them — coverage is partial
              (~60% carry an awardee, ~89% an amount), and an empty box would
              read as though the award had no winner. */}
          {detail && detail.notice_type === "Award Notice" &&
            (detail.awardee_name || detail.award_amount || detail.award_number) && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-1.5">Award</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Fact label="Awarded to" value={detail.awardee_name} />
                <Fact
                  label="Amount"
                  value={(() => {
                    const amount = parseAwardAmount(detail.award_amount);
                    // Fall back to SAM's raw string rather than dropping it:
                    // the column is free text and an unparseable value is still
                    // information.
                    return amount !== null ? formatCurrency(amount) : detail.award_amount;
                  })()}
                />
                {/* SAM concatenates the parent contract and the order number
                    into award.number with no separator, so the raw value reads
                    as one unfamiliar string. Split out, both halves are
                    recognisable: the order is what was searched, the parent is
                    the schedule or IDIQ it was placed against. */}
                <Fact
                  label="Parent contract"
                  value={parentContractNumber(detail)}
                />
                <Fact label="Award number (as SAM publishes it)" value={detail.award_number} />
                {/* Named explicitly because the header now shows the award
                    number: on ~90% of awards this is a different number, and it
                    is the one that links this award back to the RFQ. */}
                <Fact
                  label="From solicitation"
                  value={
                    detail.solicitation_number &&
                    detail.solicitation_number !== detail.award_number
                      ? detail.solicitation_number
                      : null
                  }
                />
                <Fact label="Awardee CAGE" value={detail.awardee_cage} />
                <Fact label="Awardee UEI" value={detail.awardee_uei} />
              </dl>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-foreground mb-1.5">Description</h3>
            {isLoading && !detail ? (
              <p className="text-xs text-muted">Loading…</p>
            ) : error ? (
              <p className="text-xs text-error">{error}</p>
            ) : detail?.description ? (
              // Plain, auto-escaped text with whitespace preserved — the same
              // treatment the vendor Open Solicitations modal gives it. The
              // backend has already flattened SAM's markup to text, so there is
              // nothing here to trust and nothing to sanitize in the browser.
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                {detail.description}
              </p>
            ) : (
              <p className="text-xs text-muted">
                SAM.gov published no description text for this notice
                {d.ui_link ? " — the details are on its SAM.gov page." : "."}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-foreground mb-1.5">Documents</h3>
            {d.document_count > 0 ? (
              <SamDocumentsButton oppId={d.opp_id} count={d.document_count} label={number} />
            ) : (
              <p className="text-xs text-muted">
                No documents harvested for this notice yet.
                {d.ui_link ? " Any attachments are on its SAM.gov page." : ""}
              </p>
            )}
          </div>

          {d.ui_link && (
            <a
              href={d.ui_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View on SAM.gov
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7m0-7L10 14m-7 7h7" />
              </svg>
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
