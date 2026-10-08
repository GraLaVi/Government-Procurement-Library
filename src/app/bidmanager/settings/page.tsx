"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedPage } from "@/components/library/AccessDeniedPage";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { BIDDING_PRODUCT_KEY } from "@/lib/bidding/access";
import { errorText } from "@/lib/bidding/api";
import { geoOptions, subdivisions, useGeo } from "@/lib/geo";
import {
  AFFIRMATIVE_ACTION_OPTIONS,
  ALTERNATE_DISPUTES_OPTIONS,
  BOA_FSS_BPA_OPTIONS,
  CHILD_LABOR_OPTIONS,
  EMPTY_PROFILE_FIELDS,
  JOINT_VENTURE_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  PREVIOUS_CONTRACTS_OPTIONS,
  SMALL_BUSINESS_REP_OPTIONS,
  type BiddingProfile,
  type BiddingProfileFields,
  type BiddingProfileSuggestion,
  type BiddingProfilesOverview,
  type CodeOption,
} from "@/lib/bidding/types";

const NOT_SET = { value: "", label: "Not set" };

function pickFields(src: BiddingProfileFields): BiddingProfileFields {
  const out = { ...EMPTY_PROFILE_FIELDS };
  for (const k of Object.keys(out) as (keyof BiddingProfileFields)[]) {
    (out as Record<string, unknown>)[k] = src[k] ?? null;
  }
  return out;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-secondary mb-1">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted mt-1">{children}</p>;
}

