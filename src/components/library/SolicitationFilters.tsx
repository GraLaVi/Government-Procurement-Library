"use client";

import {
  EMPTY_SOLICITATION_FILTERS,
  SOLICITATION_AGENCIES,
  SolicitationFilters as Filters,
  SolicitationStatus,
  hasActiveFilters,
} from "@/lib/library/solicitationSearch";

// ============================================================================
// SolicitationFilters — the filter rail for solicitation search.
// ============================================================================
// These notices have no part behind them, so the keyword is often the weakest
// signal a customer has: SAM titles average ~47 characters, and for several
// agencies the body is a bare link with no text to match at all. The structured
// fields are what actually narrow this corpus — NAICS, PSC, set-aside and
// agency are the terms a supplier already thinks in — which is why they get a
// permanent rail rather than hiding behind an "advanced" disclosure.
// ============================================================================

const inputClass =
  "w-full text-xs border border-border rounded px-2 py-1.5 bg-card-bg text-foreground " +
  "placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "block text-[11px] font-medium text-muted mb-1";

export function SolicitationFilters({
  filters,
  onChange,
  onApply,
  resultCount,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onApply: () => void;
  /** Shown inline so the effect of a filter is visible without scrolling. */
  resultCount: number | null;
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <aside className="bg-card-bg rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">Filters</h3>
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={() => { onChange({ ...EMPTY_SOLICITATION_FILTERS }); onApply(); }}
            className="text-[11px] text-primary hover:underline cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="sol-status">Status</label>
        <select
          id="sol-status"
          className={inputClass}
          value={filters.status}
          onChange={(e) => set("status", e.target.value as SolicitationStatus)}
        >
          <option value="open">Open only</option>
          {/* The closed tail is bounded at 3 months by the API; saying so here
              stops it reading as "all history". */}
          <option value="closed">Closed (last 3 months)</option>
          <option value="all">Open and recently closed</option>
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="sol-agency">Agency</label>
        <select
          id="sol-agency"
          className={inputClass}
          value={filters.agency}
          onChange={(e) => set("agency", e.target.value)}
        >
          <option value="">Any agency</option>
          {SOLICITATION_AGENCIES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} htmlFor="sol-naics">NAICS</label>
          <input
            id="sol-naics"
            className={inputClass}
            value={filters.naics}
            onChange={(e) => set("naics", e.target.value)}
            placeholder="336611"
            inputMode="numeric"
            maxLength={10}
          />
        </div>
        <div>
          {/* Prefix match server-side, so '53' is the whole family and '5305'
              is one code — worth saying, because typing a family code into an
              exact-match field elsewhere returns nothing. */}
          <label className={labelClass} htmlFor="sol-psc" title="Prefix match: 53 covers the whole family">
            PSC
          </label>
          <input
            id="sol-psc"
            className={inputClass}
            value={filters.psc}
            onChange={(e) => set("psc", e.target.value)}
            placeholder="53 or 5305"
            maxLength={10}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} htmlFor="sol-setaside">Set-aside</label>
          <input
            id="sol-setaside"
            className={inputClass}
            value={filters.set_aside}
            onChange={(e) => set("set_aside", e.target.value)}
            placeholder="SBA, SDVOSBC…"
            maxLength={20}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="sol-state">State</label>
          <input
            id="sol-state"
            className={inputClass}
            value={filters.state}
            onChange={(e) => set("state", e.target.value.toUpperCase())}
            placeholder="VA"
            maxLength={2}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} htmlFor="sol-posted-from">Posted from</label>
          <input
            id="sol-posted-from" type="date" className={inputClass}
            value={filters.posted_from}
            onChange={(e) => set("posted_from", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="sol-posted-to">Posted to</label>
          <input
            id="sol-posted-to" type="date" className={inputClass}
            value={filters.posted_to}
            onChange={(e) => set("posted_to", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="sol-docs">Documents</label>
        <select
          id="sol-docs"
          className={inputClass}
          value={filters.has_documents === null ? "" : String(filters.has_documents)}
          onChange={(e) =>
            set("has_documents", e.target.value === "" ? null : e.target.value === "true")
          }
        >
          <option value="">Any</option>
          {/* Coverage is uneven by agency — we have not harvested attachments
              for every one of them — so this filters what WE hold, not what
              SAM published. The label says "we have" for that reason. */}
          <option value="true">Documents we have</option>
          <option value="false">No documents yet</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onApply}
        className="w-full text-xs font-medium bg-primary hover:bg-primary-hover text-white rounded px-3 py-1.5 cursor-pointer transition-colors"
      >
        Apply filters
      </button>

      {resultCount !== null && (
        <p className="text-[11px] text-muted text-center">
          {resultCount.toLocaleString()} matching
        </p>
      )}
    </aside>
  );
}
