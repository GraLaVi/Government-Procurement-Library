"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  rowClass, tableClass, tableHeadRowClass, tableWrapClass, tdClass, thClass,
} from "@/components/rfq/TableCard";
import { BIDDING_PRODUCT_KEY } from "@/lib/bidding/access";
import { bidFetch, money } from "@/lib/bidding/api";
import { formatDateMmDdYyyy } from "@/lib/dates";
import { geoOptions, subdivisions, useGeo, type GeoLists } from "@/lib/geo";
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
import { FLASH_KEY } from "@/lib/bidding/flash";

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

/** A value that is set and cannot be changed (from the solicitation, or fixed
 *  by DLA's rules): shown as the form field it is, disabled. */
function ReadOnly({ value, className = "" }: { value: React.ReactNode; className?: string }) {
  const shown = value == null || value === "" ? "—" : String(value);
  return (
    <input className={`${inputClass} cursor-not-allowed ${className}`} value={shown} disabled readOnly
      title="Set by the solicitation; it cannot be changed" />
  );
}

type TabKey = "lines" | "items" | "terms" | "reps" | "review";

// The editor's tabs. Parts is what changes on every bid; the rest is mostly
// filled from the bid profile and saved part answers.
const TABS: { key: TabKey; label: string }[] = [
  { key: "lines", label: "Parts" },
  { key: "terms", label: "Solicitation & terms" },
  { key: "items", label: "Items" },
  { key: "reps", label: "Representations" },
  { key: "review", label: "Review" },
];

// Header fields shown on the Representations tab.
const REP_FIELDS = [13, 18, 19, 21, 22, 23, 29, 30, 31];

const PDF_DOCKED_KEY = "bidmanager.editor.pdfDocked";
const PDF_MEDIA = "(min-width: 1280px)"; // Tailwind xl: room for the form and the PDF side by side

/** "Enter it from the PDF", with a way to open it when we have it. */
function PdfHint({ onOpen, short }: { onOpen?: () => void; short?: boolean }) {
  return (
    <>
      Not on file — enter it from the {short ? "" : "solicitation "}PDF.
      {onOpen && (
        <button type="button" className="ml-1 text-primary hover:underline" onClick={onOpen}>Open PDF</button>
      )}
    </>
  );
}

/** Options for a code select, keeping a stored value that is not among them
 *  (so the bidder sees it beside its error rather than a blank). */
function withCurrent(options: CodeOption[], current: Value): CodeOption[] {
  if (current == null || current === "" || options.some((o) => o.value === String(current))) return options;
  return [...options, { value: String(current), label: `${current} (not valid here)` }];
}

/** Country options for the codes a field accepts, named from the geo list. */
function countryOptions(geo: GeoLists | null, codes: string[] | undefined): CodeOption[] {
  if (!geo) return [];
  const rows = codes ? geo.countries.filter((c) => codes.includes(c.code)) : geo.countries;
  return geoOptions(rows);
}

