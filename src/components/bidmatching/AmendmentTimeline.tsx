"use client";

import { useEffect, useState } from "react";
import {
  AmendmentEntry,
  SolicitationAmendmentsResponse,
  isSetAsideField,
  labelForChangeReason,
  labelForField,
  pickAmendmentValue,
  renderStateValue,
  resolveSetAsideLabel,
  timeAgo,
} from "@/lib/amendments";
import { useCodeDefinitions } from "@/lib/hooks/useCodeDefinitions";
import type { CodeDefinition } from "@/lib/codeDefinitions";
import {
  SolicitationHistoryCard,
  SolicitationHistoryList,
} from "@/components/ui/SolicitationHistoryModal";

interface Props {
  solicitationId: number;
  // Optional preloaded data; when omitted, the component fetches the
  // timeline itself.
  initial?: SolicitationAmendmentsResponse;
}

// Read-only timeline view of every amendment recorded against a sol.
// Newest at the top. Renders per-field diffs from prior_state/new_state
// when present, or a friendly "New line item added" block for new_item.
export function AmendmentTimeline({ solicitationId, initial }: Props) {
  const [data, setData] = useState<SolicitationAmendmentsResponse | null>(initial ?? null);
  const [isLoading, setIsLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/library/solicitations/${solicitationId}/amendments`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load amendments");
        const json = (await res.json()) as SolicitationAmendmentsResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load amendments");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [solicitationId, initial]);

  // Resolve canonical set-aside codes (e.g. "HZC") to their human labels via
  // code_definitions. Hook fires unconditionally; cost is negligible because
  // fetchCodeDefinitions is module-cached and shared across timelines.
  const setAsideByCode = useSetAsideByCode();

  if (isLoading) {
    return (
      <div className="py-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-error py-4">{error}</p>;
  }

  if (!data || data.amendments.length === 0) {
    return (
      <p className="text-sm text-muted italic py-4">
        No amendments recorded for this solicitation.
      </p>
    );
  }

  return (
    <SolicitationHistoryList>
      {data.amendments.map((a) => (
        <AmendmentCard key={a.id} amendment={a} setAsideByCode={setAsideByCode} />
      ))}
    </SolicitationHistoryList>
  );
}

// Wraps useCodeDefinitions for the SET_ASIDE vocabulary; returned map is
// keyed by canonical uppercase code, so callers can do `byCode.get("HZC")`.
function useSetAsideByCode(): ReadonlyMap<string, CodeDefinition> {
  const { byCode } = useCodeDefinitions("SET_ASIDE");
  return byCode;
}

function AmendmentCard({
  amendment: a,
  setAsideByCode,
}: {
  amendment: AmendmentEntry;
  setAsideByCode: ReadonlyMap<string, CodeDefinition>;
}) {
  return (
    <SolicitationHistoryCard
      headline={`Amendment ${a.amendment_number}`}
      meta={<span title={new Date(a.detected_at).toLocaleString()}>{timeAgo(a.detected_at)}</span>}
      facts={[labelForChangeReason(a.change_reason), `via ${a.source}`]}
    >
      <div className="pt-1">
        <AmendmentBody amendment={a} setAsideByCode={setAsideByCode} />
      </div>
    </SolicitationHistoryCard>
  );
}

function AmendmentBody({
  amendment: a,
  setAsideByCode,
}: {
  amendment: AmendmentEntry;
  setAsideByCode: ReadonlyMap<string, CodeDefinition>;
}) {
  if (a.change_reason === "new_item") {
    const part = renderStateValue(a.new_state?.part_id ?? "—");
    const pr = renderStateValue(a.new_state?.first_pr_number ?? "—");
    return (
      <p className="text-xs text-foreground">
        Part <span className="font-medium">{part}</span>
        {a.new_state?.first_pr_number ? <> · PR <span className="font-medium">{pr}</span></> : null}
      </p>
    );
  }

  // Render per-field diffs. Keys come from changed_fields; values from
  // the prior_state / new_state JSONB snapshots. pickAmendmentValue tolerates
  // the worker's set_aside → set_aside_code rename across the historical
  // rows still in the DB.
  const fields = a.changed_fields.length > 0
    ? a.changed_fields
    : Array.from(new Set([
        ...Object.keys(a.prior_state ?? {}),
        ...Object.keys(a.new_state ?? {}),
      ]));

  if (fields.length === 0) {
    return <p className="text-xs text-muted">No field-level details recorded.</p>;
  }

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
      {fields.map((key) => (
        <FieldDiff
          key={key}
          fieldKey={key}
          prior={pickAmendmentValue(a.prior_state, key)}
          next={pickAmendmentValue(a.new_state, key)}
          setAsideByCode={setAsideByCode}
        />
      ))}
    </dl>
  );
}

function FieldDiff({
  fieldKey,
  prior,
  next,
  setAsideByCode,
}: {
  fieldKey: string;
  prior: unknown;
  next: unknown;
  setAsideByCode: ReadonlyMap<string, CodeDefinition>;
}) {
  const renderValue = (v: unknown) =>
    isSetAsideField(fieldKey) ? resolveSetAsideLabel(v, setAsideByCode) : renderStateValue(v);
  return (
    <>
      <dt className="text-muted">{labelForField(fieldKey)}</dt>
      <dd className="text-foreground">
        <span className="text-muted line-through mr-2">{renderValue(prior)}</span>
        <span className="text-foreground font-medium">{renderValue(next)}</span>
      </dd>
    </>
  );
}
