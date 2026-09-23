import { RowBadge } from "@/components/library/RowBadge";

// ============================================================================
// NoticeTypeBadge — "you cannot bid this yet" marker for SAM.gov rows.
// ============================================================================
// sam_opportunities.notice_type says what STAGE a posting is at. Two of those
// stages are not solicitations at all:
//
//   Presolicitation  — the buyer has announced an upcoming requirement.
//   Sources Sought   — market research. Responding puts you on the buyer's
//                      radar; it is not a bid.
//
// Both appear in the bid-matching results and in the Recent Solicitations
// tables alongside real solicitations, and until this badge existed the only
// thing separating them was a hover tooltip. A customer scanning a table has
// no reason to hover a row that looks like every other row, so the distinction
// was effectively invisible — and the failure mode is expensive: working a
// sources-sought notice as if it were a live solicitation, or reading its
// response date as a quote deadline.
//
// THE DEFAULT IS TO BADGE ONLY THE EXCEPTION. Biddable notice types render
// NOTHING unless the caller asks for them (see showBiddable). These rows
// already carry up to six badges; a seventh pill on every SAM row is noise
// that trains the eye to skip the whole cluster, which is exactly what we are
// trying to fix. Marking only the ~minority that are not biddable keeps the
// amber chip meaning something.
// ============================================================================

// Values are SAM's own strings, matched verbatim against the raw column — the
// backend's src/sam_notice_types.py holds the same vocabulary for its filter,
// so the two lists have to agree.
//
// LABELS ARE THE WIDTH KNOB. These sit in dense tables where every character
// squeezes the columns beside them; they are deliberately plain-English rather
// than SAM's jargon ("Sources Sought" tells a new customer nothing), and the
// full official term is in the tooltip either way. Shorten here if the rows
// get tight — nothing else reads these strings.
const EARLY_STAGE: Record<string, { label: string; title: string }> = {
  Presolicitation: {
    label: "Pre-solicitation",
    title:
      "Presolicitation (SAM.gov) — the buyer has announced an upcoming " +
      "requirement, but no solicitation is on the street yet. Nothing to quote.",
  },
  "Sources Sought": {
    label: "Market research",
    title:
      "Sources Sought (SAM.gov) — market research, not a solicitation. " +
      "Responding tells the buyer you can supply this; it is not a bid, and " +
      "the response date is not a quote deadline.",
  },
};

// A solicitation really is on the street. Rendered only when the caller sets
// showBiddable — "Combined" is shortened because the full
// "Combined Synopsis/Solicitation" is twice the width of any other row badge.
const BIDDABLE: Record<string, string> = {
  Solicitation: "Solicitation",
  "Combined Synopsis/Solicitation": "Combined",
};

/**
 * Notice-stage predicates, exported so callers can explain a row in prose
 * without keeping a second copy of SAM's vocabulary. The badge marks one row;
 * these let a surface say something about a whole result set — the
 * solicitation-number fallback uses them to avoid describing an already-awarded
 * contract as "a service or repair buy you might quote".
 *
 * NULL is treated as biddable: a DIBBS row carries no notice_type and IS a
 * solicitation on the street, which is the same assumption the badge makes.
 */
export function isBiddableNoticeType(noticeType?: string | null): boolean {
  return !noticeType || noticeType in BIDDABLE;
}

export function isEarlyStageNoticeType(noticeType?: string | null): boolean {
  return !!noticeType && noticeType in EARLY_STAGE;
}

/**
 * What KIND of number a row's identifier is, for a column that can hold more
 * than one kind — "Award", "Pre-solicitation", "Sources sought".
 *
 * Returns null for an ordinary solicitation, and for an untyped row, following
 * the same rule as the badge above: label the exception, not the default. Every
 * row on the keyword-search surface is a solicitation, so labelling those would
 * put the same word on every line and train the eye to skip it — which is
 * exactly what would hide the one row that says Award.
 */
export function numberKindLabel(noticeType?: string | null): string | null {
  if (!noticeType || noticeType in BIDDABLE) return null;
  if (noticeType === "Award Notice") return "Award";
  if (noticeType === "Presolicitation") return "Pre-solicitation";
  if (noticeType === "Sources Sought") return "Sources sought";
  // Anything SAM adds later names itself rather than going unlabelled.
  return noticeType;
}

interface NoticeTypeBadgeProps {
  /** sam_opportunities.notice_type, verbatim. NULL on DIBBS rows. */
  noticeType?: string | null;
  /**
   * Also render a green chip for biddable notice types, and a neutral chip
   * carrying the raw value for unrecognised ones.
   *
   * Set this ONLY where the chip doubles as the row's SAM.gov source marker —
   * the vendor Open Solicitations tab, where nothing else in the row says
   * where the opportunity came from. Tables that mark their SAM rows some
   * other way should leave it off and let the badge stay an exception flag.
   */
  showBiddable?: boolean;
}

export function NoticeTypeBadge({ noticeType, showBiddable = false }: NoticeTypeBadgeProps) {
  const early = noticeType ? EARLY_STAGE[noticeType] : undefined;
  if (early) {
    return (
      <RowBadge tone="amber" title={early.title}>
        {early.label}
      </RowBadge>
    );
  }

  const biddable = noticeType ? BIDDABLE[noticeType] : undefined;

  if (!showBiddable) {
    // Biddable, or a DIBBS row: silent. A DIBBS row IS a solicitation on the
    // street, so an absent notice_type is nothing to flag.
    if (biddable || !noticeType) return null;
    // Named by SAM, but not one of the types you can quote — Award Notice and
    // Special Notice both turn up in bid-match results. Mirrors the backend's
    // allow-list (src/sam_notice_types.py): anything SAM names that isn't a
    // solicitation gets marked, so a new notice type can't slip through
    // looking biddable. No specific label to give it, so it says the one thing
    // that matters and puts the official term in the tooltip.
    return (
      <RowBadge tone="amber" title={`${noticeType} (SAM.gov) — not a solicitation you can quote.`}>
        Not biddable
      </RowBadge>
    );
  }

  if (biddable) {
    return (
      <RowBadge tone="green" title={`SAM.gov · ${noticeType}`}>
        {biddable}
      </RowBadge>
    );
  }

  return (
    <RowBadge tone="neutral" title={noticeType ? `SAM.gov · ${noticeType}` : "SAM.gov opportunity"}>
      {noticeType || "Opportunity"}
    </RowBadge>
  );
}
