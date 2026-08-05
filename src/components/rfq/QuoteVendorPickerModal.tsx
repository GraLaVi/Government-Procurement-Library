"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  EXCLUDED_VENDOR_WARNING,
  partKey,
  type PartManufacturer,
  type PartManufacturersResponse,
  type PartSearchResult,
} from "@/lib/library/types";
import {
  MIN_SENDS_FOR_RESPONSIVENESS,
  rfqVendorKey,
  type RfqManufacturerSelection,
  type RfqVendor,
  type VendorResponsiveness,
} from "@/lib/rfq/types";

interface QuoteVendorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The part row the buyer clicked Quote on (from the solicitation parts list). */
  part: PartSearchResult;
  /** Hand the picked vendors to the compose modal. */
  onContinue: (selections: RfqManufacturerSelection[]) => void;
}

/**
 * Step between a solicitation part row and the RFQ compose modal: pick which
 * vendors to ask — the customer's private vendor book first, then the part's
 * manufacturers (approved sources flagged).
 *
 * Selection is PER ROW, not per CAGE: one company often lists several
 * near-identical internal part numbers for an item, each its own
 * manufacturer_parts row, and picking the correct one matters. Rows are keyed
 * by list index ("mfr:<i>" / "pv:<id>") so duplicate CAGEs never collide.
 *
 * SAM registration status is CONTEXT ONLY and never gates selection.
 */
