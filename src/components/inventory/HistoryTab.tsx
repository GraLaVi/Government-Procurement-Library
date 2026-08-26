"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RowBadge, type RowBadgeTone } from "@/components/library/RowBadge";
import {
  type InventoryUpload,
  type UploadStatus,
  UPLOAD_STATUS_LABELS,
} from "@/lib/inventory/types";

const STATUS_TONES: Record<UploadStatus, RowBadgeTone> = {
  uploaded: "neutral",
  validating: "neutral",
  awaiting_confirmation: "amber",
  processing: "sky",
  completed: "green",
  failed: "red",
  cancelled: "slate",
};

// The processing -> completed transition happens in the worker, so this tab
// polls while an upload is in flight. Three limits, because "in flight" is not
// guaranteed to end: a hard-killed worker leaves an upload in `processing`
// forever (nothing re-dispatches it, and cancel refuses that status), so an
// unbounded poll means a browser hitting the API every 8s until the tab
// closes.
//
//   1. Back off.   8s while a normal import is running, stretching to a minute.
//   2. Give up.    ~35 minutes of visible polling, then stop and offer a
//                  manual refresh — by then it is a support case, not a wait.
//   3. Stay quiet while hidden. A backgrounded tab re-arms its timer but
//      issues no request and burns no budget, so returning to it still has
//      polls left.
const POLL_STEPS_MS = [8000, 15000, 30000, 60000];
const MAX_POLL_ATTEMPTS = 60;

/** 8s for the first ~2 minutes, then progressively longer. */
function pollDelay(attempt: number): number {
  if (attempt < 15) return POLL_STEPS_MS[0];
  if (attempt < 25) return POLL_STEPS_MS[1];
  if (attempt < 35) return POLL_STEPS_MS[2];
  return POLL_STEPS_MS[3];
}

interface HistoryTabProps {
  isAdmin: boolean;
  /** Bumped by the page when a new upload is confirmed, to trigger a refetch. */
  refreshKey: number;
}

