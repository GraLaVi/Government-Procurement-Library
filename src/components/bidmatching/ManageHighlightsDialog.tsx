"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  HIGHLIGHT_PALETTE,
  MAX_HIGHLIGHT_LABELS,
  highlightHex,
  type HighlightColor,
  type HighlightLabel,
} from "@/lib/bidmatching/highlights";

/** A label as edited here: id is null until it is saved. */
export interface HighlightDraft {
  id: number | null;
  name: string;
  color: HighlightColor;
}

const SUGGESTED = ["Ready to bid", "Need vendor quote", "Check drawings", "Pass", "Follow up"];

/**
 * Name and color the account's highlights, up to five. The whole set saves at
 * once; a color removed here is cleared from every row that had it, which the
 * dialog says before it happens.
 */
export function ManageHighlightsDialog({
  labels,
  onClose,
  onSave,
}: {
  labels: HighlightLabel[];
  onClose: () => void;
  /** Resolves when saved; rejects with a message to show. */
  onSave: (drafts: HighlightDraft[]) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<HighlightDraft[]>(() =>
    labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const used = new Set(drafts.map((d) => d.color));
  const removed = labels.filter((l) => !drafts.some((d) => d.id === l.id));
  const update = (i: number, patch: Partial<HighlightDraft>) =>
    setDrafts((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const add = () => {
    const color = HIGHLIGHT_PALETTE.find((p) => !used.has(p.key))?.key;
    if (!color) return;
    const name = SUGGESTED.find((s) => !drafts.some((d) => d.name === s)) ?? "New highlight";
    setDrafts((prev) => [...prev, { id: null, name, color }]);
  };

  const save = async () => {
    if (drafts.some((d) => !d.name.trim())) {
      setError("Give every highlight a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(drafts.map((d) => ({ ...d, name: d.name.trim() })));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the colors. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Highlight colors" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Everyone on your account shares these colors and sees the rows marked with them.
        </p>

        {drafts.length === 0 && (
          <p className="text-sm text-muted italic">No colors yet. Add one to start marking rows.</p>
        )}

        <div className="space-y-3">
          {drafts.map((d, i) => (
            <div key={d.id ?? `new-${i}`} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full shrink-0" style={{ background: highlightHex(d.color) }} aria-hidden="true" />
                <input
                  id={`highlight-name-${d.id ?? `new-${i}`}`}
                  value={d.name}
                  maxLength={40}
                  onChange={(e) => update(i, { name: e.target.value })}
                  aria-label="Highlight name"
                  className="flex-1 min-w-0 rounded-md border border-border bg-card-bg text-foreground text-sm px-2 py-1 focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Delete ${d.name || "highlight"}`}
                  title="Delete"
                  className="text-muted hover:text-error px-1.5 text-base leading-none cursor-pointer"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-6">
                {HIGHLIGHT_PALETTE.map((p) => {
                  const taken = used.has(p.key) && d.color !== p.key;
                  const on = d.color === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      disabled={taken}
                      onClick={() => update(i, { color: p.key })}
                      aria-pressed={on}
                      aria-label={p.name}
                      title={taken ? `${p.name} (used by another highlight)` : p.name}
                      className={`w-5 h-5 rounded-full border-2 border-card-bg cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed ${
                        on ? "ring-2 ring-foreground" : "ring-1 ring-border"
                      }`}
                      style={{ background: p.hex }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {removed.length > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Saving clears {removed.map((l) => `"${l.name}"`).join(", ")} from every row marked with it.
          </p>
        )}
        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={add}
              disabled={drafts.length >= MAX_HIGHLIGHT_LABELS}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:border-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              + Add a color
            </button>
            <span className="text-xs text-muted tabular-nums">{drafts.length} of {MAX_HIGHLIGHT_LABELS}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:border-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
