"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import {
  TableCard, rowClass, tableClass, tableHeadRowClass, tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";
import { BIDDING_PRODUCT_KEY } from "@/lib/bidding/access";
import { bidFetch, money } from "@/lib/bidding/api";
import { formatDateMmDdYyyy } from "@/lib/dates";
import {
  BID_STATUS_LABELS,
  BID_TABS,
  BID_TYPE_LABELS,
  bidReference,
  displayNsn,
  displaySolicitationNumber,
  type BidContributor,
  type BidCreateResponse,
  type BidPage,
  type BidSendResult,
  type BidSummary,
  type BidTab,
} from "@/lib/bidding/types";
import { FLASH_KEY } from "@/lib/bidding/flash";

const ALL = "all";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Decision 7: warn, never block — amber inside 48 hours, red once past. */
function closeDateClass(iso: string | null): string {
  if (!iso) return "text-muted";
  const close = new Date(`${iso}T23:59:59`).getTime();
  const now = Date.now();
  if (close < now) return "text-error font-semibold";
  if (close - now <= 2 * DAY_MS) return "text-amber-700 font-semibold";
  return "text-foreground";
}

/** Inline price / delivery edit for a single-line draft. Saves on blur or Enter. */
function QuickCell({
  value, kind, onSave, disabled,
}: {
  value: string | number | null;
  kind: "price" | "days";
  onSave: (v: string) => Promise<void>;
  disabled: boolean;
}) {
  const shown = value == null ? "" : String(value);
  // Uncontrolled, remounted when the stored value changes: the saved value
  // (or the server's normalisation of it) shows without syncing state.
  return (
    <input
      key={shown}
      type="number"
      inputMode="decimal"
      min={0}
      step={kind === "price" ? "0.00001" : "1"}
      defaultValue={shown}
      disabled={disabled}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v !== shown) onSave(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      aria-label={kind === "price" ? "Unit price" : "Delivery days"}
      className={`${kind === "price" ? "w-24" : "w-16"} px-1.5 py-0.5 rounded border border-border bg-card-bg text-right font-mono tabular-nums text-xs`}
    />
  );
}

