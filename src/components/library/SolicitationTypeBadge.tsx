"use client";

import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { useCodeDefinitions } from "@/lib/hooks/useCodeDefinitions";

// ============================================================================
// SolicitationTypeBadge — DLA Solicitation Type Indicator pill.
// ============================================================================
// Renders the solicitations.solicitation_type indicator ('F' / 'P' / 'I') that
// the worker pipeline reads from column 2 of DLA's daily bq*.txt export.
//
// Two rules drive the whole component:
//
//  1. NULL MEANS UNKNOWN, NOT "NO". The column is new — historical rows were
//     only backfillable where the source files still existed (~3 days), so a
//     large share of still-quotable solicitations are untyped and that share
//     shrinks on its own as untyped rows close. Rendering *anything* for an
//     absent value ("Not fast award", a greyed pill, a ✗, even a placeholder
//     dash) would assert a fact we do not have. So: no code, no output.
//
//  2. LABELS COME FROM code_definitions, NEVER FROM THIS FILE. Text and
//     tooltip copy are resolved at runtime from code_type='SOLICITATION_TYPE'
//     via useCodeDefinitions, whose module-level cache makes this one fetch per
//     session no matter how many rows render it. When a code has no definition
//     row we render nothing rather than falling back to the raw char — unlike
//     a set-aside code ("SDVOSBC"), a bare "F" tells a buyer nothing.
//
// Only 'F' and 'I' are badged. 'P' (Auto Evaluation) is real but not decision-
// relevant, so it is deliberately absent from BADGE_VARIANTS below and renders
// nothing; giving it a badge later is a one-line addition here.
// ============================================================================

// Which indicators get a pill, and in what color.
//
// 'F' is the one customers act on — a fast-award buy can be awarded BEFORE the
// stated return date, so it gets the only green (success) pill in the row.
// 'I' (a different contract vehicle) is context, not urgency, so it stays
// muted. Neither uses `info`, which the Set-Aside column already owns.
const BADGE_VARIANTS: Record<string, "success" | "default"> = {
  F: "success",
  I: "default",
};

interface SolicitationTypeBadgeProps {
  code: string | null | undefined;
  // Server-resolved label (solicitation_type_label). Preferred when present so
  // the pill still renders on the first paint, before the code_definitions
  // fetch settles.
  label?: string | null;
}

export function SolicitationTypeBadge({ code, label }: SolicitationTypeBadgeProps) {
  // Hook runs unconditionally (rules of hooks) — the shared cache makes the
  // call free for the rows that end up rendering nothing.
  const { byCode } = useCodeDefinitions("SOLICITATION_TYPE");

  const normalized = code?.trim().toUpperCase();
  if (!normalized) return null;

  const variant = BADGE_VARIANTS[normalized];
  if (!variant) return null;

  const definition = byCode.get(normalized);
  const text = label ?? definition?.label;
  // No resolvable label (codes not seeded in this environment, or fetch still
  // in flight with no server-side label) — stay silent rather than show "F".
  if (!text) return null;

  const badge = (
    <Badge variant={variant} size="sm" className="shrink-0 whitespace-nowrap">
      {text}
    </Badge>
  );

  // description is the customer-value copy ("...may be awarded prior to the
  // solicitation return date, so quoting early matters"). Deliberately NOT
  // mirrored into a native title= attribute: the browser renders that as its
  // own tooltip on top of the popover, so the copy shows up twice.
  const description = definition?.description;
  if (!description) return badge;

  return <Tooltip content={description}>{badge}</Tooltip>;
}
