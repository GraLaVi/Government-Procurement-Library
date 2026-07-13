"use client";

// ============================================================================
// Typography Standards - Applied consistently across all tabs
// ============================================================================
// These classes should be used consistently throughout the component:
// - Labels: "text-xs text-muted font-medium"
// - Values (regular): "text-xs font-medium text-foreground"
// - Values (monospace/codes): "text-xs font-mono font-semibold"
// - Table cells: "text-xs" (base size for all table content)
// - Count/status text: "text-xs text-muted"
// - Loading/error messages: "text-xs text-muted" or "text-xs text-error"
// - Empty states: "text-xs text-muted"
// ============================================================================
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  VendorDetail as VendorDetailType,
  VendorAward,
  VendorAwardsResponse,
  VendorBookingMonth,
  VendorBookingTotals,
  VendorBookingsResponse,
  VendorSolicitation,
  VendorSolicitationsResponse,
  VendorTabCounts,
  formatFiscalYearEnd,
  formatSamStatus,
  formatContactType,
  formatNiin,
  formatCurrency,
  formatNumber,
  formatAwardDate,
} from "@/lib/library/types";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { resolveVendorTier, tierMeets } from "@/lib/library/tier";
import { ExportCsvButton, CustomReportLink, type CsvColumn } from "@/components/library/ExportCsvButton";
import { useAmendmentSummaries } from "@/lib/hooks/useAmendmentSummaries";
import { AmendmentTimelineModal } from "@/components/bidmatching/AmendmentTimelineModal";
import { SamDocumentsButton } from "@/components/library/SamDocumentsButton";

// DoD PIID formatter: many SAM.gov solicitation numbers arrive without the
// canonical dashes (e.g. "FA821326R3048"). When a value has no dashes AND matches
// the PIID shape — 6-char office code, 2-digit fiscal year, 1-letter instrument
// type, then a serial — insert dashes ("FA8213-26-R-3048"). Anything already
// dashed, or that doesn't match the shape, is returned unchanged.
const PIID_PATTERN = /^([A-Z][A-Z0-9]{5})(\d{2})([A-Z])([A-Z0-9]{3,})$/;
function formatSolicitationNumber(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.includes("-")) return value;
  const m = PIID_PATTERN.exec(value);
  return m ? `${m[1]}-${m[2]}-${m[3]}-${m[4]}` : value;
}

// Module-scope CSV column specs for the vendor-detail tab exports.
// Kept outside the component bodies so the parent-level export button
// (rendered next to the tab strip) can reach them without prop-drilling
// the column lists.
const AWARDS_CSV_COLUMNS: CsvColumn<VendorAward>[] = [
  { header: "Award Date", value: (r) => r.award_date },
  { header: "Contract #", value: (r) => r.contract_number ?? "" },
  { header: "PR #", value: (r) => r.pr_number ?? "" },
  { header: "NIIN", value: (r) => r.niin ?? "" },
  { header: "FSC", value: (r) => r.fsc ?? "" },
  { header: "Description", value: (r) => r.description ?? "" },
  { header: "Qty", value: (r) => r.award_quantity ?? "" },
  { header: "Unit Price", value: (r) => r.unit_price ?? "" },
  { header: "Total Value", value: (r) => r.total_value ?? "" },
  { header: "Agency", value: (r) => r.agency_code ?? "" },
];

const BOOKINGS_CSV_COLUMNS: CsvColumn<VendorBookingMonth>[] = [
  { header: "Month", value: (r) => r.month_label },
  { header: "DSCP Booked", value: (r) => r.dscp_booked },
  { header: "DSCP Rank", value: (r) => r.dscp_rank ?? "" },
  { header: "DSCR Booked", value: (r) => r.dscr_booked },
  { header: "DSCR Rank", value: (r) => r.dscr_rank ?? "" },
  { header: "DSCC Booked", value: (r) => r.dscc_booked },
  { header: "DSCC Rank", value: (r) => r.dscc_rank ?? "" },
  { header: "Other Booked", value: (r) => r.other_booked },
  { header: "Other Rank", value: (r) => r.other_rank ?? "" },
  { header: "Month Total", value: (r) => r.month_total },
];

const VENDOR_SOLICITATIONS_CSV_COLUMNS: CsvColumn<VendorSolicitation>[] = [
  { header: "Source", value: (r) => r.source ?? "DLA" },
  { header: "Close Date", value: (r) => r.close_date ?? "" },
  { header: "Solicitation #", value: (r) => formatSolicitationNumber(r.solicitation_number) },
  { header: "Notice Type", value: (r) => r.notice_type ?? "" },
  { header: "Status", value: (r) => r.status },
  { header: "Agency", value: (r) => r.agency_code ?? "" },
  { header: "NIIN", value: (r) => r.niin ?? "" },
  { header: "FSC", value: (r) => r.fsc ?? "" },
  // SAM rows carry their matched NSNs in `nsns`; DLA rows have a single NSN in
  // the niin/fsc fields. Emit a combined, semicolon-separated NSN list so the
  // CSV is complete for both.
  {
    header: "NSNs",
    value: (r) =>
      r.nsns && r.nsns.length
        ? r.nsns
            .map((n) => (n.fsc && n.niin ? `${n.fsc}-${n.niin}` : n.niin ?? ""))
            .filter(Boolean)
            .join("; ")
        : r.fsc && r.niin
          ? `${r.fsc}-${r.niin}`
          : r.niin ?? "",
  },
  { header: "Description", value: (r) => r.description ?? "" },
  { header: "Qty", value: (r) => r.quantity ?? "" },
  { header: "Unit Price", value: (r) => r.unit_price ?? "" },
  { header: "Estimated Value", value: (r) => r.estimated_value ?? "" },
  { header: "Set-Aside", value: (r) => r.set_aside_label ?? r.set_aside ?? "" },
];

