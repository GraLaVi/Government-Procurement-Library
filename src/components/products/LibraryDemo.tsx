"use client";

import { useMemo, useState, type FormEvent } from "react";
import { SearchBar, type SearchTypeOption } from "@/components/library/SearchBar";
import { PartsResultsList } from "@/components/library/PartsResultsList";
import { VendorResultsList } from "@/components/library/VendorResultsList";
import { DetailSections, type DetailSection } from "@/components/library/DetailSections";
import {
  EndUseDescriptionPanel,
  ManufacturersPanel,
  OverviewPanel,
  PackagingPanel,
  ProcurementItemDescriptionPanel,
  ProcurementPanel,
  SolicitationsPanel as PartSolicitationsPanel,
  TechnicalCharacteristicsPanel,
} from "@/components/library/PartDetail";
import {
  AwardsPanel,
  BookingsPanel,
  ContactsPanel,
  DemographicsPanel,
  SolicitationsPanel as VendorSolicitationsPanel,
} from "@/components/library/VendorDetail";
import { InventoryPanel } from "@/components/library/InventoryPanel";
import { RowBadge } from "@/components/library/RowBadge";
import { DemoSurface } from "@/components/products/DemoSurface";
import { PARTS_SEARCH_TYPE_CONFIGS, formatPartIdentity } from "@/lib/library/types";
import type { DemoLibraryData } from "@/lib/demo/library";

/**
 * The Parts & Vendor Library mock-up on /products/library.
 *
 * Both search screens and both records are the real components: the search
 * bar, the two results lists, the tab shell, and the detail panels the app
 * renders inside it — on a fixture instead of the API. Searching filters the
 * fixture rows in memory; a click opens the record; the tabs are the app's.
 */

type Mode = "parts" | "vendors";
type PartTab =
  | "overview" | "procurement" | "solicitations" | "manufacturers" | "inventory"
  | "technical" | "enduse" | "packaging" | "procurementitemdesc";
type VendorTab = "demographics" | "contacts" | "awards" | "bookings" | "solicitations";

const VENDOR_TYPES: readonly SearchTypeOption[] = [
  { value: "cage", label: "CAGE Code", description: "5-character CAGE" },
  { value: "uei", label: "UEI", description: "12-character SAM identifier" },
  { value: "entity_name", label: "Entity Name", description: "Legal or DBA name" },
];

interface DemoState {
  mode: Mode;
  partsType: string;
  partsQuery: string;
  vendorType: string;
  vendorQuery: string;
  partOpen: boolean;
  partTab: PartTab;
  vendorOpen: boolean;
  vendorTab: VendorTab;
}

interface Tour {
  id: string;
  chip: string;
  caption: string;
  apply: (s: DemoState) => DemoState;
}

const BASELINE: DemoState = {
  mode: "parts", partsType: "description", partsQuery: "valve", vendorType: "cage", vendorQuery: "7Z016",
  partOpen: false, partTab: "overview", vendorOpen: false, vendorTab: "demographics",
};

