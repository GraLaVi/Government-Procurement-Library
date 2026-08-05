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
  /** The part row the buyer clicked Quote on (from the solicitation parts modal). */
  part: PartSearchResult;
  /** Hand the picked vendors to the compose modal. */
  onContinue: (selections: RfqManufacturerSelection[]) => void;
}

/**
 * Step between a solicitation part row and the RFQ compose modal: pick which
 * vendors to ask — the part's manufacturers (approved sources flagged) plus
 * the customer's private vendor book.
 *
 * SAM registration status is shown as CONTEXT ONLY and never gates
 * selection: buyers routinely quote vendors whose registration is lapsed and
 * will be renewed before award.
 */
export function QuoteVendorPickerModal({ isOpen, onClose, part, onContinue }: QuoteVendorPickerModalProps) {
  const [manufacturers, setManufacturers] = useState<PartManufacturer[]>([]);
  const [privateVendors, setPrivateVendors] = useState<RfqVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Selection keys: "cage:<CAGE>" / "vendor:<id>".
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Responsiveness by vendor key — "responded 4/5 · ~2d" at the moment the
  // buyer chooses whom to ask. Suppressed below the minimum-sends floor.
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
          // Approved sources first, then by CAGE — but everything selectable.
          const sorted = [...data.manufacturers].sort((a, b) => {
            if (a.is_approved_source !== b.is_approved_source) return a.is_approved_source ? -1 : 1;
            return a.cage_code.localeCompare(b.cage_code);
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
        if (manufacturers.length) params.set("cage_codes", manufacturers.map((m) => m.cage_code).join(","));
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

  const responsivenessBadge = (key: string) => {
    const s = stats[key];
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
    for (const m of manufacturers) {
      if (!selected.has(`cage:${m.cage_code}`)) continue;
      out.push({
        cage_code: m.cage_code,
        vendor_name: m.vendor_name,
        part_number: m.part_number,
        nsn: part.nsn || null,
        part_id: part.id,
        description: part.description,
      });
    }
    for (const v of privateVendors) {
      if (!selected.has(`vendor:${v.id}`)) continue;
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
    return out;
  }, [manufacturers, privateVendors, selected, part]);

  const samStatusLabel = (m: PartManufacturer): string | null => {
    if (m.sam_status === "A") return null; // Active is the default; no chip noise.
    if (!m.sam_status) return "SAM: unknown";
    return `SAM: ${m.sam_status}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Request quotes — ${part.nsn || part.mfg_part_number || `part ${part.id}`}`}
      size="lg"
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
                Manufacturers ({manufacturers.length})
              </h3>
              {manufacturers.length === 0 ? (
                <p className="text-xs text-muted italic">No manufacturers on file for this part.</p>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {manufacturers.map((m) => {
                    const key = `cage:${m.cage_code}`;
                    const sam = samStatusLabel(m);
                    return (
                      <label key={key} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted-light/40">
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggle(key)}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="text-sm text-card-foreground">
                            {m.vendor_name || "Unknown vendor"}
                          </span>
                          <span className="ml-2 text-xs font-mono text-muted">CAGE {m.cage_code}</span>
                          {m.part_number && (
                            <span className="ml-2 text-xs font-mono text-muted">P/N {m.part_number}</span>
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
                          /* Lapsed/unknown registration is mild context only. */
                          sam && <Badge variant="default" size="sm">{sam}</Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

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
                    const key = `vendor:${v.id}`;
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
                        </span>
                        {responsivenessBadge(`vendor:${v.id}`)}
                        <Badge variant="info" size="sm">Private</Badge>
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
          {selected.size} vendor{selected.size !== 1 ? "s" : ""} selected — one RFQ is sent per vendor
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
