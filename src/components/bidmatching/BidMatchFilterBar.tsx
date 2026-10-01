"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Condition filter for the bid-match results page.
 *
 * Replaces the single field-scoped search box. A row is field + operator +
 * value; rows are ANDed. The wire form is `field:op:value`, repeated as `f` —
 * the same string the API compiles, so what the URL says is what ran.
 *
 * The field list is FETCHED, not hardcoded: AMC, TDP/specs and fast-award are
 * DIBBS-only, and a list that drifted from the backend's registry would offer
 * filters that come back as 400s. Switching source refetches it, and any row
 * whose field the new source does not carry is dropped rather than sent.
 *
 * Draft rows are local until Apply. Filtering on every keystroke would fire a
 * request per character against a query that reaches line items on every
 * solicitation in the bucket.
 */

export interface FilterFieldDef {
  field: string;
  label: string;
  kind: "code" | "text" | "nsn" | "number" | "bool";
  operators: string[];
  values: string[] | null;
}

export interface FilterRow {
  field: string;
  op: string;
  value: string;
}

/** Operator labels, in the words the page already uses for these ideas. */
const OP_LABELS: Record<string, string> = {
  in: "is any of",
  not_in: "is not any of",
  blank: "not recorded",
  contains: "contains",
  not_contains: "does not contain",
  gte: "at least",
  lte: "at most",
  eq: "equals",
  is: "is",
};

/** Operators that take no value — the operator IS the whole condition. */
const VALUELESS_OPS = new Set(["blank"]);

const VALUE_HINTS: Record<string, string> = {
  // Two different codes, two different shapes. AMC is the two-character
  // AMC+AMSC pair off the part record ('1G'); AMSC is the single suffix
  // character off the solicitation header ('G'). The hints have to show the
  // difference or the two fields look like a duplicate.
  amc: "1G, 3D — comma separated",
  amsc: "G, Z — comma separated",
  fsc: "5306, 5340 — comma separated",
  description: "e.g. VALVE",
  nsn: "NSN, NIIN or part #",
  qty: "e.g. 500",
  est_value: "e.g. 10000",
  solicitation: "e.g. SPE7M4",
  reason: "e.g. NIIN",
};

/** Closed vocabularies get readable labels; the wire value stays as stored. */
const VALUE_LABELS: Record<string, string> = {
  full: "Full TDP",
  spec_only: "Spec only",
  none: "None held",
};

export function serializeFilters(rows: FilterRow[]): string[] {
  return rows
    .filter((r) => r.field && r.op && (VALUELESS_OPS.has(r.op) || r.value.trim() !== ""))
    .map((r) => `${r.field}:${r.op}:${VALUELESS_OPS.has(r.op) ? "" : r.value.trim()}`);
}

export function parseFilterParams(raw: string[]): FilterRow[] {
  return raw.map((s) => {
    const parts = s.split(":");
    return { field: parts[0] ?? "", op: parts[1] ?? "", value: parts.slice(2).join(":") };
  });
}

interface Props {
  source: "dibbs" | "sam";
  applied: FilterRow[];
  onApply: (rows: FilterRow[]) => void;
  /** Rendered next to Apply — the caller owns what "everything else" means. */
  onClearAll?: () => void;
  hasOtherFilters?: boolean;
}

