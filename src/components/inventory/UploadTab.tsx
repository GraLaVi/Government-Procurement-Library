"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { RowBadge } from "@/components/library/RowBadge";
import type { UploadMode, UploadPreview } from "@/lib/inventory/types";

interface UploadTabProps {
  isAdmin: boolean;
  /** Called after a confirmed upload is queued — the page switches to the
   *  history tab, where status/counters land when the import completes. */
  onImportQueued: () => void;
}

/** Upload wizard: file + mode → staged preview (mapping, sample, counts,
 *  shrink warning) → one confirm. Nothing touches the live catalog until
 *  Confirm; Cancel abandons the staged upload. */
export function UploadTab({ isAdmin, onImportQueued }: UploadTabProps) {
  const [mode, setMode] = useState<UploadMode>("replace");
  const [busy, setBusy] = useState<"upload" | "confirm" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startUpload = async (file: File) => {
    setBusy("upload");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/inventory/uploads?mode=${mode}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      const previewRes = await fetch(`/api/inventory/uploads/${data.id}/preview`);
      const previewData = await previewRes.json();
      if (!previewRes.ok) {
        setError(previewData.error || "Failed to load the upload preview.");
        return;
      }
      setPreview(previewData as UploadPreview);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy("confirm");
    setError(null);
    try {
      const res = await fetch(`/api/inventory/uploads/${preview.upload.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to confirm the upload.");
        return;
      }
      setPreview(null);
      onImportQueued();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!preview) return;
    setBusy("cancel");
    try {
      await fetch(`/api/inventory/uploads/${preview.upload.id}/cancel`, { method: "POST" });
    } catch {
      // Abandoned uploads are harmless either way — staging is purged.
    } finally {
      setPreview(null);
      setBusy(null);
    }
  };

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted py-6">
        Uploading inventory is restricted to account admins. Ask an admin to
        upload your stock file, or to make you an admin.
      </p>
    );
  }

  // ------------------------------------------------------------------
  // Step 2: the preview/confirm gate
  // ------------------------------------------------------------------
  if (preview) {
    const u = preview.upload;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground mr-2">
            Review {u.original_filename || "upload"}
          </h3>
          <RowBadge tone="neutral">{u.mode === "replace" ? "full snapshot" : "changes only"}</RowBadge>
          <RowBadge tone="green">{u.valid_rows.toLocaleString()} valid</RowBadge>
          {u.rejected_rows > 0 && <RowBadge tone="red">{u.rejected_rows.toLocaleString()} rejected</RowBadge>}
          {preview.warning_count > 0 && <RowBadge tone="amber">{preview.warning_count.toLocaleString()} warnings</RowBadge>}
        </div>

        {preview.shrink_warning && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-foreground">
              This snapshot removes {preview.would_deactivate?.toLocaleString()} of your
              current listings ({preview.shrink_pct}%).
            </p>
            <p className="text-xs text-muted mt-1">
              That&apos;s more than your configured threshold — the classic sign of a
              truncated export. If it looks wrong, cancel and check the file;
              removed lines are recoverable, but they disappear from the network
              immediately.
            </p>
          </div>
        )}

        {/* Column mapping */}
        <section>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Column mapping
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(preview.column_mapping).map(([header, field]) => (
              <RowBadge key={header} tone="neutral" title={`Your column "${header}" imports as ${field}`}>
                {header} → {field}
              </RowBadge>
            ))}
            {preview.unmapped_headers.map((header) => (
              <RowBadge key={header} tone="slate" title="This column was not recognized and will be ignored.">
                {header} → ignored
              </RowBadge>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-1.5">
            This mapping is saved for next time. If a column mapped wrong, rename
            its header (or use the template) and re-upload.
          </p>
        </section>

        {/* Sample rows with the enrichment echo */}
        <section>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Sample rows
          </h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted-light text-muted">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Row</th>
                  <th className="text-left px-2 py-1.5 font-medium">SKU</th>
                  <th className="text-left px-2 py-1.5 font-medium">NSN / part number</th>
                  <th className="text-right px-2 py-1.5 font-medium">Qty</th>
                  <th className="text-left px-2 py-1.5 font-medium">Status</th>
                  <th className="text-left px-2 py-1.5 font-medium">GPH knows it as</th>
                </tr>
              </thead>
              <tbody>
                {preview.sample_rows.map((row) => (
                  <tr key={row.row_number} className="border-t border-border/50">
                    <td className="px-2 py-1.5 text-muted">{row.row_number}</td>
                    <td className="px-2 py-1.5 font-mono">{String(row.normalized.customer_sku ?? "—")}</td>
                    <td className="px-2 py-1.5 font-mono">
                      {String(row.normalized.niin ?? row.normalized.part_number ?? "—")}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {row.normalized.quantity_on_hand != null
                        ? `${Number(row.normalized.quantity_on_hand).toLocaleString()} ${row.normalized.unit_of_measure ?? ""}`
                        : "—"}
                    </td>
                    <td className="px-2 py-1.5">
                      {row.is_valid ? (
                        row.error_message
                          ? <RowBadge tone="amber" title={row.error_message}>warning</RowBadge>
                          : <RowBadge tone="green">ok</RowBadge>
                      ) : (
                        <RowBadge tone="red" title={row.error_message ?? undefined}>
                          {row.error_code ?? "error"}
                        </RowBadge>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-muted max-w-[260px] truncate" title={row.enrichment?.description ?? undefined}>
                      {row.enrichment?.description ?? (row.is_valid ? "no match yet" : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {u.rejected_rows > 0 && (
            <p className="text-[11px] text-muted mt-1.5">
              Rejected rows are skipped by the import. Download the{" "}
              <a href={`/api/inventory/uploads/${u.id}/errors`} className="text-primary hover:underline">
                error report
              </a>{" "}
              to fix and re-upload them.
            </p>
          )}
        </section>

        {error && <p className="text-xs text-error">{error}</p>}
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={confirm} disabled={busy !== null}>
            {busy === "confirm" ? "Queueing import..." : `Confirm — import ${u.valid_rows.toLocaleString()} rows`}
          </Button>
          <Button size="sm" variant="outline" onClick={cancel} disabled={busy !== null}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Step 1: pick a file
  // ------------------------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="radio"
            name="upload-mode"
            className="accent-primary"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          Full snapshot
          <span className="text-xs text-muted">(file = complete current stock; missing lines are removed)</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="radio"
            name="upload-mode"
            className="accent-primary"
            checked={mode === "upsert"}
            onChange={() => setMode("upsert")}
          />
          Changes only
        </label>
      </div>

      <div
        className={`rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-primary bg-primary-light" : "border-border bg-card-bg"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) startUpload(file);
        }}
      >
        {busy === "upload" ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted">Parsing your file...</span>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground mb-1">
              Drop your inventory CSV here
            </p>
            <p className="text-xs text-muted mb-3">
              CSV only, up to 20 MB / 100,000 rows. Nothing imports until you
              review and confirm.
            </p>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) startUpload(file);
              }}
            />
          </>
        )}
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="text-xs text-muted space-y-1">
        <p>
          New here? Start from the{" "}
          <a href="/api/inventory/template" className="text-primary hover:underline">
            CSV template
          </a>{" "}
          — its columns map automatically. Your own headers work too: you&apos;ll
          see how they mapped before anything imports, and the mapping is
          remembered.
        </p>
        <p>
          Exporting from Excel? Format part-number and NSN columns as{" "}
          <span className="font-medium text-foreground">Text</span> first — Excel
          silently corrupts long part numbers and strips leading zeros.
        </p>
      </div>
    </div>
  );
}