export default function SendBidsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, hasProductAccess } = useAuth();
  const hasAccess = hasProductAccess(BIDDING_PRODUCT_KEY);

  const [tab, setTab] = useState<BidTab>("ready");
  const [page, setPage] = useState<BidPage | null>(null);
  const [contributors, setContributors] = useState<BidContributor[]>([]);
  const [filterUser, setFilterUser] = useState<string>(ALL);
  const [filterInitialized, setFilterInitialized] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [failures, setFailures] = useState<BidSendResult["failed"]>([]);

  // Like the RFQ batch cart: default to the current user's own drafts.
  useEffect(() => {
    if (!filterInitialized && user?.id) {
      setFilterUser(String(user.id));
      setFilterInitialized(true);
    }
  }, [user, filterInitialized]);

  // A note handed over by the bid editor's "Send later" (FLASH_KEY), shown
  // once on arrival.
  useEffect(() => {
    try {
      const flash = sessionStorage.getItem(FLASH_KEY);
      if (flash) {
        sessionStorage.removeItem(FLASH_KEY);
        setToast(flash);
      }
    } catch {
      // Storage blocked: the note is a nicety, the bid is already saved.
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    if (!filterInitialized) return;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ tab });
    if (filterUser !== ALL) qs.set("added_by_user_id", filterUser);
    try {
      const [p, c] = await Promise.all([
        bidFetch<BidPage>(`/api/bidding?${qs}`),
        bidFetch<BidContributor[]>("/api/bidding/contributors"),
      ]);
      setPage(p);
      setContributors(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab, filterUser, filterInitialized]);

  useEffect(() => {
    if (!authLoading && hasAccess) load();
  }, [authLoading, hasAccess, load]);

  const items = useMemo(() => page?.items ?? [], [page]);
  const sendable = useMemo(() => items.filter((b) => b.status === "draft" && b.error_count === 0), [items]);
  const allSelected = sendable.length > 0 && sendable.every((b) => selected.has(b.id));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const replaceRow = (row: BidSummary) =>
    setPage((p) => (p ? { ...p, items: p.items.map((b) => (b.id === row.id ? row : b)) } : p));

  const quickSave = async (bid: BidSummary, field: "unit_price" | "delivery_days", raw: string) => {
    const value = raw === "" ? null : field === "delivery_days" ? parseInt(raw, 10) : raw;
    try {
      await bidFetch(`/api/bidding/${bid.id}/quick`, { method: "PATCH", json: { [field]: value } });
      // Re-read the row: the bid type and the validation summary follow the edit.
      const qs = new URLSearchParams({ tab });
      if (filterUser !== ALL) qs.set("added_by_user_id", filterUser);
      const fresh = await bidFetch<BidPage>(`/api/bidding?${qs}`);
      const row = fresh.items.find((b) => b.id === bid.id);
      if (row) replaceRow(row);
      if (row && row.error_count > 0) {
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(bid.id);
          return next;
        });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const send = async (mode: "selected" | "all") => {
    setBusy(true);
    setError(null);
    setFailures([]);
    try {
      const result = await bidFetch<BidSendResult>("/api/bidding/send", {
        method: "POST",
        json:
          mode === "selected"
            ? { bid_ids: Array.from(selected) }
            : { send_all: true, added_by_user_id: filterUser !== ALL ? Number(filterUser) : null },
      });
      const n = result.queued.length;
      if (n > 0) {
        setToast(`Sent ${n} bid${n !== 1 ? "s" : ""}. ${n !== 1 ? "They are" : "It is"} queued for our upload to DIBBS.`);
      }
      setFailures(result.failed);
      setSelected(new Set());
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (bid: BidSummary, action: "withdraw" | "revise") => {
    setBusy(true);
    setError(null);
    try {
      if (action === "withdraw") {
        await bidFetch(`/api/bidding/${bid.id}/withdraw`, { method: "POST" });
        setToast(`${bidReference(bid)} withdrawn. Revise it to change and send it again.`);
        await load();
      } else {
        const data = await bidFetch<BidCreateResponse>(`/api/bidding/${bid.id}/revise`, { method: "POST" });
        router.push(`/bidmanager/${data.bid.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;

  if (!hasAccess) {
    return (
      <AccessDeniedPage
        featureName="Bid Manager"
        featureKey={BIDDING_PRODUCT_KEY}
        description="Submit quotes to DLA DIBBS from your priced solicitations."
        benefits={[
          "Send many quotes at once",
          "Bid type worked out for you, with the reasons",
          "Saved answers for every part you quote",
        ]}
      />
    );
  }

  const isReady = tab === "ready";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Send bids</h1>
        <p className="text-muted mt-1 text-sm max-w-3xl">
          Your team&apos;s DIBBS quotes. Sending a bid queues it for our upload to DIBBS; it reaches DLA
          when we upload it, and each bid shows what DIBBS made of it.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>
      )}
      {toast && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">{toast}</div>
      )}
      {failures.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm">
          <p className="font-medium text-foreground mb-1">
            {failures.length} bid{failures.length !== 1 ? "s were" : " was"} not sent:
          </p>
          <ul className="space-y-1 text-xs text-muted">
            {failures.map((f) => (
              <li key={f.id}>
                {f.reference_number ? (
                  <Link href={`/bidmanager/${f.id}`} className="text-primary hover:underline font-medium">
                    BID-{f.reference_number}
                  </Link>
                ) : (
                  `Bid ${f.id}`
                )}
                : {f.errors.slice(0, 3).join(" · ")}
                {f.errors.length > 3 && ` · and ${f.errors.length - 3} more`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Tabs
        tabs={BID_TABS.map((t) => ({ id: t.id, label: t.label, badge: page?.counts?.[t.id] || undefined }))}
        activeTab={tab}
        onTabChange={(id) => {
          setTab(id as BidTab);
          setSelected(new Set());
          setFailures([]);
        }}
      />

      <TableCard
        header={
          <>
            <label className="text-xs text-muted">Added by</label>
            <select
              className="px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-card-foreground text-sm"
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
                setSelected(new Set());
              }}
            >
              <option value={ALL}>Everyone</option>
              {user?.id && !contributors.some((c) => c.user_id === user.id) && (
                <option value={String(user.id)}>Me</option>
              )}
              {contributors.map((c) => (
                <option key={c.user_id} value={String(c.user_id)}>
                  {c.name} ({c.bid_count})
                </option>
              ))}
            </select>
            {isReady && (
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={busy || selected.size === 0} onClick={() => send("selected")}>
                  Send selected ({selected.size})
                </Button>
                <Button variant="primary" size="sm" disabled={busy || sendable.length === 0} onClick={() => send("all")}>
                  Send all ready
                </Button>
              </div>
            )}
          </>
        }
      >
        {loading ? (
          <div className="text-sm text-muted">Loading bids…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            {isReady ? (
              <>
                No draft bids. Start one from{" "}
                <Link href="/bidmatching" className="text-primary hover:underline">
                  Bid Worklist
                </Link>
                .
              </>
            ) : (
              "Nothing here."
            )}
          </div>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRowClass}>
                  {isReady && (
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() =>
                          setSelected(allSelected ? new Set() : new Set(sendable.map((b) => b.id)))
                        }
                        aria-label="Select every bid ready to send"
                      />
                    </th>
                  )}
                  <th className={thClass}>Bid</th>
                  <th className={thClass}>Solicitation</th>
                  <th className={thClass}>NSN / part</th>
                  <th className={`${thClass} text-right`}>Qty</th>
                  <th className={`${thClass} text-right`}>Unit price</th>
                  <th className={`${thClass} text-right`}>Days</th>
                  <th className={thClass}>Closes</th>
                  <th className={thClass}>Bid type</th>
                  <th className={thClass}>{isReady ? "Check" : "Status"}</th>
                  <th className={thClass}>Added by</th>
                  <th className="px-3 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => {
                  const blocked = b.error_count > 0;
                  return (
                    <tr key={b.id} className={rowClass}>
                      {isReady && (
                        <td className={tdClass}>
                          <input
                            type="checkbox"
                            checked={selected.has(b.id)}
                            disabled={blocked}
                            onChange={() => toggle(b.id)}
                            aria-label={`Select ${bidReference(b)}`}
                            title={blocked ? "Fix the errors before sending" : undefined}
                          />
                        </td>
                      )}
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <Link href={`/bidmanager/${b.id}`} className="text-primary hover:underline font-medium">
                          {bidReference(b)}
                        </Link>
                      </td>
                      <td className={`${tdClass} font-mono whitespace-nowrap`}>
                        {displaySolicitationNumber(b.solicitation_number)}
                      </td>
                      <td className={`${tdClass} font-mono whitespace-nowrap`}>
                        {displayNsn(b.nsn_part)}
                        {b.line_count > 1 && <span className="text-muted"> · {b.line_count} lines</span>}
                      </td>
                      <td className={`${tdClass} text-right font-mono tabular-nums`}>{b.quantity ?? "—"}</td>
                      <td className={`${tdClass} text-right font-mono tabular-nums whitespace-nowrap`}>
                        {b.can_quick_edit ? (
                          <QuickCell
                            value={b.unit_price}
                            kind="price"
                            disabled={busy}
                            onSave={(v) => quickSave(b, "unit_price", v)}
                          />
                        ) : (
                          money(b.unit_price)
                        )}
                        {b.rfq_price_changed && (
                          <div className="text-[11px] text-amber-700" title="The RFQ was repriced after this bid started. Open the bid to update it.">
                            RFQ repriced
                          </div>
                        )}
                      </td>
                      <td className={`${tdClass} text-right font-mono tabular-nums`}>
                        {b.can_quick_edit ? (
                          <QuickCell
                            value={b.delivery_days}
                            kind="days"
                            disabled={busy}
                            onSave={(v) => quickSave(b, "delivery_days", v)}
                          />
                        ) : (
                          b.delivery_days ?? "—"
                        )}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap ${closeDateClass(b.return_by_date)}`}>
                        {formatDateMmDdYyyy(b.return_by_date)}
                      </td>
                      <td className={tdClass} title={b.bid_type_code ? BID_TYPE_LABELS[b.bid_type_code] : undefined}>
                        {b.bid_type_code ?? "—"}
                      </td>
                      <td className={`${tdClass} max-w-[320px]`}>
                        {isReady ? (
                          blocked ? (
                            <Link href={`/bidmanager/${b.id}`} className="text-error hover:underline" title={b.first_error ?? undefined}>
                              {b.error_count} to fix
                              <span className="block text-[11px] text-muted truncate">{b.first_error}</span>
                            </Link>
                          ) : (
                            <span className="text-success">
                              Ready{b.warning_count > 0 && <span className="text-muted"> · {b.warning_count} to check</span>}
                            </span>
                          )
                        ) : (
                          <span>
                            {BID_STATUS_LABELS[b.status]}
                            {b.dibbs_reason && <span className="block text-[11px] text-muted">{b.dibbs_reason}</span>}
                          </span>
                        )}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-muted`}>{b.created_by_name ?? "—"}</td>
                      <td className={`${tdClass} text-right whitespace-nowrap`}>
                        {b.status === "queued" && (
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline disabled:opacity-50"
                            disabled={busy}
                            onClick={() => act(b, "withdraw")}
                          >
                            Withdraw
                          </button>
                        )}
                        {["withdrawn", "rejected", "submitted", "expired"].includes(b.status) && (
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline disabled:opacity-50"
                            disabled={busy}
                            onClick={() => act(b, "revise")}
                          >
                            Revise
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