interface VendorDetailProps {
  vendor: VendorDetailType;
  prefetchedTabCounts?: VendorTabCounts;
}

type TabId = "demographics" | "contacts" | "awards" | "bookings" | "solicitations";

export function VendorDetail({ vendor, prefetchedTabCounts }: VendorDetailProps) {
  const { hasAnyProductAccess } = useAuth();
  const tier = resolveVendorTier(hasAnyProductAccess);

  const [activeTab, setActiveTab] = useState<TabId>("demographics");

  // Awards state
  const [awards, setAwards] = useState<VendorAward[]>([]);
  const [awardsTotal, setAwardsTotal] = useState(0);
  const [isLoadingAwards, setIsLoadingAwards] = useState(false);
  const [awardsError, setAwardsError] = useState<string | null>(null);
  const [awardsFetched, setAwardsFetched] = useState(false);

  // Bookings state
  const [bookingMonths, setBookingMonths] = useState<VendorBookingMonth[]>([]);
  const [bookingTotals, setBookingTotals] = useState<VendorBookingTotals | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingsFetched, setBookingsFetched] = useState(false);

  // Solicitations state
  const [solicitations, setSolicitations] = useState<VendorSolicitation[]>([]);
  const [solicitationsTotal, setSolicitationsTotal] = useState(0);
  const [isLoadingSolicitations, setIsLoadingSolicitations] = useState(false);
  const [solicitationsError, setSolicitationsError] = useState<string | null>(null);
  const [solicitationsFetched, setSolicitationsFetched] = useState(false);

  // Tab counts state (fetched eagerly for tab labels, or provided via prefetch)
  const [tabCounts, setTabCounts] = useState<VendorTabCounts | null>(prefetchedTabCounts ?? null);

  useEffect(() => {
    // Skip fetch if prefetched data was provided
    if (prefetchedTabCounts) {
      setTabCounts(prefetchedTabCounts);
      return;
    }
    if (!vendor?.cage_code) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/library/vendor/${encodeURIComponent(vendor.cage_code)}/tab-counts`
        );
        if (!cancelled && response.ok) {
          const data = (await response.json()) as VendorTabCounts;
          setTabCounts(data);
        }
      } catch {
        // Counts are best-effort; tabs still work without them
      }
    })();

    return () => { cancelled = true; };
  }, [vendor?.cage_code, prefetchedTabCounts]);

  // Get physical address
  const physicalAddress = vendor.addresses?.find((a) => a.address_type === "physical");
  const mailingAddress = vendor.addresses?.find((a) => a.address_type === "mailing");

  // Check if there are contacts available
  const hasContacts = vendor.contacts && vendor.contacts.length > 0;
  const contactCount = vendor.contacts?.length || 0;

  // Fetch awards when tab is clicked (lazy loading)
  const fetchAwards = useCallback(async () => {
    if (awardsFetched || isLoadingAwards) return;

    setIsLoadingAwards(true);
    setAwardsError(null);

    try {
      const response = await fetch(`/api/library/vendor/${encodeURIComponent(vendor.cage_code)}/awards?limit=50`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load awards');
      }

      const awardsResponse = data as VendorAwardsResponse;
      setAwards(awardsResponse.awards);
      setAwardsTotal(awardsResponse.total_count);
      setAwardsFetched(true);
    } catch (error) {
      console.error('Awards fetch error:', error);
      setAwardsError(error instanceof Error ? error.message : 'Failed to load awards');
    } finally {
      setIsLoadingAwards(false);
    }
  }, [vendor.cage_code, awardsFetched, isLoadingAwards]);

  // Fetch bookings when tab is clicked (lazy loading)
  const fetchBookings = useCallback(async () => {
    if (bookingsFetched || isLoadingBookings) return;

    setIsLoadingBookings(true);
    setBookingsError(null);

    try {
      const response = await fetch(`/api/library/vendor/${encodeURIComponent(vendor.cage_code)}/bookings`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load bookings');
      }

      const bookingsResponse = data as VendorBookingsResponse;
      setBookingMonths(bookingsResponse.months);
      setBookingTotals(bookingsResponse.totals);
      setBookingsFetched(true);
    } catch (error) {
      console.error('Bookings fetch error:', error);
      setBookingsError(error instanceof Error ? error.message : 'Failed to load bookings');
    } finally {
      setIsLoadingBookings(false);
    }
  }, [vendor.cage_code, bookingsFetched, isLoadingBookings]);

  // Fetch solicitations when tab is clicked (lazy loading)
  const fetchSolicitations = useCallback(async () => {
    if (solicitationsFetched || isLoadingSolicitations) return;

    setIsLoadingSolicitations(true);
    setSolicitationsError(null);

    try {
      const response = await fetch(`/api/library/vendor/${encodeURIComponent(vendor.cage_code)}/solicitations`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load solicitations');
      }

      const solicitationsResponse = data as VendorSolicitationsResponse;
      setSolicitations(solicitationsResponse.solicitations);
      setSolicitationsTotal(solicitationsResponse.total_count);
      setSolicitationsFetched(true);
    } catch (error) {
      console.error('Solicitations fetch error:', error);
      setSolicitationsError(error instanceof Error ? error.message : 'Failed to load solicitations');
    } finally {
      setIsLoadingSolicitations(false);
    }
  }, [vendor.cage_code, solicitationsFetched, isLoadingSolicitations]);

  // Map UI tabId -> audit `view` name (matches FastAPI _VALID_VENDOR_TAB_VIEWS)
  const TAB_VIEW_MAP: Record<string, string> = {
    demographics: 'detail',
    contacts: 'detail',
    awards: 'awards',
    bookings: 'bookings',
    solicitations: 'solicitations',
  };

  // Handle tab change with lazy loading
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as TabId);

    // Record user intent (fire-and-forget; don't block UI on audit).
    const view = TAB_VIEW_MAP[tabId];
    if (view && vendor?.cage_code) {
      fetch(`/api/library/vendor/${encodeURIComponent(vendor.cage_code)}/track-view?view=${view}`, {
        method: 'POST',
      }).catch(() => { /* audit must never break UX */ });
    }

    if (tabId === 'awards' && !awardsFetched) {
      fetchAwards();
    } else if (tabId === 'bookings' && !bookingsFetched) {
      fetchBookings();
    } else if (tabId === 'solicitations' && !solicitationsFetched) {
      fetchSolicitations();
    }
  }, [vendor?.cage_code, awardsFetched, fetchAwards, bookingsFetched, fetchBookings, solicitationsFetched, fetchSolicitations]);

  // Build tabs dynamically with counts in parenthesis for better readability.
  // Prefer the eagerly-fetched tabCounts; fall back to data-fetched totals once loaded.
  const awardsLabel = awardsFetched
    ? `Recent Awards (${awardsTotal})`
    : tabCounts
      ? `Recent Awards (${tabCounts.awards_count})`
      : "Recent Awards";

  const bookingsLabel = bookingsFetched
    ? `Contracts Booked (${bookingMonths.length}mo)`
    : tabCounts
      ? `Contracts Booked (${tabCounts.bookings_count}mo)`
      : "Contracts Booked";

  const solicitationsLabel = solicitationsFetched
    ? `Open Solicitations (${solicitationsTotal})`
    : tabCounts
      ? `Open Solicitations (${tabCounts.solicitations_count})`
      : "Open Solicitations";

  // `minTier`:
  //   free     → Demographics + Contacts (lightweight; no count joins)
  //   basic    → adds Awards
  //   advanced → adds Bookings and Solicitations
  const allTabs: Array<{ id: TabId; label: string; disabled: boolean; minTier: "free" | "basic" | "advanced" }> = [
    { id: "demographics", label: "Demographics", disabled: false, minTier: "free" },
    {
      id: "contacts",
      label: hasContacts ? `Contacts (${contactCount})` : "Contacts",
      disabled: false,
      minTier: "free",
    },
    { id: "awards", label: awardsLabel, disabled: false, minTier: "basic" },
    { id: "bookings", label: bookingsLabel, disabled: false, minTier: "advanced" },
    { id: "solicitations", label: solicitationsLabel, disabled: false, minTier: "advanced" },
  ];
  const tabs = allTabs.filter((t) => tierMeets(tier, t.minTier));

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab("demographics");
    }
  }, [tier, activeTab, tabs]);

  return (
    <div className="bg-card-bg rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted-light">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold text-foreground truncate">
              {vendor.legal_business_name || "Unknown Vendor"}
            </h2>
            {vendor.dba_name && vendor.dba_name !== vendor.legal_business_name && (
              <p className="text-xs text-muted truncate">DBA: {vendor.dba_name}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {vendor.sam_status && (
              <Badge variant={formatSamStatus(vendor.sam_status) === "Active" ? "success" : "warning"} size="sm">
                {formatSamStatus(vendor.sam_status)}
              </Badge>
            )}
            {vendor.exclusion_status && (
              <Badge variant="error" size="sm">Excluded</Badge>
            )}
            {vendor.small_business && (
              <Badge variant="info" size="sm">SB</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs — paired with a right-side export button so the action
          sits inline with the tab labels and doesn't push the table
          content down. Only the awards and solicitations tabs export
          today; other tabs render nothing on the right. */}
      <div className="px-4 pt-3 flex items-end justify-between gap-3">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        {activeTab === "awards" && (
          <ExportCsvButton
            tier={tier}
            rows={awards}
            columns={AWARDS_CSV_COLUMNS}
            filename={`vendor-awards-${vendor.cage_code}`}
            compact
          />
        )}
        {activeTab === "bookings" && (
          <ExportCsvButton
            tier={tier}
            rows={bookingMonths}
            columns={BOOKINGS_CSV_COLUMNS}
            filename={`vendor-bookings-${vendor.cage_code}`}
            compact
          />
        )}
        {activeTab === "solicitations" && (
          <ExportCsvButton
            tier={tier}
            rows={solicitations}
            columns={VENDOR_SOLICITATIONS_CSV_COLUMNS}
            filename={`vendor-solicitations-${vendor.cage_code}`}
            compact
          />
        )}
      </div>

      {/* Tab Panels */}
      <div className="p-3">
        <TabPanel tabId="demographics" activeTab={activeTab}>
          <DemographicsPanel
            vendor={vendor}
            physicalAddress={physicalAddress}
            mailingAddress={mailingAddress}
          />
        </TabPanel>

        <TabPanel tabId="contacts" activeTab={activeTab}>
          <ContactsPanel contacts={vendor.contacts || []} />
        </TabPanel>

        <TabPanel tabId="awards" activeTab={activeTab}>
          <AwardsPanel
            awards={awards}
            totalCount={awardsTotal}
            isLoading={isLoadingAwards}
            error={awardsError}
            onRetry={fetchAwards}
          />
        </TabPanel>

        <TabPanel tabId="bookings" activeTab={activeTab}>
          <BookingsPanel
            months={bookingMonths}
            totals={bookingTotals}
            isLoading={isLoadingBookings}
            error={bookingsError}
            onRetry={fetchBookings}
          />
        </TabPanel>

        <TabPanel tabId="solicitations" activeTab={activeTab}>
          <SolicitationsPanel
            solicitations={solicitations}
            totalCount={solicitationsTotal}
            isLoading={isLoadingSolicitations}
            error={solicitationsError}
            onRetry={fetchSolicitations}
          />
        </TabPanel>
      </div>
    </div>
  );
}

interface DemographicsPanelProps {
  vendor: VendorDetailType;
  physicalAddress?: VendorDetailType["addresses"][0];
  mailingAddress?: VendorDetailType["addresses"][0];
}

function DemographicsPanel({
  vendor,
  physicalAddress,
  mailingAddress,
}: DemographicsPanelProps) {
  // Build data rows, filtering out empty values. CAGE + UEI live in the hero
  // card; the legacy DUNS/DoDAAC identifiers fold into Business Details.
  const businessInfo = [
    { label: "Entity Structure", value: vendor.entity_structure },
    { label: "Website", value: vendor.entity_url, isLink: true },
    { label: "State of Inc.", value: vendor.state_of_incorporation },
    { label: "Country of Inc.", value: vendor.country_of_incorporation },
    { label: "Business Type", value: vendor.entity_description },
    { label: "DUNS", value: vendor.duns },
    { label: "DoDAAC", value: vendor.dodaac },
  ].filter(item => item.value);

  const hasCertifications = !!(vendor.certifications && vendor.certifications.length > 0);

  const registration = [
    { label: "SAM Status", value: formatSamStatus(vendor.sam_status) },
    { label: "Exclusion", value: vendor.exclusion_status ? "Excluded" : "Not Excluded" },
    { label: "Reg. Expires", value: vendor.registration_expiration_date },
  ].filter(item => item.value);

  // Format the address for display
  const formatAddress = (address: VendorDetailType["addresses"][0] | undefined) => {
    if (!address) return null;
    return [
      address.address_line_1,
      address.address_line_2,
      [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
      address.country_code !== "USA" ? address.country_code : null,
    ].filter(Boolean).join("\n");
  };

  return (
    <div className="space-y-4">
      {/* Hero Card - Company Name */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/15">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m2.25-18h15.75m-15.75 0v3.75M21 12H10.5m10.5 4.5H10.5M21 18H10.5m-7.5-6.75V12m0 4.5v1.5m0-6V9.75A2.25 2.25 0 019 7.5h1.5A2.25 2.25 0 0112.75 9.75V12m-3.75 3.75V18A2.25 2.25 0 009 20.25H7.5A2.25 2.25 0 015.25 18v-2.25" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-semibold text-foreground mb-2 leading-tight">
              {vendor.legal_business_name}
            </h2>
            {vendor.dba_name && vendor.dba_name !== vendor.legal_business_name && (
              <div className="mb-2">
                <span className="text-xs text-muted">DBA: </span>
                <span className="text-xs font-medium text-foreground">{vendor.dba_name}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted">CAGE</span>
                <span className="font-mono font-medium text-primary">{vendor.cage_code}</span>
              </div>
              {vendor.uei && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted">UEI</span>
                  <span className="font-mono font-medium text-primary">{vendor.uei}</span>
                </div>
              )}
              {vendor.small_business === true && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                  <span className="text-success font-medium">Small Business</span>
                </div>
              )}
              {vendor.sam_status && (
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${vendor.sam_status === 'Active' ? 'bg-success' : 'bg-warning'}`}></div>
                  <span className="text-muted font-medium">{formatSamStatus(vendor.sam_status)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Information Cards Grid — 2 cards fill the row at half-width each;
          when certifications exist, expand to 3 columns to make room. */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${hasCertifications ? "xl:grid-cols-3" : ""}`}>
        {/* Business Information Card */}
        <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted-light border-b border-border">
            <h3 className="text-xs font-medium text-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
              </svg>
              Business Details
            </h3>
          </div>
          <div className="p-3 space-y-2">
            {businessInfo.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted font-medium">{item.label}</span>
                {item.isLink && item.value ? (
                  <a
                    href={item.value.startsWith("http") ? item.value : `https://${item.value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:text-primary/80 hover:underline font-medium text-right max-w-[220px] break-words"
                  >
                    {item.value}
                  </a>
                ) : (
                  <span className="text-xs font-medium text-foreground text-right max-w-[220px] break-words">
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Registration & Status Card */}
        <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted-light border-b border-border">
            <h3 className="text-xs font-medium text-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
              Registration
            </h3>
          </div>
          <div className="p-3 space-y-2">
            {registration.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted font-medium">{item.label}</span>
                <span className={`text-xs font-medium ${
                  item.label === "SAM Status" && item.value === "Active" ? "text-success" :
                  item.label === "Exclusion" && item.value === "Excluded" ? "text-error" :
                  "text-foreground"
                }`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications & Set-Asides Card (customer-published, not from SAM) */}
        {hasCertifications && (
          <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted-light border-b border-border">
              <h3 className="text-xs font-medium text-foreground flex items-center gap-2">
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Certifications &amp; Set-Asides
              </h3>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {vendor.certifications!.map((cert, i) => (
                <span
                  key={`${cert.kind}-${cert.label}-${i}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                  title={[cert.value, cert.expires_date ? `Expires ${cert.expires_date}` : null].filter(Boolean).join(" • ") || undefined}
                >
                  {cert.label}
                  {cert.kind === "set_aside" && (
                    <span className="text-[10px] uppercase tracking-wide text-primary/70">set-aside</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Address Section */}
      {(physicalAddress || mailingAddress) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {physicalAddress && (
            <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted-light border-b border-border">
                <h3 className="text-xs font-medium text-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  Physical Address
                </h3>
              </div>
              <div className="p-3">
                <AddressDisplay address={physicalAddress} />
              </div>
            </div>
          )}

          {mailingAddress && mailingAddress !== physicalAddress && (
            <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted-light border-b border-border">
                <h3 className="text-xs font-medium text-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  Mailing Address
                </h3>
              </div>
              <div className="p-3">
                <AddressDisplay address={mailingAddress} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AddressDisplayProps {
  address: VendorDetailType["addresses"][0];
}

function AddressDisplay({ address }: AddressDisplayProps) {
  const lines = [
    address.address_line_1,
    address.address_line_2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
    address.country_code !== "USA" ? address.country_code : null,
  ].filter(Boolean);

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => (
        <p key={i} className="text-xs text-foreground">
          {line}
        </p>
      ))}
      {address.congressional_district && (
        <p className="text-[10px] text-muted mt-1">
          Congressional District: {address.congressional_district}
        </p>
      )}
    </div>
  );
}

interface ContactDisplayProps {
  contact: VendorDetailType["contacts"][0];
}

function ContactDisplay({ contact }: ContactDisplayProps) {
  const fullName = [contact.first_name, contact.middle_initial, contact.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1">
      {fullName && (
        <p className="text-xs font-medium text-foreground">{fullName}</p>
      )}
      {contact.title && (
        <p className="text-xs text-muted">{contact.title}</p>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        {contact.phone && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {contact.phone}
          </span>
        )}
        {contact.fax && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {contact.fax}
          </span>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {contact.email}
          </a>
        )}
      </div>
    </div>
  );
}

interface ContactsPanelProps {
  contacts: VendorDetailType["contacts"];
}

function ContactsPanel({ contacts }: ContactsPanelProps) {
  if (!contacts || contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg
          className="w-10 h-10 text-muted/50 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="text-xs font-medium text-foreground mb-1">No Contacts Available</h3>
        <p className="text-xs text-muted">No contact information is available for this vendor</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact, index) => (
        <div key={index} className="bg-muted-light rounded p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-xs font-semibold text-foreground">
              {formatContactType(contact.contact_type)}
            </h4>
          </div>
          <ContactDisplay contact={contact} />
        </div>
      ))}
    </div>
  );
}

// ============================================
// AWARDS PANEL - Using DataTable
// ============================================

interface AwardsPanelProps {
  awards: VendorAward[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function AwardsPanel({ awards, totalCount, isLoading, error, onRetry }: AwardsPanelProps) {
  const [pdfModal, setPdfModal] = useState<{ id: number; contract: string } | null>(null);
  const pdfUrl = pdfModal ? `/api/library/awards/${pdfModal.id}/pdf` : null;

  // Define columns for awards table
  const columns = useMemo<ColumnDef<VendorAward>[]>(
    () => [
      {
        id: "award_date",
        accessorKey: "award_date",
        header: "Award Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatAwardDate(row.original.award_date)}
          </span>
        ),
      },
      {
        id: "contract_number",
        accessorKey: "contract_number",
        header: "Contract #",
        cell: ({ row }) => {
          const award = row.original;
          return (
            <span className="inline-flex items-center gap-1">
              <span className="text-xs font-mono font-semibold">{award.contract_number || "—"}</span>
              {award.has_pdf && award.order_detail_id && (
                <button
                  type="button"
                  title="View award PDF"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPdfModal({ id: award.order_detail_id!, contract: award.contract_number || "" });
                  }}
                  className="text-primary hover:text-primary/80 cursor-pointer shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </button>
              )}
            </span>
          );
        },
      },
      {
        id: "pr_number",
        accessorKey: "pr_number",
        header: "PR #",
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted">{row.original.pr_number || "—"}</span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "nsn",
        accessorFn: (row) => row.fsc && row.niin ? `${row.fsc}-${row.niin}` : row.niin,
        header: "NSN",
        cell: ({ row }) => {
          const displayValue =
            row.original.fsc && row.original.niin
              ? `${row.original.fsc}-${formatNiin(row.original.niin)}`
              : formatNiin(row.original.niin);
          if (!displayValue) {
            return <span className="font-mono text-muted">—</span>;
          }
          return (
            <Link
              href={`/library/parts?search_type=nsn_niin&q=${encodeURIComponent(displayValue)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {displayValue}
            </Link>
          );
        },
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate block" title={row.original.description || undefined}>
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "award_quantity",
        accessorKey: "award_quantity",
        header: () => <span className="w-full text-right block">Qty</span>,
        cell: ({ row }) => (
          <span className="text-xs text-right block">
            {formatNumber(row.original.award_quantity)}
          </span>
        ),
        meta: { className: "hidden sm:table-cell text-right" },
      },
      {
        id: "unit_price",
        accessorKey: "unit_price",
        header: () => <span className="w-full text-right block">Unit Price</span>,
        cell: ({ row }) => (
          <span className="text-xs text-right block">
            {formatCurrency(row.original.unit_price)}
          </span>
        ),
        meta: { className: "hidden lg:table-cell text-right" },
      },
      {
        id: "total_value",
        accessorKey: "total_value",
        header: () => <span className="w-full text-right block">Total</span>,
        cell: ({ row }) => (
          <span className="text-xs font-medium text-right block">
            {formatCurrency(row.original.total_value)}
          </span>
        ),
        meta: { className: "text-right" },
      },
      {
        id: "agency_code",
        accessorKey: "agency_code",
        header: "Agency",
        cell: ({ row }) => (
          <span className="text-xs text-muted">{row.original.agency_code || "—"}</span>
        ),
        meta: { className: "hidden sm:table-cell" },
      },
    ],
    []
  );

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg
          className="w-10 h-10 text-error/50 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-xs font-medium text-foreground mb-1">Error Loading Awards</h3>
        <p className="text-xs text-muted mb-3">{error}</p>
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state component
  const emptyComponent = (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <svg
        className="w-10 h-10 text-muted/50 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="text-xs font-medium text-foreground mb-1">No Awards Found</h3>
      <p className="text-xs text-muted">No recent contract awards are available for this vendor</p>
    </div>
  );

  return (
    <>
      <DataTable
        data={awards}
        columns={columns}
        isLoading={isLoading}
        emptyComponent={emptyComponent}
        exportFilename="vendor-awards"
        config={{
          features: {
            sorting: true,
            multiSort: false,
            rowSelection: false,
            copyRow: true,
            // DataTable's built-in export is disabled — the tab strip
            // hosts our tier-aware ExportCsvButton instead.
            export: false,
            exportFormats: ["csv"],
            columnResize: false,
            columnVisibility: false,
          },
        }}
      />
      {pdfModal && pdfUrl && (
        <Modal
          isOpen={true}
          onClose={() => setPdfModal(null)}
          title={`Contract ${pdfModal.contract}`}
          size="full"
        >
          <div className="flex flex-col gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Open in new tab
            </a>
            <iframe
              src={pdfUrl}
              title={`Contract ${pdfModal.contract}`}
              className="w-full border border-border rounded min-h-[70vh]"
            />
          </div>
        </Modal>
      )}
      {/* Custom-reports upsell — below the table so the data stays at
          the top of the panel. Only shown when there are awards to
          contextualize it. */}
      {awards.length > 0 && (
        <div className="mt-2 flex justify-end">
          <CustomReportLink />
        </div>
      )}
    </>
  );
}

// ============================================
// BOOKINGS PANEL - Using DataTable
// ============================================

interface BookingsPanelProps {
  months: VendorBookingMonth[];
  totals: VendorBookingTotals | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function BookingsPanel({ months, totals, isLoading, error, onRetry }: BookingsPanelProps) {
  // Define columns for bookings table
  const columns = useMemo<ColumnDef<VendorBookingMonth>[]>(
    () => [
      {
        id: "month_label",
        accessorKey: "month_label",
        header: "Month",
        cell: ({ row }) => (
          <span className="text-xs font-medium whitespace-nowrap">
            {row.original.month_label}
          </span>
        ),
      },
      {
        id: "dscp_booked",
        accessorKey: "dscp_booked",
        header: () => <span className="w-full text-right block">DSCP</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <div className="text-xs">{row.original.dscp_booked > 0 ? formatCurrency(row.original.dscp_booked) : "—"}</div>
            {row.original.dscp_rank && <div className="text-[10px] text-muted">Rank {row.original.dscp_rank}</div>}
          </div>
        ),
        meta: { className: "text-right" },
      },
      {
        id: "dscr_booked",
        accessorKey: "dscr_booked",
        header: () => <span className="w-full text-right block">DSCR</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <div className="text-xs">{row.original.dscr_booked > 0 ? formatCurrency(row.original.dscr_booked) : "—"}</div>
            {row.original.dscr_rank && <div className="text-[10px] text-muted">Rank {row.original.dscr_rank}</div>}
          </div>
        ),
        meta: { className: "hidden sm:table-cell text-right" },
      },
      {
        id: "dscc_booked",
        accessorKey: "dscc_booked",
        header: () => <span className="w-full text-right block">DSCC</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <div className="text-xs">{row.original.dscc_booked > 0 ? formatCurrency(row.original.dscc_booked) : "—"}</div>
            {row.original.dscc_rank && <div className="text-[10px] text-muted">Rank {row.original.dscc_rank}</div>}
          </div>
        ),
        meta: { className: "hidden md:table-cell text-right" },
      },
      {
        id: "other_booked",
        accessorKey: "other_booked",
        header: () => <span className="w-full text-right block">Other</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <div className="text-xs">{row.original.other_booked > 0 ? formatCurrency(row.original.other_booked) : "—"}</div>
            {row.original.other_rank && <div className="text-[10px] text-muted">Rank {row.original.other_rank}</div>}
          </div>
        ),
        meta: { className: "hidden lg:table-cell text-right" },
      },
      {
        id: "month_total",
        accessorKey: "month_total",
        header: () => <span className="w-full text-right block">Total</span>,
        cell: ({ row }) => (
          <span className="text-xs font-medium text-right block">
            {formatCurrency(row.original.month_total)}
          </span>
        ),
        meta: { className: "text-right" },
      },
    ],
    []
  );

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg
          className="w-10 h-10 text-error/50 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-xs font-medium text-foreground mb-1">Error Loading Bookings</h3>
        <p className="text-xs text-muted mb-3">{error}</p>
        <button
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state component
  const emptyComponent = (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <svg
        className="w-10 h-10 text-muted/50 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <h3 className="text-xs font-medium text-foreground mb-1">No Booking Data</h3>
      <p className="text-xs text-muted">No contract booking data is available for this vendor</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Totals Summary */}
      {totals && totals.grand_total > 0 && !isLoading && (
        <div className="bg-muted-light rounded-lg p-3">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            13-Month Summary
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <p className="text-[10px] text-muted uppercase">DSCP</p>
              <p className="text-xs font-medium text-foreground">{formatCurrency(totals.dscp_total)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase">DSCR</p>
              <p className="text-xs font-medium text-foreground">{formatCurrency(totals.dscr_total)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase">DSCC</p>
              <p className="text-xs font-medium text-foreground">{formatCurrency(totals.dscc_total)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase">Other</p>
              <p className="text-xs font-medium text-foreground">{formatCurrency(totals.other_total)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase">Grand Total</p>
              <p className="text-xs font-bold text-primary">{formatCurrency(totals.grand_total)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Table */}
      <DataTable
        data={months}
        columns={columns}
        isLoading={isLoading}
        emptyComponent={emptyComponent}
        exportFilename="vendor-bookings"
        config={{
          features: {
            sorting: true,
            multiSort: false,
            rowSelection: false,
            copyRow: true,
            // DataTable's built-in export is disabled — the tab strip
            // hosts our tier-aware ExportCsvButton instead.
            export: false,
            exportFormats: ["csv"],
            columnResize: false,
            columnVisibility: false,
          },
        }}
      />
      {/* Custom-reports upsell — below the table so the data stays at
          the top of the panel. */}
      {months.length > 0 && (
        <div className="mt-2 flex justify-end">
          <CustomReportLink />
        </div>
      )}
    </div>
  );
}

// ============================================
// SOLICITATIONS PANEL - Using DataTable
// ============================================

interface SolicitationsPanelProps {
  solicitations: VendorSolicitation[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

// NSN affordance for a SAM.gov opportunity row. A SAM opportunity can match
// several of the vendor's parts, so instead of a single inline NSN the cell
// shows a "N NSNs" count chip that opens a popover listing each matched NSN
// (each linking to part search). Portaled to <body> so the table's overflow
// can't clip it. Mirrors the SamDocumentsButton interaction pattern.
function MatchedNsnsChip({ nsns }: { nsns: NonNullable<VendorSolicitation["nsns"]> }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) setCoords({ top: rect.bottom + 4, left: rect.left });
    }
  };

  // Close on outside click or Escape while the popover is open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = nsns.length;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title={`${count} matched NSN${count === 1 ? "" : "s"}`}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer shrink-0"
      >
        {count} NSN{count === 1 ? "" : "s"}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-56 max-h-80 overflow-y-auto rounded-md border border-border bg-background shadow-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted border-b border-border/60">
            Matched NSNs · {count}
          </div>
          {nsns.map((n, i) => {
            const display = n.fsc && n.niin ? `${n.fsc}-${formatNiin(n.niin)}` : formatNiin(n.niin);
            if (!display) return null;
            return (
              <Link
                key={`${n.fsc ?? ""}-${n.niin ?? ""}-${i}`}
                href={`/library/parts?search_type=nsn_niin&q=${encodeURIComponent(display)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block px-3 py-1.5 text-xs font-mono text-primary hover:bg-muted/10 cursor-pointer"
              >
                {display}
              </Link>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

function SolicitationsPanel({ solicitations, totalCount, isLoading, error, onRetry }: SolicitationsPanelProps) {
  const [pdfModal, setPdfModal] = useState<{ id: number; number: string } | null>(null);
  const pdfUrl = pdfModal ? `/api/library/solicitations/${pdfModal.id}/pdf` : null;

  // Amendment indicator — one batch fetch per visible page; the cell
  // renders the "Amended" pill only when the sol has at least one row
  // in solicitation_amendments. Only DLA rows have amendments; SAM
  // opportunity IDs live in a different namespace and must not be sent to
  // the DLA amendment endpoint.
  const solIds = useMemo(
    () => solicitations.filter((s) => (s.source ?? "DLA") === "DLA").map((s) => s.solicitation_id),
    [solicitations]
  );
  const amendmentSummaries = useAmendmentSummaries(solIds);
  const [amendmentModal, setAmendmentModal] = useState<{ id: number; number: string | null } | null>(null);

  // Define columns for solicitations table
  const columns = useMemo<ColumnDef<VendorSolicitation>[]>(
    () => [
      {
        id: "close_date",
        accessorKey: "close_date",
        header: "Close Date",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap">
            {formatAwardDate(row.original.close_date)}
          </span>
        ),
      },
      {
        id: "solicitation_number",
        accessorKey: "solicitation_number",
        header: "Solicitation #",
        cell: ({ row }) => {
          const sol = row.original;
          const isSam = (sol.source ?? "DLA") === "SAM";
          const summary = amendmentSummaries.get(sol.solicitation_id);
          const displayNumber = formatSolicitationNumber(sol.solicitation_number);
          return (
            <span className="inline-flex items-center gap-1">
              {isSam ? (
                // SAM rows link out to the public SAM.gov opportunity page.
                <a
                  href={sol.sam_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs font-mono font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary ${sol.sam_url ? "cursor-pointer" : "cursor-default no-underline"}`}
                  onClick={(e) => e.stopPropagation()}
                  title={sol.sam_url ? "View on SAM.gov" : undefined}
                >
                  {displayNumber}
                </a>
              ) : (
                <span className="text-xs font-mono font-semibold">{sol.solicitation_number}</span>
              )}
              {isSam && (
                // Subtle marker that this row is a SAM.gov opportunity (in lieu of a Source column).
                <Tooltip content={sol.notice_type ? `SAM.gov · ${sol.notice_type}` : "SAM.gov opportunity"}>
                  <span className="inline-flex items-center rounded px-1 py-px text-[10px] font-medium uppercase tracking-wide text-muted bg-muted/10 border border-border/60 shrink-0">
                    SAM.gov
                  </span>
                </Tooltip>
              )}
              {isSam && (sol.document_count ?? 0) > 0 && (
                <SamDocumentsButton
                  oppId={sol.solicitation_id}
                  count={sol.document_count ?? 0}
                  label={displayNumber}
                />
              )}
              {!isSam && sol.has_pdf && (
                <button
                  type="button"
                  title="View solicitation PDF"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPdfModal({ id: sol.solicitation_id, number: sol.solicitation_number });
                  }}
                  className="text-primary hover:text-primary/80 cursor-pointer shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </button>
              )}
              {!isSam && summary && summary.amendment_count > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAmendmentModal({ id: sol.solicitation_id, number: sol.solicitation_number });
                  }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 shrink-0"
                  title={`${summary.amendment_count} amendment${summary.amendment_count === 1 ? "" : "s"} on this solicitation. Click to view.`}
                >
                  Amended{summary.amendment_count > 1 ? ` ×${summary.amendment_count}` : ""}
                </button>
              )}
            </span>
          );
        },
      },
      {
        id: "nsn",
        accessorFn: (row) => row.fsc && row.niin ? `${row.fsc}-${row.niin}` : row.niin,
        header: "NSN",
        cell: ({ row }) => {
          const sol = row.original;
          // SAM opportunities can span several of the vendor's parts — show a
          // count chip that opens a popover of all matched NSNs.
          if ((sol.source ?? "DLA") === "SAM") {
            const nsns = sol.nsns ?? [];
            if (nsns.length === 0) {
              return <span className="text-xs font-mono text-muted">—</span>;
            }
            // A single matched NSN doesn't need a dropdown — show it inline
            // (same presentation as the DLA single-NSN branch below). Only use
            // the count chip + popover when there's more than one.
            if (nsns.length === 1) {
              const n = nsns[0];
              const single = n.fsc && n.niin ? `${n.fsc}-${formatNiin(n.niin)}` : formatNiin(n.niin);
              if (!single) {
                return <span className="text-xs font-mono text-muted">—</span>;
              }
              return (
                <Link
                  href={`/library/parts?search_type=nsn_niin&q=${encodeURIComponent(single)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {single}
                </Link>
              );
            }
            return <MatchedNsnsChip nsns={nsns} />;
          }
          const displayValue =
            sol.fsc && sol.niin
              ? `${sol.fsc}-${formatNiin(sol.niin)}`
              : formatNiin(sol.niin);
          if (!displayValue) {
            return <span className="text-xs font-mono text-muted">—</span>;
          }
          return (
            <Link
              href={`/library/parts?search_type=nsn_niin&q=${encodeURIComponent(displayValue)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {displayValue}
            </Link>
          );
        },
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="text-xs max-w-[200px] truncate block" title={row.original.description || undefined}>
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "quantity",
        accessorKey: "quantity",
        header: () => <span className="w-full text-right block">Qty</span>,
        cell: ({ row }) => (
          <span className="text-xs text-right block">
            {formatNumber(row.original.quantity)}
          </span>
        ),
        meta: { className: "hidden sm:table-cell text-right" },
      },
      {
        id: "estimated_value",
        accessorKey: "estimated_value",
        header: () => <span className="w-full text-right block">Est. Value</span>,
        cell: ({ row }) => (
          <span className="text-xs text-right block">
            {row.original.estimated_value ? formatCurrency(row.original.estimated_value) : "—"}
          </span>
        ),
        meta: { className: "hidden md:table-cell text-right" },
      },
      {
        id: "set_aside",
        accessorKey: "set_aside_label",
        header: "Set-Aside",
        cell: ({ row }) => {
          // Prefer canonical code + label from the API. Fall back to the
          // legacy raw string only when the row hasn't been re-harvested.
          const code = row.original.set_aside_code ?? row.original.set_aside;
          const label = row.original.set_aside_label ?? code;
          if (!code) return <span className="text-muted">—</span>;
          return (
            <Tooltip content={label ?? code}>
              <Badge variant="info" size="sm">{code}</Badge>
            </Tooltip>
          );
        },
        meta: { className: "hidden sm:table-cell" },
      },
      {
        id: "agency_code",
        accessorKey: "agency_code",
        header: "Agency",
        cell: ({ row }) => (
          <span className="text-xs text-muted">{row.original.agency_code || "—"}</span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
    ],
    // Rebuild columns when amendment summaries load so the cell sees
    // the fresh Map.
    [amendmentSummaries]
  );

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg
          className="w-10 h-10 text-error/50 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-xs font-medium text-foreground mb-1">Error Loading Solicitations</h3>
        <p className="text-xs text-muted mb-3">{error}</p>
        <button
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state component
  const emptyComponent = (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <svg
        className="w-10 h-10 text-muted/50 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <h3 className="text-xs font-medium text-foreground mb-1">No Open Solicitations</h3>
      <p className="text-xs text-muted">No open solicitations are available for this vendor&apos;s parts</p>
    </div>
  );

  return (
    <>
      <DataTable
        data={solicitations}
        columns={columns}
        isLoading={isLoading}
        emptyComponent={emptyComponent}
        exportFilename="vendor-solicitations"
        getRowId={(row) => `${row.source ?? "DLA"}-${row.solicitation_id}`}
        config={{
          features: {
            sorting: true,
            multiSort: false,
            rowSelection: false,
            copyRow: true,
            // DataTable's built-in export is disabled — the tab strip
            // hosts our tier-aware ExportCsvButton instead.
            export: false,
            exportFormats: ["csv"],
            columnResize: false,
            columnVisibility: false,
          },
        }}
      />
      {pdfModal && pdfUrl && (
        <Modal
          isOpen={true}
          onClose={() => setPdfModal(null)}
          title={`Solicitation ${pdfModal.number}`}
          size="full"
        >
          <div className="flex flex-col gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Open in new tab
            </a>
            <iframe
              src={pdfUrl}
              title={`Solicitation ${pdfModal.number}`}
              className="w-full border border-border rounded min-h-[70vh]"
            />
          </div>
        </Modal>
      )}
      {/* Amendment timeline modal — opened from the "Amended" pill on a
          solicitation row. */}
      <AmendmentTimelineModal
        solicitationId={amendmentModal?.id ?? null}
        solicitationNumber={amendmentModal?.number ?? null}
        onClose={() => setAmendmentModal(null)}
      />
      {/* Custom-reports upsell — below the table so the data stays at
          the top of the panel. */}
      {solicitations.length > 0 && (
        <div className="mt-2 flex justify-end">
          <CustomReportLink />
        </div>
      )}
    </>
  );
}