const TOURS: Tour[] = [
  {
    id: "search",
    chip: "Find a part",
    caption:
      "Search by NSN or NIIN, solicitation number, manufacturer part number, contract number, or a plain description. Results carry an In stock pill when another supplier has shared live stock for the part, and My stock when you have.",
    apply: () => BASELINE,
  },
  {
    id: "record",
    chip: "Open the record",
    caption:
      "The Overview is the same on every plan: identifiers, unit of issue, the government's standard price, and the four codes that decide how DLA buys the part — each one explained on hover, because a 'P' in the buy-type column means an approved-source item and that changes your bid.",
    apply: () => ({ ...BASELINE, partOpen: true, partTab: "overview" }),
  },
  {
    id: "makers",
    chip: "Who else makes it",
    caption:
      "Every manufacturer on the item, with the part number they make it under, whether they are an approved source, and their SAM registration status. From here the RFQ add-on sends them a request in one click.",
    apply: () => ({ ...BASELINE, partOpen: true, partTab: "manufacturers" }),
  },
  {
    id: "awards",
    chip: "What it sold for",
    caption:
      "Procurement history is the award record for the part: contract, date, who won it, quantity and unit price. This is where a winning price comes from before you write your own — an Advanced-plan tab.",
    apply: () => ({ ...BASELINE, partOpen: true, partTab: "procurement" }),
  },
  {
    id: "open",
    chip: "What's open on it",
    caption:
      "Every open and recently closed solicitation for the part: close date, set-aside, quantity, estimated value, the buyer and how to reach them. The number opens the PDF in the app, and the Amended pill opens the change history — an Advanced-plan tab.",
    apply: () => ({ ...BASELINE, partOpen: true, partTab: "solicitations" }),
  },
  {
    id: "vendor",
    chip: "Look up a competitor",
    caption:
      "Any CAGE, UEI or company name resolves to a vendor profile built from SAM: registration and exclusion status, business type, certifications, addresses. The first check before you partner with anyone, and the first look at anyone beating you.",
    apply: () => ({ ...BASELINE, mode: "vendors", vendorOpen: true, vendorTab: "demographics" }),
  },
  {
    id: "wins",
    chip: "What they've been winning",
    caption:
      "A vendor's recent awards, newest first, with the NSN, quantity and unit price on each. Read a competitor's here and you know what they quote and how often they win it.",
    apply: () => ({ ...BASELINE, mode: "vendors", vendorOpen: true, vendorTab: "awards" }),
  },
  {
    id: "booked",
    chip: "Their thirteen months",
    caption:
      "Contracts Booked is the vendor's award dollars by DLA distribution center, month by month, with their rank at each center — a number four at Columbus in March was the fourth-largest recipient there that month. The fastest read on a competitor's scale there is.",
    apply: () => ({ ...BASELINE, mode: "vendors", vendorOpen: true, vendorTab: "bookings" }),
  },
];

const noop = () => undefined;

