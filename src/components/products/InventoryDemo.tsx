"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { TableCard, filterSelectClass } from "@/components/rfq/TableCard";
import { RowBadge, type RowBadgeTone } from "@/components/library/RowBadge";
import { InventoryPanel } from "@/components/library/InventoryPanel";
import { inventoryItemColumns } from "@/components/inventory/ItemsTab";
import { StockCoverageGlyph } from "@/components/inventory/StockCoverageGlyph";
import { DemoSurface } from "@/components/products/DemoSurface";
import {
  UPLOAD_STATUS_LABELS,
  type InventoryUpload,
  type UploadStatus,
} from "@/lib/inventory/types";
import type { DemoInventoryData } from "@/lib/demo/inventory";

/**
 * The Supplier Stock mock-up on /products/supplier-stock.
 *
 * Four screens, in the order a supplier meets them: the review gate a fresh
 * CSV lands on, the Items list, the upload history, and the payoff — the
 * Supplier Stock tab on a part record, where their own lines sit above what
 * the rest of the network has shared. The part tab, the items columns and
 * the network table are the app's own components; the review screen and the
 * history table are composed from the same cells the app's tabs render,
 * since those tabs fetch on mount and cannot be handed a fixture.
 */

type TabId = "part" | "upload" | "items" | "history";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "part", label: "On a part record" },
  { id: "upload", label: "Upload" },
  { id: "items", label: "Items" },
  { id: "history", label: "Upload history" },
];

interface Tour {
  id: string;
  chip: string;
  caption: string;
  tab: TabId;
}

const TOURS: Tour[] = [
  {
    id: "part",
    chip: "Your stock on a part",
    caption:
      "Open any part you research and the Supplier Stock tab shows what you have on the shelf for it — every line, every warehouse, with the count date. Below it, what other suppliers have shared: an anonymous label, a quantity or a band, and only the fields each one chose to expose.",
    tab: "part",
  },
  {
    id: "review",
    chip: "Review before import",
    caption:
      "Drop your ERP export and nothing imports yet. You see how your columns mapped, a sample of parsed rows with what GPH already knows about each part, the valid and rejected counts, and a warning if the file looks truncated. Then you confirm.",
    tab: "upload",
  },
  {
    id: "items",
    chip: "What's live",
    caption:
      "Every line, how it matched the catalog, and its as-of date. Unmatched lines stay visible to you and are re-checked as the parts database grows; a line older than your stale threshold is flagged, and one past the hide threshold is withdrawn from the network until you refresh it.",
    tab: "items",
  },
  {
    id: "history",
    chip: "Every upload, undoable",
    caption:
      "Each upload records what it matched, what it could not, and what it removed — and can be rolled back. A snapshot that would drop half your catalog is stopped at review, which is what the cancelled July file was.",
    tab: "history",
  },
];

const STATUS_TONES: Record<UploadStatus, RowBadgeTone> = {
  uploaded: "neutral",
  validating: "neutral",
  awaiting_confirmation: "amber",
  processing: "sky",
  completed: "green",
  failed: "red",
  cancelled: "slate",
};

const noop = () => undefined;