export function BidMatchFilterBar({
  source, applied, onApply, onClearAll, hasOtherFilters,
}: Props) {
  const [fields, setFields] = useState<FilterFieldDef[]>([]);
  const [maxFilters, setMaxFilters] = useState(12);
  const [rows, setRows] = useState<FilterRow[]>(applied);
  const [open, setOpen] = useState(applied.length > 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bid-matching/results/filter-fields?source=${source}`);
        if (!res.ok) throw new Error("Could not load filter fields");
        const data = await res.json();
        if (cancelled) return;
        setFields(data.fields ?? []);
        setMaxFilters(data.max_filters ?? 12);
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("Filters are unavailable right now.");
      }
    })();
    return () => { cancelled = true; };
  }, [source]);

  const byField = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.field, f])), [fields],
  );

  // Switching source can strip a field (AMC exists on DIBBS only). Drop those
  // rows and re-apply, rather than sending a condition that would 400.
  useEffect(() => {
    if (fields.length === 0) return;
    const kept = rows.filter((r) => byField[r.field]);
    if (kept.length !== rows.length) {
      setRows(kept);
      onApply(kept);
    }
    // onApply is stable in the parent (useCallback); rows are read, not watched,
    // so this runs on a field-list change rather than on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  // Keep the draft in step when the parent clears filters from elsewhere.
  useEffect(() => { setRows(applied); }, [applied]);

  const dirty = useMemo(
    () => JSON.stringify(serializeFilters(rows)) !== JSON.stringify(serializeFilters(applied)),
    [rows, applied],
  );

  const addRow = useCallback(() => {
    const first = fields[0];
    if (!first) return;
    setRows((r) => [...r, { field: first.field, op: first.operators[0], value: "" }]);
  }, [fields]);

  const update = (i: number, patch: Partial<FilterRow>) =>
    setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  const removeRow = (i: number) => setRows((r) => r.filter((_, n) => n !== i));

  const apply = () => onApply(rows.filter((r) => serializeFilters([r]).length > 0));

  const clearRows = () => { setRows([]); onApply([]); };

  const appliedCount = serializeFilters(applied).length;

  if (loadError) {
    return <p className="text-xs text-muted">{loadError}</p>;
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg border cursor-pointer ${
            appliedCount > 0
              ? "border-primary text-primary"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
               strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 4h18M7 12h10M11 20h2" />
          </svg>
          Filters
          {appliedCount > 0 && (
            <span className="ml-0.5 px-1.5 rounded-full bg-primary text-white text-[11px] leading-5">
              {appliedCount}
            </span>
          )}
        </button>

        {/* The summary is muted on purpose — it is read, not clicked. Clear
            filters must therefore NOT be muted too, or the two run together
            into one grey line and the control disappears into the text it
            sits beside. */}
        {appliedCount > 0 && !open && (
          <span className="text-xs text-muted">
            {serializeFilters(applied).map((f) => {
              const [field, op, ...rest] = f.split(":");
              const def = byField[field];
              return `${def?.label ?? field} ${OP_LABELS[op] ?? op} ${rest.join(":")}`.trim();
            }).join("  ·  ")}
          </span>
        )}

        {(appliedCount > 0 || hasOtherFilters) && (
          <button
            type="button"
            onClick={() => { clearRows(); onClearAll?.(); }}
            className="text-xs font-medium text-primary hover:text-primary-hover underline underline-offset-2 cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-lg border border-border bg-card-bg p-3 space-y-2">
          {rows.length === 0 && (
            <p className="text-xs text-muted">
              No conditions yet. Add one to narrow these matches.
            </p>
          )}

          {rows.map((row, i) => {
            const def = byField[row.field];
            const ops = def?.operators ?? [];
            const needsValue = !VALUELESS_OPS.has(row.op);
            return (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <select
                  value={row.field}
                  aria-label="Filter field"
                  onChange={(e) => {
                    const next = byField[e.target.value];
                    update(i, { field: e.target.value, op: next?.operators[0] ?? "", value: "" });
                  }}
                  className="border border-border rounded-md bg-card-bg text-foreground text-sm px-2 py-1.5 cursor-pointer"
                >
                  {fields.map((f) => (
                    <option key={f.field} value={f.field}>{f.label}</option>
                  ))}
                </select>

                <select
                  value={row.op}
                  aria-label="Filter operator"
                  onChange={(e) => update(i, { op: e.target.value })}
                  className="border border-border rounded-md bg-card-bg text-foreground text-sm px-2 py-1.5 cursor-pointer"
                >
                  {ops.map((op) => (
                    <option key={op} value={op}>{OP_LABELS[op] ?? op}</option>
                  ))}
                </select>

                {needsValue && def?.kind === "bool" && (
                  <select
                    value={row.value || "true"}
                    aria-label="Filter value"
                    onChange={(e) => update(i, { value: e.target.value })}
                    className="border border-border rounded-md bg-card-bg text-foreground text-sm px-2 py-1.5 cursor-pointer"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                )}

                {needsValue && def?.kind !== "bool" && def?.values && (
                  <select
                    value={row.value}
                    aria-label="Filter value"
                    onChange={(e) => update(i, { value: e.target.value })}
                    className="border border-border rounded-md bg-card-bg text-foreground text-sm px-2 py-1.5 cursor-pointer"
                  >
                    <option value="">Choose…</option>
                    {def.values.map((v) => (
                      <option key={v} value={v}>{VALUE_LABELS[v] ?? v}</option>
                    ))}
                  </select>
                )}

                {needsValue && def?.kind !== "bool" && !def?.values && (
                  <input
                    type={def?.kind === "number" ? "number" : "text"}
                    value={row.value}
                    aria-label="Filter value"
                    placeholder={VALUE_HINTS[row.field] ?? ""}
                    onChange={(e) => update(i, { value: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
                    className="flex-1 min-w-[180px] max-w-xs border border-border rounded-md bg-card-bg text-foreground text-sm px-2.5 py-1.5"
                  />
                )}

                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label="Remove this condition"
                  className="text-muted hover:text-foreground text-lg leading-none px-1 cursor-pointer"
                >
                  ×
                </button>
              </div>
            );
          })}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={addRow}
              disabled={rows.length >= maxFilters || fields.length === 0}
              className="text-sm text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
            >
              + Add condition
            </button>
            {rows.length >= maxFilters && (
              <span className="text-xs text-muted">Limit of {maxFilters} reached.</span>
            )}
            <div className="flex-1" />
            {rows.length > 0 && (
              <button
                type="button"
                onClick={clearRows}
                className="text-xs font-medium text-primary hover:text-primary-hover underline underline-offset-2 cursor-pointer"
              >
                Remove all
              </button>
            )}
            <button
              type="button"
              onClick={apply}
              disabled={!dirty}
              className="text-sm px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Apply
            </button>
          </div>

          {/* Conditions combine with AND, which is the behaviour people assume
              and the one the compiler implements. Saying so costs one line and
              prevents "why did adding a filter return fewer rows". */}
          <p className="text-[11px] text-muted pt-1">
            All conditions must match. {source === "sam"
              ? "AMC, TDP/specs and fast-award apply to DLA matches only."
              : "Conditions reach every line item on the solicitation."}
          </p>
        </div>
      )}
    </div>
  );
}