export function LibraryDemo({ data }: { data: DemoLibraryData }) {
  const [activeTour, setActiveTour] = useState<string | null>(TOURS[0].id);
  const [state, setState] = useState<DemoState>(BASELINE);
  // What the results list shows: the last SUBMITTED search, not the live
  // input — the app searches on submit too.
  const [applied, setApplied] = useState<{ type: string; query: string }>({ type: BASELINE.partsType, query: BASELINE.partsQuery });

  const clearTour = () => setActiveTour(null);
  const set = (patch: Partial<DemoState>) => { clearTour(); setState((s) => ({ ...s, ...patch })); };

  const parts = useMemo(() => {
    const q = applied.query.trim().toLowerCase();
    if (!q) return data.parts;
    const digits = q.replace(/[^0-9]/g, "");
    return data.parts.filter((p) => {
      if (applied.type === "nsn_niin" && digits) return p.nsn.includes(digits);
      if (applied.type === "description") return (p.description ?? "").toLowerCase().includes(q);
      return true;
    });
  }, [data.parts, applied]);

  const onPartsSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearTour();
    setApplied({ type: state.partsType, query: state.partsQuery });
    setState((s) => ({ ...s, partOpen: false }));
  };

  const part = data.part;
  const partSections: DetailSection[] = [
    {
      id: "overview",
      label: "Overview",
      content: <OverviewPanel part={part.detail} codeDefinitions={part.codeDefinitions} codeTypeNames={part.codeTypeNames} />,
    },
    {
      id: "procurement",
      label: `Procurement History (${part.procurementTotal})`,
      content: <ProcurementPanel records={part.procurement} totalCount={part.procurementTotal} isLoading={false} error={null} onRetry={noop} />,
    },
    {
      id: "solicitations",
      label: `Solicitations (${part.solicitationsTotal})`,
      content: <PartSolicitationsPanel solicitations={part.solicitations} totalCount={part.solicitationsTotal} isLoading={false} error={null} onRetry={noop} />,
    },
    {
      id: "manufacturers",
      label: `Manufacturers (${part.manufacturers.length})`,
      content: (
        <ManufacturersPanel
          nsn={part.detail.nsn}
          partId={part.detail.id}
          partDescription={part.detail.description}
          manufacturers={part.manufacturers}
          totalCount={part.manufacturers.length}
          isLoading={false}
          error={null}
          onRetry={noop}
        />
      ),
    },
    {
      id: "inventory",
      label: `Supplier Stock (${part.inventory.my_stock.length + (part.inventory.network_stock?.length ?? 0)})`,
      content: <InventoryPanel inventory={part.inventory} isLoading={false} error={null} onRetry={noop} />,
    },
    {
      id: "technical",
      label: `Characteristics (${part.technical.length})`,
      content: <TechnicalCharacteristicsPanel characteristics={part.technical} totalCount={part.technical.length} isLoading={false} error={null} onRetry={noop} />,
    },
    {
      id: "enduse",
      label: `End Use (${part.endUseTotal})`,
      content: <EndUseDescriptionPanel descriptions={part.endUse} totalCount={part.endUseTotal} isLoading={false} error={null} onRetry={noop} />,
    },
    {
      id: "packaging",
      label: "Packaging (1)",
      content: (
        <PackagingPanel
          packaging={part.packaging}
          codeDefinitions={part.packagingCodeDefinitions}
          markingDefinitions={part.packagingMarkingDefinitions}
          supplemental={part.packagingSupplemental}
          isLoading={false}
          error={null}
          onRetry={noop}
        />
      ),
    },
    {
      id: "procurementitemdesc",
      label: `Procurement Item Description (${part.procurementItemDescription.has_description ? 1 : 0})`,
      content: <ProcurementItemDescriptionPanel description={part.procurementItemDescription} isLoading={false} error={null} onRetry={noop} />,
    },
  ];

  const vendor = data.vendor.detail;
  const vendorSections: DetailSection[] = [
    {
      id: "demographics",
      label: "Demographics",
      content: (
        <DemographicsPanel
          vendor={vendor}
          physicalAddress={vendor.addresses.find((a) => a.address_type === "physical")}
          mailingAddress={vendor.addresses.find((a) => a.address_type === "mailing")}
        />
      ),
    },
    {
      id: "contacts",
      label: vendor.contacts.length ? `Contacts (${vendor.contacts.length})` : "Contacts",
      content: <ContactsPanel contacts={vendor.contacts} />,
    },
    {
      id: "awards",
      label: `Recent Awards (${data.vendor.awardsTotal})`,
      content: <AwardsPanel awards={data.vendor.awards} totalCount={data.vendor.awardsTotal} isLoading={false} error={null} onRetry={noop} />,
    },
    {
      id: "bookings",
      label: "Contracts Booked (13mo)",
      content: <BookingsPanel months={data.vendor.bookings.months} totals={data.vendor.bookings.totals} isLoading={false} error={null} onRetry={noop} />,
    },
    {
      id: "solicitations",
      label: `Open Solicitations (${data.vendor.solicitationsTotal})`,
      content: <VendorSolicitationsPanel solicitations={data.vendor.solicitations} totalCount={data.vendor.solicitationsTotal} isLoading={false} error={null} onRetry={noop} />,
    },
  ];

  const backButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-card-foreground hover:border-primary/50 hover:text-primary"
    >
      ← {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Show me</span>
        {TOURS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setActiveTour(t.id); setState((s) => t.apply(s)); setApplied({ type: BASELINE.partsType, query: BASELINE.partsQuery }); }}
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

      {/* Four things in these panels open something backed by a fetch: award
          and solicitation PDF viewers, the amendment timeline behind an
          Amended pill, and a SAM opportunity's document list. has_pdf is
          false on every fixture row, so the PDF buttons never render; the
          other two are gated here by their titles. */}
      <DemoSurface
        gateSelector={[
          'button[title="View award PDF"]',
          'button[title^="Open solicitation"]',
          'button[title="View solicitation PDF"]',
          'button[title*="amendment"]',
          'button[title$="documents"]',
          'button[title$="1 document"]',
        ].join(", ")}
      >
        <div className="rounded-xl border border-border bg-muted-light/40 p-3 dark:bg-background/40 sm:p-4 lg:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-card-bg p-0.5 text-sm">
              {(["parts", "vendors"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set({ mode: m })}
                  aria-pressed={state.mode === m}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                    state.mode === m ? "bg-primary text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  {m === "parts" ? "Parts Search" : "Vendor Search"}
                </button>
              ))}
            </div>
            <span className="shrink-0 rounded-full border border-border bg-card-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Real catalog data
            </span>
          </div>

          {state.mode === "parts" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card-bg p-4">
                <SearchBar
                  types={PARTS_SEARCH_TYPE_CONFIGS}
                  type={state.partsType}
                  onTypeChange={(v) => set({ partsType: v })}
                  query={state.partsQuery}
                  onQueryChange={(v) => set({ partsQuery: v })}
                  onSubmit={onPartsSubmit}
                  placeholder={PARTS_SEARCH_TYPE_CONFIGS.find((c) => c.value === state.partsType)?.placeholder}
                  isSearching={false}
                  typeLabel="Search parts by"
                />
                <p className="mt-2 text-[11px] text-muted">
                  This mock-up searches its sample rows. Try a description like &ldquo;valve&rdquo; or &ldquo;breaker&rdquo;, or an NSN like 4820-01-317-9684.
                </p>
              </div>

              {state.partOpen ? (
                <div>
                  {backButton("Back to results", () => set({ partOpen: false }))}
                  <div className="rounded-lg border border-border bg-card-bg">
                    <div className="border-b border-border px-4 py-3">
                      <div className="font-mono text-lg font-bold text-foreground">{formatPartIdentity(data.part.detail)}</div>
                      <div className="text-sm text-muted">{data.part.detail.description}</div>
                    </div>
                    <DetailSections
                      layout="tabs"
                      sections={partSections}
                      activeTab={state.partTab}
                      onTabChange={(id) => set({ partTab: id as PartTab })}
                    />
                  </div>
                </div>
              ) : (
                <PartsResultsList
                  results={parts}
                  total={parts.length}
                  onSelect={(key) => {
                    const hit = parts.find((p) => p.nsn === key || `ID-${p.id}` === key);
                    if (hit && hit.id === data.part.detail.id) set({ partOpen: true, partTab: "overview" });
                    else set({ partOpen: true, partTab: "overview" });
                  }}
                  tier="advanced"
                  availability={data.availability}
                />
              )}
              {!state.partOpen && (
                <p className="text-[11px] text-muted">
                  Every row opens the same sample record — the check valve — so the mock-up stays honest about which data is real.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card-bg p-4">
                <SearchBar
                  types={VENDOR_TYPES}
                  type={state.vendorType}
                  onTypeChange={(v) => set({ vendorType: v })}
                  query={state.vendorQuery}
                  onQueryChange={(v) => set({ vendorQuery: v })}
                  onSubmit={(e) => { e.preventDefault(); set({ vendorOpen: false }); }}
                  placeholder="Enter a CAGE code, UEI or company name"
                  isSearching={false}
                  typeLabel="Search vendors by"
                />
              </div>

              {state.vendorOpen ? (
                <div>
                  {backButton("Back to results", () => set({ vendorOpen: false }))}
                  <div className="rounded-lg border border-border bg-card-bg">
                    <div className="border-b border-border px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-bold text-foreground">{vendor.legal_business_name}</h4>
                        <RowBadge tone="green">Active</RowBadge>
                        {vendor.small_business && <RowBadge tone="sky">SB</RowBadge>}
                      </div>
                      <div className="font-mono text-xs text-muted">CAGE {vendor.cage_code}{vendor.uei ? ` · UEI ${vendor.uei}` : ""}</div>
                    </div>
                    <DetailSections
                      layout="tabs"
                      sections={vendorSections}
                      activeTab={state.vendorTab}
                      onTabChange={(id) => set({ vendorTab: id as VendorTab })}
                    />
                  </div>
                </div>
              ) : (
                <VendorResultsList
                  results={data.vendors}
                  total={data.vendors.length}
                  onSelect={() => set({ vendorOpen: true, vendorTab: "demographics" })}
                  tier="advanced"
                />
              )}
            </div>
          )}
        </div>
      </DemoSurface>

      <p className="text-xs text-muted">
        The part record and the vendor record — every tab of both — are real
        public data, pulled the way the app pulls them. Only the supplier
        stock, on the search results and on the Supplier Stock tab, is authored.
      </p>
    </div>
  );
}