/** How many things on a tab to fix (red) or check (amber). */
function CountBadge({ n, tone = "error" }: { n: number; tone?: "error" | "warning" }) {
  return (
    <span className={`min-w-[1.25rem] px-1.5 rounded-full text-[11px] leading-5 text-center font-semibold ${
      tone === "error" ? "bg-error text-white" : "bg-amber-100 text-amber-800"
    }`}>
      {n}
    </span>
  );
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
  const [tab, setTab] = useState<TabKey>("lines");
  const [itemKey, setItemKey] = useState<string | null>(null);
  // The PDF sits beside the form on wide screens (remembered), in a modal otherwise.
  const [pdfDocked, setPdfDocked] = useState(false);
  const [pdfModal, setPdfModal] = useState(false);
  const geo = useGeo();

  useEffect(() => {
    try {
      if (localStorage.getItem(PDF_DOCKED_KEY) === "1" && window.matchMedia(PDF_MEDIA).matches) setPdfDocked(true);
    } catch { /* storage unavailable */ }
  }, []);

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

  // Every field saves as it is edited, so "Send later" has nothing to save:
  // the draft already sits on Send bids' Ready tab, to go out with "Send
  // selected" or "Send all ready". Takes the bidder there with a note.
  const sendLater = () => {
    if (!bid) return;
    try {
      sessionStorage.setItem(FLASH_KEY, `${bidReference(bid)} saved to Ready. Send it from here when you're ready.`);
    } catch {
      // Storage blocked: skip the note.
    }
    router.push("/bidmanager");
  };

  const lifecycle = async (action: "delete" | "withdraw" | "revise") => {
    if (!bid) return;
    setSaving(true);
    setError(null);
    try {
      if (action === "delete") {
        await bidFetch(`/api/bidding/${bid.id}`, { method: "DELETE" });
        router.push("/bidmanager");
        return;
      }
      if (action === "withdraw") {
        setBid(await bidFetch<BidDetail>(`/api/bidding/${bid.id}/withdraw`, { method: "POST" }));
        setToast(`${bidReference(bid)} withdrawn. Revise it to change it and send it again.`);
      } else {
        const data = await bidFetch<BidCreateResponse>(`/api/bidding/${bid.id}/revise`, { method: "POST" });
        router.push(`/bidmanager/${data.bid.id}`);
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
  const generalIssues = issues.filter((i) => i.line_id == null && i.product_key == null && i.field == null);

  if (authLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;
  if (!hasAccess) {
    return (
      <AccessDeniedPage
        featureName="Bid Manager"
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
        <Link href="/bidmanager" className="text-sm text-primary hover:underline">← Send bids</Link>
      </div>
    );
  }

  const h = bid.header;
  const draft = bid.status === "draft";
  const off = !draft || saving;
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const editableSol = new Set(bid.editable_solicitation_fields);
  const pdfUrl = bid.has_pdf && bid.solicitation_id ? `/api/library/solicitations/${bid.solicitation_id}/pdf` : null;
  const setDocked = (on: boolean) => {
    setPdfDocked(on);
    try { localStorage.setItem(PDF_DOCKED_KEY, on ? "1" : "0"); } catch { /* storage unavailable */ }
  };
  const openPdf = pdfUrl
    ? () => (window.matchMedia(PDF_MEDIA).matches ? setDocked(true) : setPdfModal(true))
    : undefined;

  // A first-article line is a question about the solicitation, not a part to
  // price: it is answered in the Solicitation section, not the Lines table.
  const fatLines = bid.lines.filter((ln) => ln.is_first_article);
  const partLines = bid.lines.filter((ln) => !ln.is_first_article);
  const fatLineIds = new Set(fatLines.map((ln) => ln.id));
  // Item blocks. A first-article item is not a real item: its answers come
  // from the main item (quote.effective_products), so it gets no block.
  const fatOnlyKeys = new Set(
    bid.products
      .filter((p) => p.is_pseudo_item && bid.lines.filter((ln) => ln.nsn_part_key === p.nsn_part_key).every((ln) => fatLineIds.has(ln.id)))
      .map((p) => p.nsn_part_key),
  );
  const items = bid.products.filter((p) => !fatOnlyKeys.has(p.nsn_part_key));
  const item = items.find((p) => p.nsn_part_key === itemKey) ?? items[0];

  const tabOf = (i: BidIssue): TabKey => {
    if (i.product_key != null) return fatOnlyKeys.has(i.product_key) ? "terms" : "items";
    if (i.line_id != null) return fatLineIds.has(i.line_id) ? "terms" : "lines";
    if (i.field == null || i.field === 96) return "lines";
    return REP_FIELDS.includes(i.field) ? "reps" : "terms";
  };
  const tabCounts = (key: TabKey, severity: BidIssue["severity"]) =>
    issues.filter((i) => i.severity === severity && tabOf(i) === key).length;
  const goTo = (i: BidIssue) => {
    setTab(tabOf(i));
    if (i.product_key != null && !fatOnlyKeys.has(i.product_key)) setItemKey(i.product_key);
  };

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
      <Field label={label} field={number} hint={<PdfHint onOpen={openPdf} />} issues={headerIssues(number)}>
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
    <div className={pdfDocked && pdfUrl ? "xl:grid xl:grid-cols-2 xl:gap-6 xl:items-start" : ""}>
      <div className="space-y-6 min-w-0">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/bidmanager" className="text-xs text-primary hover:underline">← Send bids</Link>
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
            {openPdf ? (
              <Button variant="outline" size="sm" aria-pressed={pdfDocked}
                onClick={() => (pdfDocked ? setDocked(false) : openPdf())}>
                {pdfDocked ? "Hide PDF" : "Solicitation PDF"}
              </Button>
            ) : (
              <span className="text-xs text-muted">PDF not on file</span>
            )}
            {draft && (
              <>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => setConfirm("delete")}>
                  Delete draft
                </Button>
                <Button variant="outline" size="sm" disabled={saving} onClick={sendLater}
                  title="Keep it on the Ready tab of Send bids and send it later">
                  Send later
                </Button>
                <Button variant="primary" size="sm" disabled={saving || !bid.can_send} onClick={send}
                  title={bid.can_send ? "Queue it now for our next upload to DIBBS" : "Fix the errors below first"}>
                  Send now
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

        <nav role="tablist" aria-label="Bid sections" className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {TABS.map((t) => {
            const errs = t.key === "review" ? errors.length : tabCounts(t.key, "error");
            const warns = t.key === "review" ? warnings.length : tabCounts(t.key, "warning");
            return (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors inline-flex items-center gap-1.5 ${
                  tab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                }`}>
                {t.label}
                {errs > 0 ? <CountBadge n={errs} /> : warns > 0 ? <CountBadge n={warns} tone="warning" /> : null}
              </button>
            );
          })}
        </nav>

        {tab === "lines" && (
          <div role="tabpanel" className="space-y-6">
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
            <Section title="Parts" description="One row per solicitation line. Price and delivery days are yours; the rest comes from the solicitation.">
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
                    {partLines.map((ln) => {
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
          </div>
        )}

        {tab === "items" && (
          <div role="tabpanel" className="space-y-6">
            <div className="space-y-4">
              {items.length > 1 && (
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Items">
                  {items.map((p) => {
                    const n = productIssues(p).filter((i) => i.severity === "error").length;
                    const active = p.nsn_part_key === item?.nsn_part_key;
                    const ln = bid.lines.filter((l) => l.nsn_part_key === p.nsn_part_key);
                    return (
                      <button key={p.id} type="button" role="tab" aria-selected={active} onClick={() => setItemKey(p.nsn_part_key)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 ${
                          active ? "border-primary bg-primary/5 text-primary" : "border-border bg-card-bg text-muted hover:text-foreground"
                        }`}>
                        <span className="font-mono">
                          {p.is_pseudo_item ? p.nsn_part_key.replace(/^PN:/, "") : displayNsn(ln[0]?.nsn_part ?? null)}
                        </span>
                        <span>· line{ln.length > 1 ? "s" : ""} {ln.map((l) => l.line_number ?? "?").join(", ")}</span>
                        {n > 0 && <CountBadge n={n} />}
                      </button>
                    );
                  })}
                </div>
              )}
              {item && (
                <ProductBlock
                  key={item.id}
                  product={item}
                  header={h}
                  disabled={off}
                  issues={productIssues}
                  onSave={(body) => saveProduct(item, body)}
                  lines={bid.lines.filter((ln) => ln.nsn_part_key === item.nsn_part_key)}
                  onOpenPdf={openPdf}
                />
              )}
            </div>
          </div>
        )}

        {tab === "terms" && (
          <div role="tabpanel" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* Solicitation */}
              <Section title="Solicitation" description="From DLA's data. These must match the RFQ, so they are not edited — except where we could not read one.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {solValue("solicitation_type", 2, "Solicitation type", (SOLICITATION_TYPE_OPTIONS.find((o) => o.value === h.solicitation_type)?.label ?? h.solicitation_type ?? "Blank") as string, SOLICITATION_TYPE_OPTIONS)}
                  {solValue("set_aside_indicator", 3, "Set-aside", SET_ASIDE_OPTIONS.find((o) => o.value === h.set_aside_indicator)?.label ?? "—", SET_ASIDE_OPTIONS)}
                  {solValue("clause_fillins", 4, "Additional clause fill-ins", h.clause_fillins === "Y" ? "Yes" : h.clause_fillins === "N" ? "No" : "—", YES_NO_OPTIONS)}
                  {solValue("return_by_date", 5, "Return by", formatDateMmDdYyyy(h.return_by_date as string | null), undefined, "date")}
                  {solValue("hubzone_preference", 57, "HUBZone preference", h.hubzone_preference === "Y" ? "Yes" : h.hubzone_preference === "N" ? "No" : "—", YES_NO_OPTIONS)}
                  <Field label="FOB required">
                    <ReadOnly value={h.sol_fob_point === "O" ? "Origin" : h.sol_fob_point === "D" ? "Destination" : "Unknown"} />
                  </Field>
                  <Field label="Inspection required">
                    <ReadOnly value={h.sol_inspection_point === "O" ? "Origin" : h.sol_inspection_point === "D" ? "Destination" : "Unknown"} />
                  </Field>
                  {(h.guaranteed_minimum != null || h.do_minimum != null || h.contract_maximum != null || h.annual_freq_buys != null) && (
                    <>
                      <Field label="Guaranteed minimum" field={52}><ReadOnly value={h.guaranteed_minimum as Value} /></Field>
                      <Field label="Delivery order minimum" field={53}><ReadOnly value={h.do_minimum as Value} /></Field>
                      <Field label="Contract maximum" field={54}><ReadOnly value={h.contract_maximum as Value} /></Field>
                      <Field label="Annual frequency of buys" field={55}><ReadOnly value={h.annual_freq_buys as Value} /></Field>
                    </>
                  )}
                </div>
                {fatLines.map((ln) => {
                  const waiver = ln.first_article_waiver;
                  const li = lineIssues(ln);
                  const at = (n: number) => li.filter((i) => i.field === n);
                  const lineEditable = new Set(ln.editable_solicitation_fields);
                  return (
                    <div key={ln.id} className="mt-5 pt-4 border-t border-border">
                      <h3 className="text-sm font-semibold text-secondary">First article testing</h3>
                      <p className="text-xs text-muted mt-0.5">
                        Line {ln.line_number ?? "?"}
                      </p>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Request waiver of first article testing?" field={64} issues={at(64)}
                          hint={waiver === "Y"
                            ? "Quoted at 0 price and 0 days. DLA treats a waiver request as an exception, so the bid goes in as Bid With Exception."
                            : waiver === "N" ? "Enter the price and delivery days for the test itself." : undefined}>
                          <SelectInput value={waiver} disabled={off}
                            options={[{ value: "Y", label: "Yes, request waiver" }, { value: "N", label: "No waiver requested" }]}
                            onSave={(v) => saveLine(ln, "first_article_waiver", v)} />
                        </Field>
                        <Field label="Quantity" field={49} issues={at(49)}>
                          <ReadOnly value={ln.quantity} />
                        </Field>
                        {waiver === "N" && (
                          <>
                            <Field label="Test price" field={50} issues={at(50)}>
                              <TextInput type="number" value={ln.unit_price} step="0.00001" disabled={off}
                                onSave={(v) => saveLine(ln, "unit_price", v)} />
                            </Field>
                            <Field label="Test delivery days" field={51} issues={at(51)}
                              hint={ln.required_delivery_days != null ? `${ln.required_delivery_days} days required` : undefined}>
                              <TextInput type="number" value={ln.delivery_days} step="1" disabled={off}
                                onSave={(v) => saveLine(ln, "delivery_days", v == null ? null : parseInt(v, 10))} />
                            </Field>
                          </>
                        )}
                        {draft && ([["line_number", 44, "Line number", 4], ["pr_number", 46, "Purchase request", 10], ["unit_of_issue", 48, "Unit of issue", 2]] as const)
                          .filter(([attr]) => lineEditable.has(attr))
                          .map(([attr, n, label, max]) => (
                            <Field key={attr} label={label} field={n} issues={at(n)} hint={<PdfHint onOpen={openPdf} />}>
                              <TextInput value={ln[attr] as Value} maxLength={max} upper disabled={off} onSave={(v) => saveLine(ln, attr, v)} />
                            </Field>
                          ))}
                      </div>
                      <IssueText issues={[
                  ...li.filter((i) => ![44, 46, 48, 49, 50, 51, 64].includes(i.field ?? -1)),
                  ...issues.filter((i) => i.product_key === ln.nsn_part_key),
                ]} />
                    </div>
                  );
                })}
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
                        {(h.fob_country === "US" || h.fob_country === "CA") &&
                          select("fob_state", 34, h.fob_country === "CA" ? "Province" : "State",
                            withCurrent(geoOptions(subdivisions(geo, h.fob_country as string)), h.fob_state))}
                        {select("fob_country", 35, "Country", withCurrent(countryOptions(geo, undefined), h.fob_country))}
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
          </div>
        )}

        {tab === "reps" && (
          <div role="tabpanel" className="space-y-6">
            <Section
              title="Representations"
              description="From your bid profile when the bid started. Change them here for this bid only."
            >
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
            </Section>
          </div>
        )}

        {tab === "review" && (
          <div role="tabpanel" className="space-y-6">
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
                      {tabOf(i) !== "review" && (
                        <button type="button" className="ml-2 text-xs text-primary hover:underline" onClick={() => goTo(i)}>
                          Go to {TABS.find((t) => t.key === tabOf(i))?.label}
                        </button>
                      )}
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
          </div>
        )}

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

      {pdfDocked && pdfUrl && (
        <aside className="hidden xl:flex flex-col sticky top-4 h-[calc(100vh-2rem)] bg-card-bg rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border text-xs">
            <span className="font-medium text-secondary">
              Solicitation {displaySolicitationNumber(String(h.solicitation_number ?? ""))}
            </span>
            <span className="flex items-center gap-3">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open in new tab</a>
              <button type="button" className="text-muted hover:text-foreground" onClick={() => setDocked(false)}>Close</button>
            </span>
          </div>
          <iframe src={pdfUrl} title={`Solicitation ${h.solicitation_number ?? ""}`} className="flex-1 w-full" />
        </aside>
      )}

      {pdfModal && pdfUrl && (
        <Modal isOpen={true} onClose={() => setPdfModal(false)} title={`Solicitation ${displaySolicitationNumber(String(h.solicitation_number ?? ""))}`} size="full">
          <div className="flex flex-col gap-2">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Open in new tab</a>
            <iframe src={pdfUrl} title={`Solicitation ${h.solicitation_number ?? ""}`} className="w-full border border-border rounded min-h-[70vh]" />
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- One product block --------------------------------------------------------

function ProductBlock({
  product: p, header: h, disabled, issues, onSave, lines, onOpenPdf,
}: {
  product: BidProduct;
  header: BidDetail["header"];
  disabled: boolean;
  issues: (p: BidProduct, field?: number) => BidIssue[];
  onSave: (body: Record<string, unknown>) => void;
  lines: BidLine[];
  onOpenPdf?: () => void;
}) {
  const geo = useGeo();
  const v = p.values;
  const inherited = new Set(p.inherited);
  // Only the codes this field accepts given the item's other answers.
  const only = (number: number, options: CodeOption[]) => {
    const codes = p.code_options[String(number)];
    return codes ? options.filter((o) => codes.includes(o.value)) : options;
  };
  const editableSol = new Set(p.editable_solicitation_fields);
  const hint = (attr: string, extra?: React.ReactNode) =>
    inherited.has(attr) ? <>From the main item{extra ? <> · {extra}</> : null}</> : extra;

  const sel = (attr: string, number: number, label: string, options: CodeOption[], extra?: React.ReactNode) => (
    <Field label={label} field={number} hint={hint(attr, extra)} issues={issues(p, number)}>
      <SelectInput value={v[attr] as Value} options={withCurrent(only(number, options), v[attr] as Value)} disabled={disabled} onSave={(x) => onSave({ [attr]: x })} />
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
      txt(attr, number, label, { max: 1, upper: true, extra: <PdfHint onOpen={onOpenPdf} short /> })
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
        {applies.origin(v) && sel("country_of_origin", 71, "Country of origin", countryOptions(geo, p.code_options["71"]))}
        {applies.qualifyingCountry(v) && sel("qualifying_country", 72, "Qualifying country", countryOptions(geo, p.code_options["72"]))}
        {applies.dutyFree(v) && sel("duty_free_requested", 73, "Duty-free entry requested", YES_NO_OPTIONS)}
        {applies.dutyFree(v) && v.duty_free_requested === "Y" && (
          <>
            {sel("duty_free_foreign_in_us", 74, "Foreign supplies already in the US?", YES_NO_OPTIONS)}
            {v.duty_free_foreign_in_us === "Y" && (
              <>
                {sel("duty_paid", 75, "Duty paid?", YES_NO_OPTIONS)}
                {v.duty_paid === "N" && txt("duty_paid_amount", 76, "Amount covering duty", { type: "number" })}
              </>
            )}
          </>
        )}

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