export default function BiddingSettingsPage() {
  const { user, isLoading: authLoading, hasProductAccess } = useAuth();
  const hasAccess = hasProductAccess(BIDDING_PRODUCT_KEY);

  const [overview, setOverview] = useState<BiddingProfilesOverview | null>(null);
  const [cage, setCage] = useState<string | null>(null);
  const [form, setForm] = useState<BiddingProfileFields>(EMPTY_PROFILE_FIELDS);
  const geo = useGeo();
  // Set while editing a profile that has not been saved yet; carries where
  // each suggested value came from.
  const [suggestedSources, setSuggestedSources] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bidding/profiles");
      const data = await res.json();
      if (!res.ok) {
        setError(errorText(data, "Failed to load bid profiles."));
        return;
      }
      const ov = data as BiddingProfilesOverview;
      setOverview(ov);
      // v1 has one allowed CAGE: the company's own.
      const target = ov.profiles.find((p) => p.is_default)?.cage_code ?? ov.allowed_cages[0] ?? null;
      setCage(target);
      const existing = ov.profiles.find((p) => p.cage_code === target);
      if (existing) {
        setForm(pickFields(existing));
        setSuggestedSources(null);
      } else if (target) {
        const sRes = await fetch(`/api/bidding/profiles/${encodeURIComponent(target)}/suggested`);
        const s = await sRes.json();
        if (!sRes.ok) {
          setError(errorText(s, "Failed to load suggested values."));
          return;
        }
        const suggestion = s as BiddingProfileSuggestion;
        setForm(pickFields(suggestion));
        setSuggestedSources(suggestion.sources);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && hasAccess) load();
  }, [authLoading, hasAccess, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const set = <K extends keyof BiddingProfileFields>(key: K, value: BiddingProfileFields[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!cage) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/bidding/profiles/${encodeURIComponent(cage)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, is_default: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(errorText(data, "Failed to save the bid profile."));
        return;
      }
      const saved = data as BiddingProfile;
      setForm(pickFields(saved));
      setSuggestedSources(null);
      setOverview((ov) =>
        ov ? { ...ov, profiles: [saved, ...ov.profiles.filter((p) => p.cage_code !== saved.cage_code)] } : ov,
      );
      setToast("Bid profile saved.");
    } catch {
      setError("Network error saving the bid profile.");
    } finally {
      setSaving(false);
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
          "Representations entered once, reused on every quote",
          "Saved answers for every part you quote",
          "Bid type worked out for you, with the reasons",
        ]}
      />
    );
  }

  const canEdit = overview?.can_edit ?? false;
  const disabled = !canEdit || saving;
  const isNew = suggestedSources !== null;
  const source = (field: keyof BiddingProfileFields) =>
    isNew && suggestedSources?.[field] ? `Suggested from ${suggestedSources[field]}.` : null;

  const select = (
    field: keyof BiddingProfileFields,
    label: string,
    options: CodeOption[],
    hint: React.ReactNode,
  ) => (
    <div>
      <Select
        id={`bp-${field}`}
        label={label}
        options={[NOT_SET, ...options]}
        value={(form[field] as string | null) ?? ""}
        disabled={disabled}
        onChange={(e) => set(field, (e.target.value || null) as never)}
      />
      <Hint>
        {hint}
        {source(field) && <> {source(field)}</>}
      </Hint>
    </div>
  );

  const text = (
    field: keyof BiddingProfileFields,
    label: string,
    maxLength: number,
    hint: React.ReactNode,
    opts: { upper?: boolean } = {},
  ) => (
    <div>
      <Input
        id={`bp-${field}`}
        label={label}
        maxLength={maxLength}
        value={(form[field] as string | null) ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const v = opts.upper ? e.target.value.toUpperCase() : e.target.value;
          set(field, (v === "" ? null : v) as never);
        }}
      />
      <Hint>
        {hint}
        {source(field) && <> {source(field)}</>}
      </Hint>
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">Bid Manager Settings</h1>
        <p className="text-muted mt-1">
          Your representations to DLA. Every new bid starts from these answers, and you can change
          them on an individual bid. Changing them here never alters a bid you have already started.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>
      )}
      {toast && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
          <p className="text-sm font-medium text-success">{toast}</p>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted">Loading bid profile…</div>
      ) : !cage ? (
        <div className="bg-card-bg rounded-xl border border-border p-6 text-sm text-muted">
          Your account has no CAGE code on file, so there is nothing to quote under yet. Contact
          support to add your CAGE.
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted">Quoting as CAGE</span>
            <span className="font-mono font-semibold text-foreground">{cage}</span>
            {isNew && (
              <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium">
                Not saved yet — review the suggested values below
              </span>
            )}
          </div>

          {!canEdit && (
            <div className="mb-6 p-4 bg-muted-light border border-border rounded-lg text-sm text-muted">
              Only a customer admin can change your company&apos;s bid profile.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <Section
              title="Business representations"
              description="Certifications about your company that DLA requires on every quote."
            >
              {select(
                "small_business_rep",
                "Small business and other contractor representation (013)",
                SMALL_BUSINESS_REP_OPTIONS,
                "Your size status for the items you quote. Not filled in from SAM: size is decided per NAICS code, so check it yourself.",
              )}
              {select(
                "joint_venture",
                "Joint venture (018)",
                JOINT_VENTURE_OPTIONS,
                "Only used on small-business set-asides, and only when you represent as B or M above. Leave unset otherwise.",
              )}
              {form.joint_venture === "JV" &&
                text(
                  "joint_venture_remarks",
                  "Joint venture participants (019)",
                  255,
                  "The CAGE codes and names of the companies in the joint venture.",
                )}
              {select(
                "affirmative_action",
                "Affirmative action compliance (021)",
                AFFIRMATIVE_ACTION_OPTIONS,
                "Whether you have an affirmative action program on file.",
              )}
              {select(
                "previous_contracts",
                "Previous contracts and compliance reports (022)",
                PREVIOUS_CONTRACTS_OPTIONS,
                "Whether you held earlier contracts subject to the Equal Opportunity clause and filed the reports.",
              )}
              {select(
                "alternate_disputes",
                "Alternate dispute resolution (023)",
                ALTERNATE_DISPUTES_OPTIONS,
                "Whether you agree to use ADR under DLAD 5452.233-9001.",
              )}
              {select(
                "child_labor_cert",
                "Child labor certification (120)",
                CHILD_LABOR_OPTIONS,
                "Whether your end products may have been made with forced or indentured child labor (FAR 52.222-18).",
              )}
            </Section>

            <div className="space-y-6">
              <Section title="Quote defaults" description="Starting values for new bids.">
                {select(
                  "payment_discount_terms",
                  "Prompt payment discount terms (025)",
                  PAYMENT_TERMS_OPTIONS,
                  "Discount offered for early payment.",
                )}
                <div>
                  <Input
                    id="bp-default_days_quote_valid"
                    label="Days your quote stays valid (027)"
                    type="number"
                    min={1}
                    max={999}
                    value={form.default_days_quote_valid ?? ""}
                    disabled={disabled}
                    onChange={(e) =>
                      set("default_days_quote_valid", e.target.value ? parseInt(e.target.value, 10) : null)
                    }
                  />
                  <Hint>
                    AIDC solicitations (type I) need at least 90; fewer makes the quote a Bid With
                    Exception.
                    {source("default_days_quote_valid") && <> {source("default_days_quote_valid")}</>}
                  </Hint>
                </div>
                <div>
                  <Input
                    id="bp-default_handling_days"
                    label="Handling days added to a vendor's lead time"
                    type="number"
                    min={0}
                    max={999}
                    value={form.default_handling_days ?? ""}
                    disabled={disabled}
                    onChange={(e) =>
                      set("default_handling_days", e.target.value ? parseInt(e.target.value, 10) : null)
                    }
                  />
                  <Hint>
                    When a bid starts from a priced RFQ, its delivery days are the vendor&apos;s lead time
                    plus these days. Not sent to DLA.
                  </Hint>
                </div>
                {select(
                  "boa_fss_bpa",
                  "Ordering agreement (029)",
                  BOA_FSS_BPA_OPTIONS,
                  "Whether you quote under a BOA, FSS or BPA.",
                )}
                {form.boa_fss_bpa && form.boa_fss_bpa !== "NAP" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {text("boa_contract_number", "Agreement number (030)", 17, "Required with an agreement.", {
                      upper: true,
                    })}
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Agreement expires (031)
                      </label>
                      <DateField
                        value={form.boa_expiration_date ?? ""}
                        onChange={(iso) => set("boa_expiration_date", iso || null)}
                        ariaLabel="Agreement expiration date"
                      />
                    </div>
                  </div>
                )}
              </Section>

              <Section
                title="FOB origin"
                description="Where you ship from. Used only when you quote FOB Origin; a solicitation's own FOB point is filled in automatically."
              >
                {text("fob_city", "City (033)", 30, "", { upper: true })}
                <div className="grid grid-cols-2 gap-4">
                  {select("fob_country", "Country (035)", geoOptions(geo?.countries ?? []), "")}
                  {(form.fob_country === "US" || form.fob_country === "CA")
                    ? select("fob_state", form.fob_country === "CA" ? "Province (034)" : "State (034)",
                        geoOptions(subdivisions(geo, form.fob_country)), "")
                    : <p className="text-xs text-muted self-end pb-2">No state or province outside the US and Canada.</p>}
                </div>
              </Section>

              <Section
                title="Place of inspection"
                description="Only needed when government inspection happens somewhere other than your own facility."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {text("inspection_packaging_cage", "Packaging inspection CAGE (037)", 5, "", { upper: true })}
                  {text("inspection_supplies_cage", "Supplies inspection CAGE (038)", 5, "", { upper: true })}
                </div>
              </Section>
            </div>

            {canEdit && (
              <div className="lg:col-span-2 flex justify-end">
                <Button
                  onClick={save}
                  disabled={saving}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto touch-manipulation"
                >
                  {saving ? "Saving…" : isNew ? "Save bid profile" : "Save changes"}
                </Button>
              </div>
            )}
          </div>

          {user && (
            <p className="mt-6 text-xs text-muted">
              Every change to this profile is recorded with who made it and when.
            </p>
          )}
        </>
      )}
    </div>
  );
}
