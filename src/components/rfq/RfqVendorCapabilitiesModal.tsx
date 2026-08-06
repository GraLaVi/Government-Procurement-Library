"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCodeDefinitions } from "@/lib/hooks/useCodeDefinitions";
import type { RfqVendor, RfqVendorCapabilities } from "@/lib/rfq/types";

interface RfqVendorCapabilitiesModalProps {
  isOpen: boolean;
  vendor: RfqVendor | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/**
 * Editor for a vendor's matching capabilities — the data behind "Suggested
 * from my vendors" in the quote picker. List inputs accept comma- or
 * newline-separated paste (the book is thousands of vendors; bulk entry is
 * the normal case, not the exception). The API normalizes values and
 * rejects bad ones with the offending entry named.
 */
const LIST_FIELDS = [
  {
    key: "cages" as const,
    label: "CAGE codes represented",
    hint: "Manufacturers this vendor makes, distributes, or resells for — one 5-character CAGE per line (or comma-separated). Matched against a part's known sources. Not the vendor's own identifier.",
    placeholder: "73808\n0B9R5",
  },
  {
    key: "niins" as const,
    label: "NSNs / NIINs supplied",
    hint: "Exact catalog coverage. Full NSNs or 9-digit NIINs, dashes optional.",
    placeholder: "5325-00-929-4147\n012345678",
  },
  {
    key: "fscs" as const,
    label: "Supply classes (FSC / FSG)",
    hint: "4-digit Federal Supply Classes, or 2-digit groups to cover the whole group.",
    placeholder: "5325\n53",
  },
  {
    key: "keywords" as const,
    label: "Keywords",
    hint: "Matched against part descriptions when nothing stronger hits — e.g. o-ring, hydraulic hose.",
    placeholder: "o-ring\ngasket",
  },
];

function parseList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function joinList(values: string[]): string {
  return values.join("\n");
}

export function RfqVendorCapabilitiesModal({
  isOpen, vendor, onClose, onSaved,
}: RfqVendorCapabilitiesModalProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { codes: setAsideCodes } = useCodeDefinitions("SET_ASIDE");
  // UNA means "unrestricted" — not a status a vendor can hold.
  const statusOptions = useMemo(
    () => setAsideCodes.filter((c) => c.code !== "UNA"),
    [setAsideCodes],
  );

  useEffect(() => {
    if (!isOpen || !vendor) return;
    setLoading(true);
    setError(null);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/rfq/vendors/${vendor.id}/capabilities`);
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error || "Failed to load capabilities.");
          return;
        }
        const caps = body as RfqVendorCapabilities;
        setDrafts({
          cages: joinList(caps.cages),
          niins: joinList(caps.niins),
          fscs: joinList(caps.fscs),
          keywords: joinList(caps.keywords),
        });
        setStatuses(new Set(caps.statuses));
      } catch {
        if (!cancelled) setError("Network error loading capabilities.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, vendor]);

  const save = async () => {
    if (!vendor) return;
    setSaving(true);
    setError(null);
    try {
      const payload: RfqVendorCapabilities = {
        cages: parseList(drafts.cages || ""),
        niins: parseList(drafts.niins || ""),
        fscs: parseList(drafts.fscs || ""),
        keywords: parseList(drafts.keywords || ""),
        statuses: [...statuses],
      };
      const res = await fetch(`/api/rfq/vendors/${vendor.id}/capabilities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The API names the offending value; detail may be a string or a
        // structured {error, invalid_codes} object.
        const detail = body.error || body.detail;
        setError(
          typeof detail === "string"
            ? detail
            : detail?.invalid_codes
            ? `${detail.error}: ${detail.invalid_codes.join(", ")}`
            : "Failed to save capabilities.",
        );
        return;
      }
      onSaved("Capabilities saved.");
    } catch {
      setError("Network error saving capabilities.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={vendor ? `Capabilities — ${vendor.company_name}` : "Capabilities"}
      size="2xl"
    >
      <p className="text-xs text-muted mb-4">
        What this vendor can supply. Drives the &quot;Suggested from my
        vendors&quot; list when sending RFQs — a vendor with no capability
        data only appears via search or past quoting history.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {LIST_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-foreground mb-0.5">{f.label}</label>
              <p className="text-[11px] text-muted mb-1">{f.hint}</p>
              <textarea
                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 min-h-[64px] resize-y"
                placeholder={f.placeholder}
                value={drafts[f.key] || ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-foreground mb-0.5">Socioeconomic statuses</label>
            <p className="text-[11px] text-muted mb-1.5">
              Used to flag set-aside compatibility on restricted solicitations. A
              warning only — never blocks sending an RFQ.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {statusOptions.map((c) => (
                <label key={c.code} className="flex items-center gap-2 text-sm text-card-foreground cursor-pointer" title={c.description || undefined}>
                  <input
                    type="checkbox"
                    checked={statuses.has(c.code)}
                    onChange={(e) =>
                      setStatuses((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(c.code);
                        else next.delete(c.code);
                        return next;
                      })
                    }
                  />
                  <span>{c.label}</span>
                  <span className="text-[11px] font-mono text-muted">{c.code}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-2.5 text-sm text-error">{error}</div>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save capabilities"}
        </Button>
      </div>
    </Modal>
  );
}
