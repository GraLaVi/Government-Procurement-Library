"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { RFQ_SENDER_KEYS } from "@/lib/rfq/tier";
import { RowBadge } from "@/components/library/RowBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  SortHeader, TableCard, rowClass, tableClass, tableHeadRowClass, tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";
import { WorkStatusSelect } from "@/components/rfq/WorkStatusSelect";
import {
  rfqStatusLabel,
  rfqStatusTone,
  type RfqListItem,
  type RfqContributor,
  type RfqWorkStatus,
} from "@/lib/rfq/types";
import { formatDateMmDdYyyy } from "@/lib/dates";

const ALL = "all";
const FILTER_KEY = "rfq_filter_user";

/** Columns the server can sort on. "" = the default newest-first ordering. */
type PipelineSortKey = "" | "vendor" | "updated_by" | "progress" | "bid_due" | "sent";

/**
 * Long text cell: caps the width and moves the full value to a hover tooltip.
 *
 * Vendor names and RFQ titles are both unbounded — a legal name like
 * "PRECISION AEROSPACE COMPONENTS MANUFACTURING, INCORPORATED" would otherwise
 * set the column width for every row on the page. Short values skip the
 * tooltip entirely so row hover stays quiet.
 */
const TOOLTIP_AT_CHARS = 28;

function Truncated({ value, className = "" }: { value: string; className?: string }) {
  if (value.length <= TOOLTIP_AT_CHARS) return <span className={className}>{value}</span>;
  return (
    <Tooltip content={value}>
      <span className={`block truncate ${className}`}>{value}</span>
    </Tooltip>
  );
}