export function InventoryDemo({ data }: { data: DemoInventoryData }) {
  const [activeTab, setActiveTab] = useState<TabId>("part");
  const [activeTour, setActiveTour] = useState<string | null>(TOURS[0].id);
  const [matchFilter, setMatchFilter] = useState("");
  const [queued, setQueued] = useState(false);

  const itemColumns = useMemo(() => inventoryItemColumns({ isAdmin: false, onEdit: noop, onDelete: noop }), []);
  const items = useMemo(
    () => (matchFilter ? data.items.filter((i) => (matchFilter === "matched" ? i.match_status.startsWith("matched") : i.match_status === matchFilter)) : data.items),
    [data.items, matchFilter],
  );

  const historyColumns = useMemo<ColumnDef<InventoryUpload, unknown>[]>(() => [
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Uploaded",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted">
          {new Date(row.original.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
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
      cell: ({ row }) => <span className="text-muted">{row.original.mode === "replace" ? "snapshot" : "changes"}</span>,
      meta: { className: "hidden md:table-cell" },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <RowBadge tone={STATUS_TONES[row.original.status]} title={row.original.error_message ?? undefined}>
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
  ], []);

  const applyTour = (t: Tour) => { setActiveTour(t.id); setActiveTab(t.tab); };
  const onTab = (id: TabId) => { setActiveTour(null); setActiveTab(id); };

  const preview = data.preview;
  const u = preview.upload;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Show me</span>
        {TOURS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => applyTour(t)}
            aria-pressed={activeTour === t.id}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTour === t.id
                ? "border-primary bg-primary text-white"
                : "border-border bg-card-bg text-foreground hover:border-primary/40 hover:text-primary"
            }`}
          >
            {t.chip}
          </button>
        ))}
      </div>

      {activeTour && (
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          {TOURS.find((t) => t.id === activeTour)?.caption}
        </p>
      )}

      <DemoSurface prompt="Uploading your inventory is free on every plan.">
        <div className="rounded-xl border border-border bg-muted-light/40 p-3 dark:bg-background/40 sm:p-4 lg:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-foreground">Supplier Stock</h3>
              <p className="text-sm text-muted mt-1 max-w-2xl">
                Upload your stock so it appears on the parts your team researches — and, if you choose to share it, on the parts every GPH subscriber researches.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-card-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Sample data
            </span>
          </div>

          <div className="border-b border-border mb-6">
            <div className="flex gap-1 -mb-px overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTab(t.id)}
                  className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "part" && (
            <div className="rounded-lg border border-border bg-card-bg">
              <div className="border-b border-border px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-lg font-bold text-foreground">4820-01-317-9684</span>
                  <StockCoverageGlyph stocked={1} quotable={1} entries={[{ key: 1, identity: "4820-01-317-9684", summary: data.myStockSummary }]} />
                </div>
                <div className="text-sm text-muted">VALVE,CHECK,OXYGEN SYSTEM</div>
              </div>
              <div className="px-4 pt-3">
                <Tabs
                  tabs={[
                    { id: "overview", label: "Overview", disabled: true },
                    { id: "manufacturers", label: "Manufacturers (9)", disabled: true },
                    { id: "inventory", label: `Supplier Stock (${data.partInventory.my_stock.length + (data.partInventory.network_stock?.length ?? 0)})` },
                  ]}
                  activeTab="inventory"
                  onTabChange={noop}
                />
              </div>
              <div className="p-3">
                <InventoryPanel inventory={data.partInventory} isLoading={false} error={null} onRetry={noop} />
              </div>
              <p className="border-t border-border px-4 py-2 text-[11px] text-muted">
                The other tabs of this record are on the Parts &amp; Vendor Library page; the green cube beside the NSN is how the same stock shows up in the Send RFQs queue.
              </p>
            </div>
          )}

          {activeTab === "upload" && (
            queued ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
                  Import queued — {u.valid_rows.toLocaleString()} rows. Results land in Upload history and you get an email when it finishes.
                </div>
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => setQueued(false)}>
                  Show the review screen again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground mr-2">Review {u.original_filename || "upload"}</h4>
                  <RowBadge tone="neutral">{u.mode === "replace" ? "full snapshot" : "changes only"}</RowBadge>
                  <RowBadge tone="green">{u.valid_rows.toLocaleString()} valid</RowBadge>
                  {u.rejected_rows > 0 && <RowBadge tone="red">{u.rejected_rows.toLocaleString()} rejected</RowBadge>}
                  {preview.warning_count > 0 && <RowBadge tone="amber">{preview.warning_count.toLocaleString()} warnings</RowBadge>}
                </div>

                <section>
                  <h5 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Column mapping</h5>
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
                    This mapping is saved for next time. If a column mapped wrong, rename its header (or use the template) and re-upload.
                  </p>
                </section>

                <section>
                  <h5 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Sample rows</h5>
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
                            <td className="px-2 py-1.5 font-mono">{String(row.normalized.niin ?? row.normalized.part_number ?? "—")}</td>
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
                                <RowBadge tone="red" title={row.error_message ?? undefined}>{row.error_code ?? "error"}</RowBadge>
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
                  <p className="text-[11px] text-muted mt-1.5">
                    Hover a warning or an error for the reason. Rejected rows are skipped by the import; the error report lists them with your original columns so you can fix and re-upload.
                  </p>
                </section>

                <div className="flex items-center gap-3">
                  <Button size="sm" onClick={() => { setActiveTour(null); setQueued(true); }}>
                    Confirm — import {u.valid_rows.toLocaleString()} rows
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setActiveTour(null)}>Cancel</Button>
                </div>
              </div>
            )
          )}

          {activeTab === "items" && (
            <TableCard
              header={
                <>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-muted whitespace-nowrap">
                    Match state
                    <select className={filterSelectClass} value={matchFilter} onChange={(e) => { setActiveTour(null); setMatchFilter(e.target.value); }}>
                      <option value="">All</option>
                      <option value="matched">Matched</option>
                      <option value="unmatched">Not matched</option>
                    </select>
                  </label>
                  <span className="ml-auto text-xs text-muted">{items.length.toLocaleString()} line{items.length !== 1 ? "s" : ""}</span>
                </>
              }
            >
              <DataTable data={items} columns={itemColumns} getRowId={(r) => String(r.id)} emptyMessage="No lines match that filter." />
            </TableCard>
          )}

          {activeTab === "history" && (
            <TableCard>
              <DataTable data={data.uploads} columns={historyColumns} getRowId={(r) => String(r.id)} emptyMessage="No uploads yet." />
              <p className="mt-3 text-[11px] text-muted">
                In the app each completed upload carries a Roll back action, and each one with rejected rows an error report. Both are admin-only.
              </p>
            </TableCard>
          )}
        </div>
      </DemoSurface>

      <p className="text-xs text-muted">
        The parts are real catalog items. Every quantity, price, warehouse,
        upload and network listing belongs to fictional suppliers — inventory
        is the most private data a supplier has, so none of it can be borrowed.
      </p>
    </div>
  );
}