export function QuoteVendorPickerModal({ isOpen, onClose, part, onContinue }: QuoteVendorPickerModalProps) {
  const [manufacturers, setManufacturers] = useState<PartManufacturer[]>([]);
  const [privateVendors, setPrivateVendors] = useState<RfqVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Row keys: "mfr:<index>" for manufacturer rows, "pv:<id>" for private vendors.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Responsiveness by vendor identity ("cage:X"/"vendor:N") — shown at the
  // moment the buyer chooses whom to ask; suppressed below the sends floor.
  const [stats, setStats] = useState<Record<string, VendorResponsiveness>>({});

  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set());
    setError(null);
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const [mRes, vRes] = await Promise.all([
          fetch(`/api/library/parts/${encodeURIComponent(partKey(part))}/manufacturers`),
          fetch("/api/rfq/vendors"),
        ]);
        if (cancelled) return;
        if (mRes.ok) {
          const data: PartManufacturersResponse = await mRes.json();
          // Approved sources first, then by CAGE, then by part number for a
          // stable order among a company's multiple listings.
          const sorted = [...data.manufacturers].sort((a, b) => {
            if (a.is_approved_source !== b.is_approved_source) return a.is_approved_source ? -1 : 1;
            const byCage = a.cage_code.localeCompare(b.cage_code);
            if (byCage !== 0) return byCage;
            return (a.part_number || "").localeCompare(b.part_number || "");
          });
          setManufacturers(sorted);
        } else {
          setManufacturers([]);
        }
        if (vRes.ok) {
          setPrivateVendors((await vRes.json()) as RfqVendor[]);
        } else {
          setPrivateVendors([]);
        }
        if (!mRes.ok && !vRes.ok) setError("Failed to load vendors.");
      } catch {
        if (!cancelled) setError("Network error loading vendors.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, part]);

  // Best-effort responsiveness fetch for the listed vendors, after they load.
  useEffect(() => {
    if (!isOpen || (manufacturers.length === 0 && privateVendors.length === 0)) return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (manufacturers.length) {
          params.set("cage_codes", [...new Set(manufacturers.map((m) => m.cage_code))].join(","));
        }
        if (privateVendors.length) params.set("rfq_vendor_ids", privateVendors.map((v) => v.id).join(","));
        const res = await fetch(`/api/rfq/vendor-stats?${params.toString()}`);
        if (!res.ok || cancelled) return;
        const rows: VendorResponsiveness[] = await res.json();
        setStats(Object.fromEntries(rows.map((r) => [rfqVendorKey(r), r])));
      } catch {
        /* badge is optional context — soft-fail */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, manufacturers, privateVendors]);

  const responsivenessBadge = (identityKey: string) => {
    const s = stats[identityKey];
    if (!s || s.rfqs_sent < MIN_SENDS_FOR_RESPONSIVENESS) return null;
    const label = `responded ${s.responded}/${s.rfqs_sent}${
      s.median_turnaround_days != null ? ` · ~${s.median_turnaround_days}d` : ""
    }`;
    const good = s.response_rate >= 0.5;
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
          good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}
        title={`Last ${s.months} months: ${s.responded} responded, ${s.declined} declined, ${s.unanswered} no answer${
          s.median_turnaround_days != null ? `. Median turnaround ${s.median_turnaround_days} days.` : "."
        }`}
      >
        {label}
      </span>
    );
  };

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selections = useMemo((): RfqManufacturerSelection[] => {
    const out: RfqManufacturerSelection[] = [];
    for (const v of privateVendors) {
      if (!selected.has(`pv:${v.id}`)) continue;
      out.push({
        cage_code: null,
        rfq_vendor_id: v.id,
        vendor_name: v.company_name,
        part_number: null,
        nsn: part.nsn || null,
        part_id: part.id,
        description: part.description,
      });
    }
    manufacturers.forEach((m, i) => {
      if (!selected.has(`mfr:${i}`)) return;
      out.push({
        cage_code: m.cage_code,
        vendor_name: m.vendor_name,
        part_number: m.part_number,
        nsn: part.nsn || null,
        part_id: part.id,
        description: part.description,
      });
    });
    return out;
  }, [manufacturers, privateVendors, selected, part]);

  // "SAM: <state>" chip. Active is the default and renders nothing. A CAGE
  // with no vendors row at all (no SAM registration data on file — common
  // for historical/defunct manufacturers in the DLA catalog) reads
  // "No SAM record" rather than the ambiguous "unknown".
  const samStatusChip = (m: PartManufacturer) => {
    if (m.sam_status === "A") return null;
    const label = m.sam_status ? `SAM: ${m.sam_status}` : "No SAM record";
    const explain = m.sam_status
      ? `SAM.gov registration status code ${m.sam_status} (not Active). You can still send an RFQ — confirm registration before award.`
      : "This CAGE has no SAM.gov registration on file — common for legacy or defunct manufacturers in the DLA catalog. You can still send an RFQ if you have a contact.";
    return (
      <span title={explain}>
        <Badge variant="default" size="sm">{label}</Badge>
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Request quotes — ${part.nsn || part.mfg_part_number || `part ${part.id}`}`}
      size="4xl"
    >
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        {part.description && <p className="text-sm text-muted">{part.description}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                My vendors ({privateVendors.length})
              </h3>
              {privateVendors.length === 0 ? (
                <p className="text-xs text-muted italic">
                  No private vendors yet — add them under Vendor RFQs → Private Vendors.
                </p>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {privateVendors.map((v) => {
                    const key = `pv:${v.id}`;
                    return (
                      <label key={key} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted-light/40">
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggle(key)}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="text-sm text-card-foreground">{v.company_name}</span>
                          {v.vendor_code && (
                            <span className="ml-2 text-xs font-mono text-muted">{v.vendor_code}</span>
                          )}
                          {/* The vendor-book note — buyers keep quoting
                              instructions here ("call before emailing",
                              "quotes Mil-spec only"), so it belongs at the
                              moment of choosing whom to ask. */}
                          {v.notes && (
                            <span className="block text-xs text-muted italic whitespace-pre-wrap mt-0.5">
                              {v.notes}
                            </span>
                          )}
                        </span>
                        {responsivenessBadge(`vendor:${v.id}`)}
                        <Badge variant="info" size="sm">Private</Badge>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Manufacturers ({manufacturers.length})
              </h3>
              <p className="text-xs text-muted mb-2">
                A company may appear once per part number — select the exact part
                number(s) you want quoted.
              </p>
              {manufacturers.length === 0 ? (
                <p className="text-xs text-muted italic">No manufacturers on file for this part.</p>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {manufacturers.map((m, i) => {
                    const key = `mfr:${i}`;
                    return (
                      <label key={key} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted-light/40">
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggle(key)}
                        />
                        <span className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm text-card-foreground">
                            {m.vendor_name || "Unknown vendor"}
                          </span>
                          <span className="text-xs font-mono text-muted">CAGE {m.cage_code}</span>
                          {m.part_number && (
                            <span className="text-xs font-mono font-semibold text-foreground">P/N {m.part_number}</span>
                          )}
                        </span>
                        {m.is_approved_source && (
                          <Badge variant="success" size="sm">Approved source</Badge>
                        )}
                        {responsivenessBadge(`cage:${m.cage_code}`)}
                        {/* An active exclusion (debarment/suspension) warns
                            LOUDLY but still doesn't block selection — the
                            no-gate rule is absolute; the buyer decides. */}
                        {m.is_excluded ? (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300"
                            title={EXCLUDED_VENDOR_WARNING}
                          >
                            ⚠ Excluded
                          </span>
                        ) : (
                          samStatusChip(m)
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-2.5 text-sm text-error">{error}</div>
            )}
          </>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted">
          {selected.size} selected — one RFQ per vendor; multiple part numbers for the same vendor become lines on one RFQ
        </span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={selected.size === 0}
            onClick={() => onContinue(selections)}
          >
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
