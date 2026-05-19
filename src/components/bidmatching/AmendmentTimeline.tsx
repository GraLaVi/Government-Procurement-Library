"use client";

import { useEffect, useState } from "react";
import {
  AmendmentEntry,
  SolicitationAmendmentsResponse,
  labelForChangeReason,
  labelForField,
  renderStateValue,
  timeAgo,
} from "@/lib/amendments";

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
    <ol className="space-y-3">
      {data.amendments.map((a) => (
        <AmendmentCard key={a.id} amendment={a} />
      ))}
    </ol>
  );
}

function AmendmentCard({ amendment: a }: { amendment: AmendmentEntry }) {
  return (
    <li className="rounded-lg border border-border bg-card-bg p-3">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-foreground">
            Amendment {a.amendment_number}
          </span>
          <span className="text-xs text-muted">{labelForChangeReason(a.change_reason)}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span title={new Date(a.detected_at).toLocaleString()}>{timeAgo(a.detected_at)}</span>
          <span className="px-1.5 py-0.5 rounded bg-muted/10 uppercase tracking-wide">
            via {a.source}
          </span>
        </div>
      </div>
      <AmendmentBody amendment={a} />
    </li>
  );
}

function AmendmentBody({ amendment: a }: { amendment: AmendmentEntry }) {
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
  // the prior_state / new_state JSONB snapshots.
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
          prior={a.prior_state?.[key]}
          next={a.new_state?.[key]}
        />
      ))}
    </dl>
  );
}

function FieldDiff({
  fieldKey,
  prior,
  next,
}: {
  fieldKey: string;
  prior: unknown;
  next: unknown;
}) {
  return (
    <>
      <dt className="text-muted">{labelForField(fieldKey)}</dt>
      <dd className="text-foreground">
        <span className="text-muted line-through mr-2">{renderStateValue(prior)}</span>
        <span className="text-foreground font-medium">{renderStateValue(next)}</span>
      </dd>
    </>
  );
}