export default function RfqPipelinePage() {
  const { isLoading: authLoading, hasAnyProductAccess, user } = useAuth();
  const [rfqs, setRfqs] = useState<RfqListItem[] | null>(null);
  const [contributors, setContributors] = useState<RfqContributor[]>([]);
  const [filterUser, setFilterUser] = useState<string>(ALL);
  const [filterInitialized, setFilterInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Sorting is server-side: the endpoint assembles progress, updated-by and
  // ready-to-bid from several tables, so it is the only place that can order
  // on them consistently.
  const [sortBy, setSortBy] = useState<PipelineSortKey>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Restore the last-used filter (defaulting to Everyone) before the first
  // fetch. Waiting for auth + doing this once means only one fetch fires, with
  // the resolved filter — no flicker where records flash then get replaced.
  useEffect(() => {
    if (filterInitialized || authLoading) return;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(FILTER_KEY) : null;
    setFilterUser(saved || ALL);
    setFilterInitialized(true);
  }, [authLoading, filterInitialized]);

  // Persist the filter so the choice sticks across reloads/navigation.
  useEffect(() => {
    if (!filterInitialized || typeof window === "undefined") return;
    window.localStorage.setItem(FILTER_KEY, filterUser);
  }, [filterUser, filterInitialized]);

  // First click picks the direction each column is actually useful in: the
  // soonest bid date and A-Z names, but the most recent activity first.
  const handleSort = (key: PipelineSortKey) => {
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "bid_due" || key === "vendor" || key === "updated_by" ? "asc" : "desc");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterUser !== ALL) params.set("created_by_user_id", filterUser);
      if (sortBy) {
        params.set("sort_by", sortBy);
        params.set("sort_dir", sortDir);
      }
      const qs = params.toString() ? `?${params}` : "";
      const [res, contribRes] = await Promise.all([
        fetch(`/api/rfq${qs}`),
        fetch("/api/rfq/contributors"),
      ]);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load RFQs.");
        setRfqs([]);
      } else {
        setRfqs(data as RfqListItem[]);
      }
      if (contribRes.ok) setContributors((await contribRes.json()) as RfqContributor[]);
    } catch {
      setError("Network error loading RFQs.");
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  }, [filterUser, sortBy, sortDir]);

  useEffect(() => {
    if (filterInitialized && hasAnyProductAccess(RFQ_SENDER_KEYS)) {
      load();
    }
  }, [filterInitialized, hasAnyProductAccess, load]);

  // Progress is stored per SOLICITATION, so a change moves every RFQ row that
  // came from the same one. Patch them all locally rather than refetching, and
  // revert the whole set together if the write fails.
  const handleProgressChange = useCallback(
    async (row: RfqListItem, next: RfqWorkStatus) => {
      const solId = row.source_solicitation_id;
      if (!solId) return;
      const previous = row.work_status;
      const apply = (value: RfqWorkStatus | null) =>
        setRfqs((prev) =>
          prev
            ? prev.map((r) =>
                r.source_solicitation_id === solId ? { ...r, work_status: value } : r,
              )
            : prev,
        );
      apply(next);
      try {
        const res = await fetch(`/api/rfq/worklist/${solId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ work_status: next }),
        });
        if (!res.ok) {
          apply(previous);
          setError("Could not update progress. Please try again.");
        }
      } catch {
        apply(previous);
        setError("Could not update progress. Please try again.");
      }
    },
    [],
  );

  if (authLoading) {
    return <div className="p-6 text-sm text-muted">Loading…</div>;
  }

  if (!hasAnyProductAccess(RFQ_SENDER_KEYS)) {
    return (
      <AccessDeniedPage
        featureName="Request for Quotes"
        featureKey="request_for_quote"
        description="Send structured RFQs to vendors directly from parts search and track every quote in one place."
        benefits={[
          "Send RFQs to vendors from the parts Manufacturers tab",
          "Collect structured quotes (unit price, lead time, alternates)",
          "Track sent, viewed, responded, and stale requests",
          "Keep a private vendor contact book",
        ]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">RFQ Pipeline</h1>
          <p className="text-muted mt-1 text-sm">
            Every RFQ your team has sent, where it stands, and whether it&apos;s priced and ready to bid.
          </p>
        </div>
        <div className="flex items-center gap-4 whitespace-nowrap">
          <Link href="/rfq/batch" className="text-xs text-primary hover:underline">
            View batch →
          </Link>
          <Link href="/rfq/settings" className="text-xs text-primary hover:underline">
            Settings
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
          <button onClick={load} className="ml-3 underline">Retry</button>
        </div>
      )}

      <TableCard
        header={
          <>
            <label className="text-xs text-muted">Created by</label>
            <select
              className="px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value={ALL}>Everyone</option>
              {contributors.map((c) => (
                <option key={c.user_id} value={String(c.user_id)}>
                  {c.name}{user?.id === c.user_id ? " (me)" : ""} ({c.rfq_count})
                </option>
              ))}
            </select>
          </>
        }
      >
      {loading ? (
        <div className="text-sm text-muted">Loading RFQs…</div>
      ) : rfqs && rfqs.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted">
            No RFQs yet. Open a part&apos;s <span className="font-medium">Manufacturers</span> tab, select vendors, and click <span className="font-medium">Create RFQ</span>.
          </p>
        </div>
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={thClass}>RFQ</th>
                <th className={thClass}>Solicitation</th>
                <SortHeader label="Vendor" sortKey="vendor" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader
                  label="Updated by" sortKey="updated_by" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
                  title="Who last moved the progress or edited the pricing"
                />
                <SortHeader label="RFQ progress" sortKey="progress" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className={thClass}>Responses</th>
                <SortHeader
                  label="Bid due" sortKey="bid_due" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
                  title="When the government's bid is due (solicitation close date)"
                />
                <th className={thClass} title="When the vendor's quote is due back to you">
                  Quote due
                </th>
                <SortHeader label="Sent" sortKey="sent" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {rfqs?.map((rfq) => (
                <tr key={rfq.id} className={rowClass}>
                  <td className={tdClass}>
                    <div className="flex items-center gap-1.5">
                      {/* The reference carries identity, the title carries
                          content. Two lines rather than one long string: the
                          reference is what a buyer says out loud and what they
                          scan for, and it stays a fixed width whatever the part
                          is called. */}
                      <div className="min-w-0">
                        <Link
                          href={`/rfq/${rfq.id}`}
                          className="text-primary hover:underline font-semibold data-field whitespace-nowrap"
                        >
                          RFQ-{rfq.reference_number}
                        </Link>
                        <div className="text-[11px] text-muted leading-tight">
                          <Truncated value={rfq.title} className="max-w-[16rem]" />
                        </div>
                      </div>
                      {/* Every quoted line that came back is priced — the
                          "is this ready to go" question, answered in the row. */}
                      {rfq.ready_to_bid && (
                        <Tooltip content="Every quoted line has a price to government">
                          <RowBadge tone="green">Ready</RowBadge>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  <td className={tdClass}>
                    {rfq.solicitation_number ? (
                      <Link
                        href={`/rfq/worklist?q=${encodeURIComponent(rfq.solicitation_number)}`}
                        className="font-mono text-primary hover:underline whitespace-nowrap"
                      >
                        {rfq.solicitation_number}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-foreground`}>
                    <Truncated
                      value={rfq.primary_vendor_name || rfq.primary_cage_code || "—"}
                      className="max-w-[12rem]"
                    />
                  </td>
                  <td className={`${tdClass} text-muted`}>
                    {rfq.updated_by_name || "—"}
                    {rfq.updated_at && (
                      <div className="text-[11px] text-muted/70 leading-tight">
                        {formatDateMmDdYyyy(rfq.updated_at)}
                      </div>
                    )}
                  </td>
                  <td className={tdClass}>
                    {/* Stored per solicitation, so this control moves every RFQ
                        sent for it. RFQs with no solicitation behind them have
                        nowhere to keep a status. */}
                    {rfq.source_solicitation_id ? (
                      <WorkStatusSelect
                        value={rfq.work_status}
                        sharedCount={rfq.shared_progress_rfq_count}
                        onChange={(next) => handleProgressChange(rfq, next)}
                      />
                    ) : (
                      <Tooltip content="Progress is tracked per solicitation. This RFQ was created outside the Send RFQs queue, so it has none.">
                        <span className="text-muted">—</span>
                      </Tooltip>
                    )}
                  </td>
                  <td className={tdClass}>
                    <RowBadge tone={rfqStatusTone(rfq.aggregate_status)}>
                      {rfqStatusLabel(rfq.aggregate_status)}
                    </RowBadge>
                    <span className="ml-1.5 text-muted">
                      {rfq.response_count}/{rfq.recipient_count}
                    </span>
                  </td>
                  <td className={`${tdClass} text-muted whitespace-nowrap`}>
                    {formatDateMmDdYyyy(rfq.bid_due_date)}
                  </td>
                  <td className={`${tdClass} text-muted whitespace-nowrap`}>
                    {formatDateMmDdYyyy(rfq.response_due_date)}
                  </td>
                  <td className={`${tdClass} text-muted whitespace-nowrap`}>
                    {formatDateMmDdYyyy(rfq.sent_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </TableCard>
    </div>
  );
}
