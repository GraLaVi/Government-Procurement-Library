"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  rowClass, tableClass, tableHeadRowClass, tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";
import { BIDDING_PRODUCT_KEY } from "@/lib/bidding/access";
import { bidFetch, money } from "@/lib/bidding/api";
import { formatDateMmDdYyyy } from "@/lib/dates";
import {
  AFFIRMATIVE_ACTION_OPTIONS,
  ALTERNATE_DISPUTES_OPTIONS,
  BID_STATUS_LABELS,
  BOA_FSS_BPA_OPTIONS,
  CHILD_LABOR_OPTIONS,
  END_PRODUCT_OPTIONS,
  HAZARD_LABEL_OPTIONS,
  HAZMAT_OPTIONS,
  HLQ_CODE_OPTIONS,
  HUBZONE_WAIVER_OPTIONS,
  JOINT_VENTURE_OPTIONS,
  MANUFACTURER_DEALER_OPTIONS,
  MATERIAL_OPTIONS,
  MEETS_PACKAGING_OPTIONS,
  NO_DO_MINIMUM_OPTIONS,
  PART_OFFERED_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  POINT_OPTIONS,
  PREVIOUS_CONTRACTS_OPTIONS,
  SET_ASIDE_OPTIONS,
  SMALL_BUSINESS_REP_OPTIONS,
  SOLICITATION_TYPE_OPTIONS,
  SUPPLIES_OFFERED_OPTIONS,
  YES_NO_OPTIONS,
  bidReference,
  displayNsn,
  displaySolicitationNumber,
  type BidCreateResponse,
  type BidDetail,
  type BidIssue,
  type BidLine,
  type BidPreview,
  type BidProduct,
  type BidSendResult,
  type CodeOption,
} from "@/lib/bidding/types";

type Value = string | number | boolean | null;

const NOT_SET = { value: "", label: "Not set" };
const fmt = (n: number) => String(n).padStart(3, "0");

// --- Small building blocks ---------------------------------------------------