export function HistoryTab({ isAdmin, refreshKey }: HistoryTabProps) {
  const [uploads, setUploads] = useState<InventoryUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<InventoryUpload | null>(null);

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const res = await fetch("/api/inventory/uploads?limit=50");
      const data = await res.json();
      if (!res.ok) {
        if (!background) setError(data.error || "Failed to load upload history.");
        return;
      }
      setError(null);
      setUploads(data.uploads as InventoryUpload[]);
    } catch {
      if (!background) setError("Network error.");
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Identity of what we're waiting on, not just "is something in flight" — a
  // new upload starting must get a fresh budget even if a previous one was
  // given up on.
  const inFlightKey = useMemo(
    () =>
      uploads
        .filter((u) => u.status === "processing" || u.status === "validating")
        .map((u) => u.id)
        .sort((a, b) => a - b)
        .join(","),
    [uploads]
  );

  // Which set of uploads we stopped polling for. Derived rather than reset in
  // an effect, so a new in-flight set is automatically un-exhausted.
  const [exhaustedFor, setExhaustedFor] = useState<string | null>(null);
  const pollExhausted = inFlightKey !== "" && exhaustedFor === inFlightKey;
  const hasInFlight = inFlightKey !== "";

  useEffect(() => {
    if (!inFlightKey || pollExhausted) return;
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;

    const arm = (delay: number) => {
      timer = setTimeout(tick, delay);
    };

    const tick = async () => {
      if (cancelled) return;
      // Hidden tab: re-arm slowly, fetch nothing, spend no budget.
      if (document.visibilityState !== "visible") {
        arm(POLL_STEPS_MS[POLL_STEPS_MS.length - 1]);
        return;
      }
      if (attempt >= MAX_POLL_ATTEMPTS) {
        setExhaustedFor(inFlightKey);
        return;
      }
      attempt += 1;
      await load(true);
      if (!cancelled) arm(pollDelay(attempt));
    };

    arm(pollDelay(0));

    // Coming back to the tab is the moment the answer is most wanted.
    const onVisible = () => {
      if (document.visibilityState === "visible") load(true);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [inFlightKey, pollExhausted, load]);

  const act = useCallback(async (upload: InventoryUpload, action: "confirm" | "cancel" | "rollback") => {
    setBusyId(upload.id);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/uploads/${upload.id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to ${action} the upload.`);
        return;
      }
      load();
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
      setRollbackTarget(null);
    }
  }, [load]);

  const columns = useMemo<ColumnDef<InventoryUpload, unknown>[]>(() => [
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Uploaded",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted">
          {new Date(row.original.created_at).toLocaleString("en-US", {
            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      id: "original_filename",
      accessorKey: "original_filename",
      header: "File",
      cell: ({ row }) => (
        <span className="truncate max-w-[220px] block" title={row.original.original_filename ?? undefined}>
          {row.original.original_filename || "—"}
        </span>
      ),
    },
    {
      id: "mode",
      accessorKey: "mode",
      header: "Mode",
      cell: ({ row }) => (
        <span className="text-muted">{row.original.mode === "replace" ? "snapshot" : "changes"}</span>
      ),
      meta: { className: "hidden md:table-cell" },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <RowBadge
          tone={STATUS_TONES[row.original.status]}
          title={row.original.error_message ?? undefined}
        >
          {UPLOAD_STATUS_LABELS[row.original.status]}
        </RowBadge>
      ),
    },
    {
      id: "rows",
      header: "Rows",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <span className="text-xs text-muted whitespace-nowrap">
            {u.valid_rows.toLocaleString()} valid
            {u.rejected_rows > 0 && ` · ${u.rejected_rows.toLocaleString()} rejected`}
          </span>
        );
      },
    },
    {
      id: "results",
      header: "Import results",
      cell: ({ row }) => {
        const u = row.original;
        if (u.status !== "completed") return <span className="text-muted">—</span>;
        return (
          <span className="text-xs text-muted whitespace-nowrap">
            {u.matched_rows?.toLocaleString() ?? 0} matched
            {(u.unmatched_rows ?? 0) > 0 && ` · ${u.unmatched_rows?.toLocaleString()} unmatched`}
            {(u.ambiguous_rows ?? 0) > 0 && ` · ${u.ambiguous_rows?.toLocaleString()} ambiguous`}
            {(u.deactivated_rows ?? 0) > 0 && ` · ${u.deactivated_rows?.toLocaleString()} removed`}
          </span>
        );
      },
      meta: { className: "hidden lg:table-cell" },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        const busy = busyId === u.id;
        return (
          <span className="flex items-center gap-2 justify-end whitespace-nowrap">
            {(u.rejected_rows > 0 || u.status === "failed") && (
              <a href={`/api/inventory/uploads/${u.id}/errors`} className="text-xs text-primary hover:underline">
                Error report
              </a>
            )}
            {isAdmin && u.status === "awaiting_confirmation" && (
              <>
                <button className="text-xs text-primary hover:underline" disabled={busy} onClick={() => act(u, "confirm")}>
                  Confirm
                </button>
                <button className="text-xs text-muted hover:underline" disabled={busy} onClick={() => act(u, "cancel")}>
                  Cancel
                </button>
              </>
            )}
            {isAdmin && u.status === "completed" && (
              <button className="text-xs text-error hover:underline" disabled={busy} onClick={() => setRollbackTarget(u)}>
                Roll back
              </button>
            )}
          </span>
        );
      },
    },
  ], [isAdmin, busyId, act]);

  return (
    <div className="space-y-3">
      {hasInFlight && !pollExhausted && (
        <p className="text-xs text-muted flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          An import is running — results appear here and you&apos;ll get an email
          when it finishes.
        </p>
      )}
      {pollExhausted && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 space-y-1">
          <p className="text-xs text-foreground font-medium">
            This import is taking longer than usual.
          </p>
          <p className="text-xs text-muted">
            We&apos;ve stopped checking automatically. Your existing stock is
            unchanged. Refresh to check again, or contact support with the upload
            name if it stays like this.
          </p>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => {
              setExhaustedFor(null);
              load();
            }}
          >
            Check again
          </button>
        </div>
      )}
      {error && <p className="text-xs text-error">{error}</p>}
      <DataTable
        data={uploads}
        columns={columns}
        isLoading={loading}
        getRowId={(r) => String(r.id)}
        emptyMessage="No uploads yet."
      />
      <ConfirmDialog
        isOpen={rollbackTarget !== null}
        onClose={() => setRollbackTarget(null)}
        onConfirm={() => rollbackTarget && act(rollbackTarget, "rollback")}
        title="Roll back this upload"
        message="Lines this upload removed come back; lines it introduced are removed. Value changes to lines that already existed are not reverted — re-upload the prior snapshot to fully restore them."
        confirmLabel="Roll back"
        isLoading={busyId === rollbackTarget?.id}
      />
    </div>
  );
}