function Section({ title, description, children, right }: {
  title: string; description?: string; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <section className="bg-card-bg rounded-xl border border-border p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-secondary">{title}</h2>
          {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function IssueText({ issues }: { issues: BidIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {issues.map((i, n) => (
        <p key={n} className={`text-[11px] ${i.severity === "error" ? "text-error" : "text-amber-700"}`}>
          {i.message}
        </p>
      ))}
    </div>
  );
}

interface FieldProps {
  label: string;
  field?: number;
  hint?: React.ReactNode;
  issues?: BidIssue[];
  children: React.ReactNode;
}

function Field({ label, field, hint, issues = [], children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-card-foreground mb-1">
        {label}
        {field != null && <span className="text-muted font-normal"> ({fmt(field)})</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
      <IssueText issues={issues} />
    </div>
  );
}

const inputClass =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-card-bg text-sm disabled:bg-muted-light disabled:text-muted";

function SelectInput({ value, options, onSave, disabled }: {
  value: Value; options: CodeOption[]; onSave: (v: string | null) => void; disabled: boolean;
}) {
  return (
    <select
      className={inputClass}
      value={value == null ? "" : String(value)}
      disabled={disabled}
      onChange={(e) => onSave(e.target.value || null)}
    >
      {[NOT_SET, ...options].map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/** Text or number input that saves on blur (and on Enter). Remounts when the
 *  stored value changes, so a server-side normalisation shows straight away. */
function TextInput({ value, onSave, disabled, type = "text", maxLength, upper, placeholder, step }: {
  value: Value; onSave: (v: string | null) => void; disabled: boolean; type?: "text" | "number" | "date";
  maxLength?: number; upper?: boolean; placeholder?: string; step?: string;
}) {
  const shown = value == null ? "" : String(value);
  return (
    <input
      key={shown}
      className={`${inputClass} ${type === "number" ? "text-right font-mono tabular-nums" : ""}`}
      type={type}
      defaultValue={shown}
      maxLength={maxLength}
      placeholder={placeholder}
      step={step}
      min={type === "number" ? 0 : undefined}
      disabled={disabled}
      onBlur={(e) => {
        let v = e.target.value.trim();
        if (upper) v = v.toUpperCase();
        if (v !== shown) onSave(v === "" ? null : v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function ReadOnly({ value }: { value: React.ReactNode }) {
  return <p className="text-sm text-foreground py-1.5">{value ?? "—"}</p>;
}

// Field-number groups for the product block (plan 1.3), mirroring the
// applicability rules in src/bidding/quote.py.
const applies = {
  hubzoneWaiver: (h: BidDetail["header"]) =>
    h.hubzone_preference === "Y" && ["B", "M"].includes(String(h.small_business_rep ?? "")),
  jointVenture: (h: BidDetail["header"]) =>
    !!h.set_aside_indicator && h.set_aside_indicator !== "N" && ["B", "M"].includes(String(h.small_business_rep ?? "")),
  partOffered: (p: BidProduct["values"]) => ["P", "B", "N"].includes(String(p.item_description_ind ?? "")),
  suppliesOffered: (p: BidProduct["values"]) => ["D", "B", "Q"].includes(String(p.item_description_ind ?? "")),
  qpl: (p: BidProduct["values"]) => p.item_description_ind === "Q",
  quality: (p: BidProduct["values"]) => !!p.higher_level_quality_ind && p.higher_level_quality_ind !== "N",
  origin: (p: BidProduct["values"]) => ["NQ", "O", "ND", "US"].includes(String(p.end_product_code ?? "")),
  qualifyingCountry: (p: BidProduct["values"]) =>
    !!p.end_product_code && !["D", "NQ", "O", "ND", "US"].includes(String(p.end_product_code)),
  dutyFree: (p: BidProduct["values"]) => p.buy_american_ind !== "I",
  dealer: (p: BidProduct["values"]) => ["DD", "QD"].includes(String(p.manufacturer_dealer ?? "")),
};

// --- The page ----------------------------------------------------------------

export default function BidEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bidId = params?.id;
  const { isLoading: authLoading, hasProductAccess } = useAuth();
  const hasAccess = hasProductAccess(BIDDING_PRODUCT_KEY);

  const [bid, setBid] = useState<BidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState<BidPreview | null>(null);
  const [confirm, setConfirm] = useState<"delete" | "withdraw" | null>(null);
  const [showReps, setShowReps] = useState(false);

  const load = useCallback(async () => {
    if (!bidId) return;
    setLoading(true);
    setError(null);
    try {
      setBid(await bidFetch<BidDetail>(`/api/bidding/${bidId}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [bidId]);

  useEffect(() => {
    if (!authLoading && hasAccess) load();
  }, [authLoading, hasAccess, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const save = async (url: string, body: Record<string, unknown>, method = "PATCH") => {
    setSaving(true);
    setError(null);
    setPreview(null);
    try {
      setBid(await bidFetch<BidDetail>(url, { method, json: body }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const saveHeader = (field: string, value: Value) => save(`/api/bidding/${bidId}`, { [field]: value });
  const saveLine = (line: BidLine, field: string, value: Value) =>
    save(`/api/bidding/${bidId}/lines/${line.id}`, { [field]: value }, "PUT");
  const saveProduct = (product: BidProduct, body: Record<string, unknown>) =>
    save(`/api/bidding/${bidId}/products/${product.id}`, body, "PUT");

  const send = async () => {
    if (!bid) return;
    setSaving(true);
    setError(null);
    try {
      const result = await bidFetch<BidSendResult>("/api/bidding/send", { method: "POST", json: { bid_ids: [bid.id] } });
      if (result.queued.includes(bid.id)) {
        setToast(`${bidReference(bid)} sent. It is queued for our upload to DIBBS.`);
        await load();
      } else {
        setError(result.failed[0]?.errors.join(" · ") ?? "The bid was not sent.");
        await load();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const lifecycle = async (action: "delete" | "withdraw" | "revise") => {
    if (!bid) return;
    setSaving(true);
    setError(null);
    try {
      if (action === "delete") {
        await bidFetch(`/api/bidding/${bid.id}`, { method: "DELETE" });
        router.push("/bidding");
        return;
      }
      if (action === "withdraw") {
        setBid(await bidFetch<BidDetail>(`/api/bidding/${bid.id}/withdraw`, { method: "POST" }));
        setToast(`${bidReference(bid)} withdrawn. Revise it to change it and send it again.`);
      } else {
        const data = await bidFetch<BidCreateResponse>(`/api/bidding/${bid.id}/revise`, { method: "POST" });
        router.push(`/bidding/${data.bid.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const loadPreview = async () => {
    try {
      setPreview(await bidFetch<BidPreview>(`/api/bidding/${bidId}/preview`));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const issues = useMemo(() => bid?.issues ?? [], [bid]);
  const headerIssues = (field: number) =>
    issues.filter((i) => i.field === field && i.line_id == null && i.product_key == null);
  const lineIssues = (line: BidLine) => issues.filter((i) => i.line_id === line.id);
  const productIssues = (p: BidProduct, field?: number) =>
    issues.filter((i) => i.product_key === p.nsn_part_key && (field == null || i.field === field));
  const generalIssues = issues.filter((i) => i.line_id == null && i.product_key == null);

  if (authLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;
  if (!hasAccess) {
    return (
      <AccessDeniedPage
        featureName="Bidding"
        featureKey={BIDDING_PRODUCT_KEY}
        description="Submit quotes to DLA DIBBS from your priced solicitations."
        benefits={["Send many quotes at once", "Bid type worked out for you", "Saved answers for every part"]}
      />
    );
  }
  if (loading && !bid) return <div className="p-6 text-sm text-muted">Loading bid…</div>;
  if (!bid) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error ?? "Bid not found."}</div>
        <Link href="/bidding" className="text-sm text-primary hover:underline">← Send bids</Link>
      </div>
    );
  }

  const h = bid.header;
  const draft = bid.status === "draft";
  const off = !draft || saving;
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const editableSol = new Set(bid.editable_solicitation_fields);

  const select = (field: string, number: number, label: string, options: CodeOption[], hint?: React.ReactNode) => (
    <Field label={label} field={number} hint={hint} issues={headerIssues(number)}>
      <SelectInput value={h[field] as Value} options={options} disabled={off} onSave={(v) => saveHeader(field, v)} />
    </Field>
  );
  const text = (field: string, number: number, label: string, opts: { max?: number; upper?: boolean; type?: "text" | "number" | "date"; hint?: React.ReactNode } = {}) => (
    <Field label={label} field={number} hint={opts.hint} issues={headerIssues(number)}>
      <TextInput
        value={h[field] as Value}
        type={opts.type}
        maxLength={opts.max}
        upper={opts.upper}
        disabled={off}
        onSave={(v) => saveHeader(field, opts.type === "number" && v != null ? Number(v) : v)}
      />
    </Field>
  );
  /** A solicitation value: read-only, unless ours is unknown — then the bidder
   *  confirms it from the PDF. */
  const solValue = (field: string, number: number, label: string, display: React.ReactNode, options?: CodeOption[], type?: "date") =>
    editableSol.has(field) && draft ? (
      <Field label={label} field={number} hint="Not on file — enter it from the solicitation PDF." issues={headerIssues(number)}>
        {options ? (
          <SelectInput value={h[field] as Value} options={options} disabled={off} onSave={(v) => saveHeader(field, v)} />
        ) : (
          <TextInput value={h[field] as Value} type={type} disabled={off} onSave={(v) => saveHeader(field, v)} />
        )}
      </Field>
    ) : (
      <Field label={label} field={number} issues={headerIssues(number)}>
        <ReadOnly value={display} />
      </Field>
    );

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/bidding" className="text-xs text-primary hover:underline">← Send bids</Link>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            {bidReference(bid)}{" "}
            <span className="font-mono text-lg text-muted">{displaySolicitationNumber(String(h.solicitation_number ?? ""))}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            {BID_STATUS_LABELS[bid.status]} · quoting as CAGE <span className="font-mono">{bid.quote_for_cage}</span> ·
            closes {formatDateMmDdYyyy(h.return_by_date as string | null)}
            {saving && <span className="ml-2 text-xs">Saving…</span>}
          </p>
          {bid.dibbs_reason && <p className="text-sm text-error mt-1">DIBBS: {bid.dibbs_reason}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {draft && (
            <>
              <Button variant="outline" size="sm" disabled={saving} onClick={() => setConfirm("delete")}>
                Delete draft
              </Button>
              <Button variant="primary" size="sm" disabled={saving || !bid.can_send} onClick={send}
                title={bid.can_send ? "Queue for our upload to DIBBS" : "Fix the errors below first"}>
                Send bid
              </Button>
            </>
          )}
          {bid.status === "queued" && (
            <Button variant="outline" size="sm" disabled={saving} onClick={() => setConfirm("withdraw")}>
              Withdraw
            </Button>
          )}
          {["withdrawn", "rejected", "submitted", "expired"].includes(bid.status) && (
            <Button variant="primary" size="sm" disabled={saving} onClick={() => lifecycle("revise")}>
              Revise
            </Button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</div>}
      {toast && <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">{toast}</div>}
      {!draft && (
        <div className="rounded-lg border border-border bg-muted-light px-4 py-3 text-sm text-muted">
          A sent bid is locked. {bid.status === "queued" ? "Withdraw it, then revise it, to make changes." : "Revise it to send a corrected quote."}
        </div>
      )}

      {/* Bid type — derived, never chosen (plan 1.5) */}
      <div className="bg-card-bg rounded-xl border border-border p-5 flex flex-wrap items-start gap-4">
        <div className="shrink-0">
          <p className="text-xs text-muted">Bid type (024)</p>
          <p className="text-xl font-bold text-foreground">
            {bid.bid_type_code} <span className="text-sm font-medium text-muted">{bid.bid_type_name}</span>
          </p>
        </div>
        <div className="flex-1 min-w-[240px] text-sm">
          {bid.bid_type_reasons.length === 0 ? (
            <p className="text-muted">Nothing in this quote departs from the solicitation.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-0.5 text-foreground">
              {bid.bid_type_reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          <p className="text-[11px] text-muted mt-2">
            Worked out from your answers. DIBBS rejects a bid type the quote does not need, so it cannot be set by hand.
          </p>
        </div>
        <div className="text-sm">
          <p className={errors.length ? "text-error font-medium" : "text-success font-medium"}>
            {errors.length ? `${errors.length} to fix before sending` : "Ready to send"}
          </p>
          {warnings.length > 0 && <p className="text-amber-700">{warnings.length} to check</p>}
        </div>
      </div>

      {generalIssues.length > 0 && (
        <div className="rounded-lg border border-border bg-card-bg px-4 py-3">
          <IssueText issues={generalIssues} />
        </div>
      )}

      {bid.variance_question && (
        <Section title="Quantity variance" description="You quoted a quantity variance on this solicitation.">
          <Field label="Does your quoted variance exceed what the RFQ permits?" issues={issues.filter((i) => i.field === 96 && !i.product_key)}
            hint="Check the PDF's QTY VARIANCE clause. Yes makes this a Bid With Exception. DIBBS rejects a wrong answer either way.">
            <div className="flex gap-4 text-sm">
              {[{ v: true, l: "Yes, it exceeds" }, { v: false, l: "No, it is within" }].map((o) => (
                <label key={String(o.v)} className="inline-flex items-center gap-1.5">
                  <input type="radio" name="variance" checked={h.variance_exceeds_rfq === o.v} disabled={off}
                    onChange={() => saveHeader("variance_exceeds_rfq", o.v)} />
                  {o.l}
                </label>
              ))}
            </div>
          </Field>
        </Section>
      )}

      {/* Lines */}
      <Section title="Lines" description="One row per solicitation line. Price and delivery days are yours; the rest comes from the solicitation.">
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={thClass}>Line</th>
                <th className={thClass}>PR</th>
                <th className={thClass}>NSN / part</th>
                <th className={thClass}>UI</th>
                <th className={`${thClass} text-right`}>Solicited</th>
                <th className={`${thClass} text-right`}>Quantity (049)</th>
                <th className={`${thClass} text-right`}>Unit price (050)</th>
                <th className={`${thClass} text-right`}>Required days</th>
                <th className={`${thClass} text-right`}>Delivery days (051)</th>
                <th className={thClass}>No bid</th>
              </tr>
            </thead>
            <tbody>
              {bid.lines.map((ln) => {
                const editable = new Set(ln.editable_solicitation_fields);
                const solCell = (field: keyof BidLine, max: number, display: React.ReactNode) =>
                  editable.has(field) && draft ? (
                    <TextInput value={ln[field] as Value} maxLength={max} upper disabled={off}
                      placeholder="From PDF" onSave={(v) => saveLine(ln, field, v)} />
                  ) : display;
                const li = lineIssues(ln);
                return (
                  <tr key={ln.id} className={`${rowClass} align-top`}>
                    <td className={`${tdClass} font-mono`}>{solCell("line_number", 4, ln.line_number)}</td>
                    <td className={`${tdClass} font-mono`}>{solCell("pr_number", 10, ln.pr_number)}</td>
                    <td className={`${tdClass} font-mono whitespace-nowrap`}>
                      {solCell("nsn_part", 45, displayNsn(ln.nsn_part))}
                      {ln.is_first_article && (
                        <div className="mt-1">
                          <span className="text-[11px] text-muted">First article — waiver (064)</span>
                          <SelectInput value={ln.first_article_waiver} disabled={off}
                            options={[{ value: "Y", label: "Yes, request waiver" }, { value: "N", label: "No waiver requested" }]}
                            onSave={(v) => saveLine(ln, "first_article_waiver", v)} />
                        </div>
                      )}
                      <IssueText issues={li} />
                    </td>
                    <td className={`${tdClass} font-mono`}>{solCell("unit_of_issue", 2, ln.unit_of_issue)}</td>
                    <td className={`${tdClass} text-right font-mono tabular-nums`}>{ln.solicited_quantity ?? "—"}</td>
                    <td className={`${tdClass} text-right w-28`}>
                      <TextInput type="number" value={ln.quantity} step="1" disabled={off}
                        onSave={(v) => saveLine(ln, "quantity", v == null ? null : parseInt(v, 10))} />
                    </td>
                    <td className={`${tdClass} text-right w-36`}>
                      {ln.is_no_bid ? <span className="text-muted">0 (no bid)</span> : (
                        <TextInput type="number" value={ln.unit_price} step="0.00001" disabled={off}
                          onSave={(v) => saveLine(ln, "unit_price", v)} />
                      )}
                      {ln.rfq_price_changed && draft && (
                        <button type="button" className="mt-1 text-[11px] text-amber-700 hover:underline"
                          disabled={off} onClick={() => saveLine(ln, "unit_price", ln.rfq_price_now)}>
                          RFQ repriced to {money(ln.rfq_price_now)} — update
                        </button>
                      )}
                    </td>
                    <td className={`${tdClass} text-right font-mono tabular-nums`}>{ln.required_delivery_days ?? "—"}</td>
                    <td className={`${tdClass} text-right w-28`}>
                      {ln.is_no_bid ? <span className="text-muted">0</span> : (
                        <TextInput type="number" value={ln.delivery_days} step="1" disabled={off}
                          onSave={(v) => saveLine(ln, "delivery_days", v == null ? null : parseInt(v, 10))} />
                      )}
                    </td>
                    <td className={tdClass}>
                      <input type="checkbox" checked={ln.is_no_bid} disabled={off}
                        onChange={(e) => saveLine(ln, "is_no_bid", e.target.checked)}
                        aria-label={`No bid on line ${ln.line_number ?? ""}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Solicitation */}
        <Section title="Solicitation" description="From DLA's data. These must match the RFQ, so they are not edited — except where we could not read one.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {solValue("solicitation_type", 2, "Solicitation type", (SOLICITATION_TYPE_OPTIONS.find((o) => o.value === h.solicitation_type)?.label ?? h.solicitation_type ?? "Blank") as string, SOLICITATION_TYPE_OPTIONS)}
            {solValue("set_aside_indicator", 3, "Set-aside", SET_ASIDE_OPTIONS.find((o) => o.value === h.set_aside_indicator)?.label ?? "—", SET_ASIDE_OPTIONS)}
            {solValue("clause_fillins", 4, "Additional clause fill-ins", h.clause_fillins === "Y" ? "Yes" : h.clause_fillins === "N" ? "No" : "—", YES_NO_OPTIONS)}
            {solValue("return_by_date", 5, "Return by", formatDateMmDdYyyy(h.return_by_date as string | null), undefined, "date")}
            {solValue("hubzone_preference", 57, "HUBZone preference", h.hubzone_preference === "Y" ? "Yes" : h.hubzone_preference === "N" ? "No" : "—", YES_NO_OPTIONS)}
            <Field label="FOB / inspection required">
              <ReadOnly value={`${h.sol_fob_point === "O" ? "Origin" : h.sol_fob_point === "D" ? "Destination" : "Unknown"} / ${h.sol_inspection_point === "O" ? "Origin" : h.sol_inspection_point === "D" ? "Destination" : "Unknown"}`} />
            </Field>
            {(h.guaranteed_minimum != null || h.do_minimum != null || h.contract_maximum != null || h.annual_freq_buys != null) && (
              <Field label="AIDC terms (052–055)">
                <ReadOnly value={`Guaranteed min ${h.guaranteed_minimum ?? "—"} · DO min ${h.do_minimum ?? "—"} · Max ${h.contract_maximum ?? "—"} · Buys/yr ${h.annual_freq_buys ?? "—"}`} />
              </Field>
            )}
          </div>
        </Section>

        {/* Quote terms */}
        <Section title="Quote terms" description="Changing FOB, inspection, packaging or days valid away from the RFQ makes this a Bid With Exception.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {text("days_quote_valid", 27, "Days quote valid", { type: "number" })}
            {select("meets_packaging", 28, "Meets packaging requirement", MEETS_PACKAGING_OPTIONS)}
            {select("fob_point", 32, "FOB point", POINT_OPTIONS)}
            {select("inspection_point", 36, "Inspection point", POINT_OPTIONS)}
            {h.fob_point === "O" && (
              <>
                {text("fob_city", 33, "FOB city", { max: 30, upper: true })}
                <div className="grid grid-cols-2 gap-3">
                  {(h.fob_country === "US" || h.fob_country === "CA") && text("fob_state", 34, "State", { max: 2, upper: true })}
                  {text("fob_country", 35, "Country", { max: 2, upper: true })}
                </div>
              </>
            )}
            {h.inspection_point === "O" && (
              <>
                {text("inspection_packaging_cage", 37, "Packaging inspection CAGE", { max: 5, upper: true })}
                {text("inspection_supplies_cage", 38, "Supplies inspection CAGE", { max: 5, upper: true })}
              </>
            )}
            {select("payment_discount_terms", 25, "Prompt payment discount", PAYMENT_TERMS_OPTIONS)}
            {text("vendor_quote_number", 26, "Your quote number", { max: 15, hint: "Optional, for your reference." })}
            {h.solicitation_type === "I" && select("no_do_minimum", 56, "Accept orders without a minimum quantity?", NO_DO_MINIMUM_OPTIONS)}
            {applies.hubzoneWaiver(h) && select("hubzone_waiver", 58, "HUBZone preference waiver", HUBZONE_WAIVER_OPTIONS)}
          </div>
          <div className="mt-4">
            {text("quote_remarks", 121, "Quote remarks", { max: 255, hint: "Any remark makes this a Bid With Exception, and DLA's automated evaluation cannot read it." })}
          </div>
        </Section>
      </div>

      {/* Representations */}
      <Section
        title="Representations"
        description="From your bidding profile when the bid started. Change them here for this bid only."
        right={
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowReps((s) => !s)}>
            {showReps ? "Hide" : "Show"}
          </button>
        }
      >
        {showReps || [13, 18, 19, 21, 22, 23, 29, 30, 31].some((n) => headerIssues(n).some((i) => i.severity === "error")) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {select("small_business_rep", 13, "Small business representation", SMALL_BUSINESS_REP_OPTIONS)}
            {applies.jointVenture(h) && select("joint_venture", 18, "Joint venture", JOINT_VENTURE_OPTIONS)}
            {applies.jointVenture(h) && h.joint_venture === "JV" && text("joint_venture_remarks", 19, "Joint venture participants", { max: 255 })}
            {select("affirmative_action", 21, "Affirmative action compliance", AFFIRMATIVE_ACTION_OPTIONS)}
            {select("previous_contracts", 22, "Previous contracts and reports", PREVIOUS_CONTRACTS_OPTIONS)}
            {select("alternate_disputes", 23, "Alternate dispute resolution", ALTERNATE_DISPUTES_OPTIONS)}
            {select("boa_fss_bpa", 29, "Ordering agreement", BOA_FSS_BPA_OPTIONS)}
            {h.boa_fss_bpa && h.boa_fss_bpa !== "NAP" && text("boa_contract_number", 30, "Agreement number", { max: 17, upper: true })}
            {h.boa_fss_bpa && h.boa_fss_bpa !== "NAP" && text("boa_expiration_date", 31, "Agreement expires", { type: "date" })}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Small business {String(h.small_business_rep ?? "not set")} · affirmative action {String(h.affirmative_action ?? "not set")} ·
            previous contracts {String(h.previous_contracts ?? "not set")} · ADR {String(h.alternate_disputes ?? "not set")} ·
            agreement {String(h.boa_fss_bpa ?? "not set")}
          </p>
        )}
      </Section>

      {/* Products */}
      {bid.products.map((p) => (
        <ProductBlock
          key={p.id}
          product={p}
          header={h}
          disabled={off}
          issues={productIssues}
          onSave={(body) => saveProduct(p, body)}
          lines={bid.lines.filter((ln) => ln.nsn_part_key === p.nsn_part_key)}
        />
      ))}

      {/* Review */}
      <Section
        title="Review"
        description="Everything to fix or check, and the exact rows this bid puts in the upload file."
        right={<Button variant="outline" size="sm" onClick={loadPreview}>Show file rows</Button>}
      >
        {issues.length === 0 ? (
          <p className="text-sm text-success">Nothing to fix.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {[...errors, ...warnings].map((i, n) => (
              <li key={n} className={i.severity === "error" ? "text-error" : "text-amber-700"}>
                {i.severity === "error" ? "Fix: " : "Check: "}
                {i.message}
              </li>
            ))}
          </ul>
        )}
        {preview && (
          <div className="mt-4">
            {preview.error ? (
              <p className="text-sm text-error">{preview.error}</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-border bg-muted-light">
                  <pre className="p-3 text-[11px] font-mono whitespace-pre">{preview.text}</pre>
                </div>
                {Object.keys(preview.import_view).length > 0 && (
                  <div className="mt-2 text-xs text-muted">
                    <p className="font-medium text-foreground">What DIBBS says it keeps of these fields:</p>
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries(preview.import_view).flatMap(([row, fields]) =>
                        Object.entries(fields).map(([f, v]) => (
                          <li key={`${row}-${f}`}>
                            Row {Number(row) + 1}, field {fmt(Number(f))}: <span className="font-mono">{v || "(empty)"}</span>
                          </li>
                        )),
                      )}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Section>

      <ConfirmDialog
        isOpen={confirm !== null}
        title={confirm === "delete" ? "Delete this draft?" : "Withdraw this bid?"}
        message={
          confirm === "delete"
            ? `${bidReference(bid)} will be deleted. Saved part answers are kept.`
            : `${bidReference(bid)} will not be uploaded. You can revise it and send it again.`
        }
        confirmLabel={confirm === "delete" ? "Delete" : "Withdraw"}
        onConfirm={() => {
          if (confirm) lifecycle(confirm);
        }}
        onClose={() => setConfirm(null)}
        isLoading={saving}
      />
    </div>
  );
}

// --- One product block --------------------------------------------------------

function ProductBlock({
  product: p, header: h, disabled, issues, onSave, lines,
}: {
  product: BidProduct;
  header: BidDetail["header"];
  disabled: boolean;
  issues: (p: BidProduct, field?: number) => BidIssue[];
  onSave: (body: Record<string, unknown>) => void;
  lines: BidLine[];
}) {
  const v = p.values;
  const inherited = new Set(p.inherited);
  const editableSol = new Set(p.editable_solicitation_fields);
  const hint = (attr: string, extra?: React.ReactNode) =>
    inherited.has(attr) ? <>From the main item{extra ? <> · {extra}</> : null}</> : extra;

  const sel = (attr: string, number: number, label: string, options: CodeOption[], extra?: React.ReactNode) => (
    <Field label={label} field={number} hint={hint(attr, extra)} issues={issues(p, number)}>
      <SelectInput value={v[attr] as Value} options={options} disabled={disabled} onSave={(x) => onSave({ [attr]: x })} />
    </Field>
  );
  const txt = (attr: string, number: number, label: string, opts: { max?: number; upper?: boolean; type?: "text" | "number"; extra?: React.ReactNode } = {}) => (
    <Field label={label} field={number} hint={hint(attr, opts.extra)} issues={issues(p, number)}>
      <TextInput value={v[attr] as Value} type={opts.type} maxLength={opts.max} upper={opts.upper} disabled={disabled}
        onSave={(x) => onSave({ [attr]: opts.type === "number" && x != null ? Number(x) : x })} />
    </Field>
  );
  const solInd = (attr: string, number: number, label: string) =>
    editableSol.has(attr) && !disabled ? (
      txt(attr, number, label, { max: 1, upper: true, extra: "Not on file — enter it from the PDF." })
    ) : (
      <Field label={label} field={number} issues={issues(p, number)}>
        <ReadOnly value={v[attr] ?? "Unknown"} />
      </Field>
    );

  const showBreaks = h.solicitation_type !== "I" && v.price_breaks_solicited === "Y";
  const lineNumbers = lines.map((ln) => ln.line_number ?? "?").join(", ");

  return (
    <Section
      title={`Item ${p.is_pseudo_item ? p.nsn_part_key.replace(/^PN:/, "") : displayNsn(lines[0]?.nsn_part ?? null)}`}
      description={
        p.is_pseudo_item
          ? `Line ${lineNumbers}. A first-article or similar item: answers left blank use the main item's.`
          : `Line${lines.length > 1 ? "s" : ""} ${lineNumbers}. Answers here apply to every line of this item${p.bidding_part_profile_id ? ", and were filled from your saved answers" : ""}. Sending saves them for the next bid.`
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {solInd("item_description_ind", 105, "Item description")}
        {solInd("higher_level_quality_ind", 117, "Higher-level quality")}
        {solInd("buy_american_ind", 68, "Buy American")}
        {solInd("trade_agreements_ind", 62, "Trade agreements")}

        {sel("hazmat", 65, "Hazardous material", HAZMAT_OPTIONS)}
        {v.hazmat === "Y" && sel("hazmat_warning_label", 66, "Hazard warning labels", HAZARD_LABEL_OPTIONS)}
        {sel("material_requirements", 67, "Material", MATERIAL_OPTIONS)}
        {sel("child_labor_cert", 120, "Child labor certification", CHILD_LABOR_OPTIONS)}

        {sel("end_product_code", 70, "End product", END_PRODUCT_OPTIONS)}
        {applies.origin(v) && txt("country_of_origin", 71, "Country of origin", { max: 2, upper: true })}
        {applies.qualifyingCountry(v) && txt("qualifying_country", 72, "Qualifying country", { max: 2, upper: true })}
        {applies.dutyFree(v) && sel("duty_free_requested", 73, "Duty-free entry requested", YES_NO_OPTIONS)}
        {applies.dutyFree(v) && v.duty_free_requested === "Y" && sel("duty_free_foreign_in_us", 74, "Foreign supplies already in the US?", YES_NO_OPTIONS)}
        {applies.dutyFree(v) && v.duty_free_foreign_in_us === "Y" && sel("duty_paid", 75, "Duty paid?", YES_NO_OPTIONS)}
        {applies.dutyFree(v) && v.duty_paid === "N" && txt("duty_paid_amount", 76, "Amount covering duty", { type: "number" })}

        {sel("manufacturer_dealer", 102, "Manufacturer or dealer", MANUFACTURER_DEALER_OPTIONS)}
        {v.manufacturer_dealer === "QD" && txt("source_of_supply_cage", 63, "Source of supply CAGE", { max: 5, upper: true })}
        {applies.dealer(v) && txt("actual_mfr_cage", 103, "Actual manufacturer CAGE", { max: 5, upper: true, extra: "Or a name and address below." })}
        {applies.dealer(v) && txt("actual_mfr_name_address", 104, "Manufacturer name and address", { max: 255 })}
      </div>

      {applies.partOffered(v) && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
          {sel("part_offered_code", 106, "Part number offered", PART_OFFERED_OPTIONS)}
          {txt("part_offered_cage", 107, "Offered CAGE", { max: 5, upper: true })}
          {txt("part_offered_number", 108, "Offered part number", { max: 40, extra: "Must match the RFQ exactly for an exact product." })}
          {v.part_offered_code !== "1" && txt("part_offered_remarks", 109, "Part number remarks", { max: 255 })}
        </div>
      )}
      {applies.suppliesOffered(v) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {sel("supplies_offered", 110, "Supplies offered", SUPPLIES_OFFERED_OPTIONS)}
          {v.supplies_offered !== "1" && txt("supplies_offered_remarks", 111, "Supplies offered remarks", { max: 255 })}
        </div>
      )}
      {applies.qpl(v) && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mt-4">
          {txt("qpl_mfg_cage", 112, "QPL manufacturer CAGE", { max: 5, upper: true })}
          {txt("qpl_source_cage", 113, "QPL source CAGE", { max: 5, upper: true })}
          {txt("qpl_item_name", 114, "QPL item name", { max: 50 })}
          {txt("qpl_service_id", 115, "QPL service ID", { max: 50 })}
          {txt("qpl_test_number", 116, "QPL test number", { max: 50 })}
        </div>
      )}
      {applies.quality(v) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {sel("hlq_code", 118, "Your quality system", HLQ_CODE_OPTIONS)}
          {v.hlq_code === "2" && txt("hlq_remarks", 119, "Equivalent quality system", { max: 255 })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
        {txt("quantity_variance_plus", 96, "Quantity variance +%", { type: "number", extra: "0–10." })}
        {txt("quantity_variance_minus", 97, "Quantity variance −%", { type: "number", extra: "0–10." })}
        {sel("min_order_quantity_code", 98, "Larger quantity at no extra cost?", YES_NO_OPTIONS)}
        {v.min_order_quantity_code === "Y" && txt("min_order_max_quantity", 99, "Quantity available", { type: "number" })}
        {sel("immediate_ship_available", 100, "Quantity available for immediate shipment?", YES_NO_OPTIONS)}
        {v.immediate_ship_available === "Y" && txt("immediate_ship_quantity", 101, "Immediate shipment quantity", { type: "number" })}
        {v.immediate_ship_available === "Y" && txt("immediate_ship_price", 59, "Immediate shipment price", { type: "number" })}
        {v.immediate_ship_available === "Y" && txt("immediate_ship_days", 60, "Immediate shipment days", { type: "number" })}
      </div>

      {showBreaks && <PriceBreakGrid product={p} disabled={disabled} issues={issues(p).filter((i) => i.field != null && i.field >= 77 && i.field <= 95)} onSave={onSave} />}
      {v.price_breaks_solicited == null && h.solicitation_type !== "I" && (
        <p className="mt-4 text-[11px] text-amber-700">Whether DLA asks for price breaks on this item is not on file — check the PDF.</p>
      )}
    </Section>
  );
}

function PriceBreakGrid({ product, disabled, issues, onSave }: {
  product: BidProduct; disabled: boolean; issues: BidIssue[]; onSave: (body: Record<string, unknown>) => void;
}) {
  const rows = product.price_breaks.length > 0
    ? product.price_breaks
    : [{ range_no: 1, lower_quantity: null, upper_quantity: null, unit_price: null }];
  const update = (rangeNo: number, attr: "lower_quantity" | "upper_quantity" | "unit_price", raw: string | null) => {
    const next = rows.map((b) =>
      b.range_no === rangeNo
        ? { ...b, [attr]: raw == null ? null : attr === "unit_price" ? raw : parseInt(raw, 10) }
        : b,
    );
    onSave({ price_breaks: next });
  };
  const add = () => {
    if (rows.length >= 6) return;
    onSave({ price_breaks: [...rows, { range_no: rows.length + 1, lower_quantity: null, upper_quantity: null, unit_price: null }] });
  };
  return (
    <div className="mt-5">
      <p className="text-xs font-medium text-card-foreground mb-1">
        Price breaks <span className="text-muted font-normal">(078–095)</span>
      </p>
      <p className="text-[11px] text-muted mb-2">DLA asks for prices at these quantities. The ranges come from the solicitation; the unit prices are yours.</p>
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={thClass}>Range</th>
              <th className={`${thClass} text-right`}>From quantity</th>
              <th className={`${thClass} text-right`}>To quantity</th>
              <th className={`${thClass} text-right`}>Unit price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.range_no} className={rowClass}>
                <td className={tdClass}>{b.range_no}</td>
                <td className={`${tdClass} w-32`}>
                  <TextInput type="number" step="1" value={b.lower_quantity} disabled={disabled} onSave={(x) => update(b.range_no, "lower_quantity", x)} />
                </td>
                <td className={`${tdClass} w-32`}>
                  <TextInput type="number" step="1" value={b.upper_quantity} disabled={disabled} onSave={(x) => update(b.range_no, "upper_quantity", x)} />
                </td>
                <td className={`${tdClass} w-36`}>
                  <TextInput type="number" step="0.00001" value={b.unit_price} disabled={disabled} onSave={(x) => update(b.range_no, "unit_price", x)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length < 6 && !disabled && (
        <button type="button" className="mt-2 text-xs text-primary hover:underline" onClick={add}>Add a range</button>
      )}
      <IssueText issues={issues} />
    </div>
  );
}
