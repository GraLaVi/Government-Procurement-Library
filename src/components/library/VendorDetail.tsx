"use client";

import { useState, useCallback, useMemo } from "react";
import {
  VendorDetail as VendorDetailType,
  VendorAward,
  VendorAwardsResponse,
  VendorBookingMonth,
  VendorBookingTotals,
  VendorBookingsResponse,
  VendorSolicitation,
  VendorSolicitationsResponse,
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
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";

interface VendorDetailProps {
  vendor: VendorDetailType;
}

type TabId = "demographics" | "contacts" | "awards" | "bookings" | "solicitations";

export function VendorDetail({ vendor }: VendorDetailProps) {
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

  // Handle tab change with lazy loading
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as TabId);
    if (tabId === 'awards' && !awardsFetched) {
      fetchAwards();
    } else if (tabId === 'bookings' && !bookingsFetched) {
      fetchBookings();
    } else if (tabId === 'solicitations' && !solicitationsFetched) {
      fetchSolicitations();
    }
  }, [awardsFetched, fetchAwards, bookingsFetched, fetchBookings, solicitationsFetched, fetchSolicitations]);

  // Build tabs dynamically with counts in parenthesis for better readability
  const tabs = [
    { id: "demographics" as TabId, label: "Demographics", disabled: false },
    {
      id: "contacts" as TabId,
      label: hasContacts ? `Contacts (${contactCount})` : "Contacts",
      disabled: false,
    },
    {
      id: "awards" as TabId,
      label: awardsFetched && awardsTotal > 0 ? `Recent Awards (${awardsTotal})` : "Recent Awards",
      disabled: false
    },
    {
      id: "bookings" as TabId,
      label: bookingsFetched && bookingMonths.length > 0 ? `Contracts Booked (${bookingMonths.length}mo)` : "Contracts Booked",
      disabled: false
    },
    {
      id: "solicitations" as TabId,
      label: solicitationsFetched && solicitationsTotal > 0 ? `Open Solicitations (${solicitationsTotal})` : "Open Solicitations",
      disabled: false
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted-light">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground truncate">
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

      {/* Tabs */}
      <div className="px-4 pt-3">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Tab Panels */}
      <div className="p-4">
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
  // Build data rows, filtering out empty values
  const identifiers = [
    { label: "CAGE", value: vendor.cage_code, mono: true },
    { label: "UEI", value: vendor.uei, mono: true },
    { label: "DUNS", value: vendor.duns, mono: true },
    { label: "DoDAAC", value: vendor.dodaac, mono: true },
  ].filter(item => item.value);

  const businessInfo = [
    { label: "Entity Structure", value: vendor.entity_structure },
    { label: "Website", value: vendor.entity_url, isLink: true },
    { label: "State of Inc.", value: vendor.state_of_incorporation },
    { label: "Country of Inc.", value: vendor.country_of_incorporation },
    { label: "Fiscal Year End", value: formatFiscalYearEnd(vendor.fiscal_year_end) },
    { label: "Small Business", value: vendor.small_business === true ? "Yes" : vendor.small_business === false ? "No" : null },
  ].filter(item => item.value);

  const registration = [
    { label: "SAM Status", value: formatSamStatus(vendor.sam_status) },
    { label: "Exclusion", value: vendor.exclusion_status ? "Excluded" : "Not Excluded" },
    { label: "Reg. Expires", value: vendor.registration_expiration_date },
  ].filter(item => item.value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column: Identifiers + Registration */}
      <div className="space-y-4">
        {/* Identifiers Card */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">
            Identifiers
          </h3>
          <div className="space-y-1.5">
            {identifiers.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted">{item.label}</span>
                <span className={`text-xs font-medium ${item.mono ? "font-mono text-primary" : "text-foreground"}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Registration Card */}
        {registration.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">
              Registration
            </h3>
            <div className="space-y-1.5">
              {registration.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{item.label}</span>
                  <span className="text-xs font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Middle Column: Business Info */}
      <div className="space-y-4">
        {businessInfo.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">
              Business Details
            </h3>
            <div className="space-y-1.5">
              {businessInfo.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-muted flex-shrink-0">{item.label}</span>
                  {item.isLink && item.value ? (
                    <a
                      href={item.value.startsWith("http") ? item.value : `https://${item.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate text-right"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <span className="text-xs font-medium text-foreground text-right truncate">
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DBA Name if different */}
        {vendor.dba_name && vendor.dba_name !== vendor.legal_business_name && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1">
              DBA Name
            </h3>
            <p className="text-xs font-medium text-foreground">{vendor.dba_name}</p>
          </div>
        )}
      </div>

      {/* Right Column: Address */}
      <div className="space-y-4">
        {physicalAddress && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">
              Physical Address
            </h3>
            <AddressDisplay address={physicalAddress} />
          </div>
        )}

        {mailingAddress && mailingAddress !== physicalAddress && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">
              Mailing Address
            </h3>
            <AddressDisplay address={mailingAddress} />
          </div>
        )}
      </div>
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
        <h3 className="text-sm font-medium text-foreground mb-1">No Contacts Available</h3>
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
  // Define columns for awards table
  const columns = useMemo<ColumnDef<VendorAward>[]>(
    () => [
      {
        id: "award_date",
        accessorKey: "award_date",
        header: "Date",
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
        cell: ({ row }) => (
          <span className="font-mono">{row.original.contract_number}</span>
        ),
      },
      {
        id: "nsn",
        accessorFn: (row) => row.fsc && row.niin ? `${row.fsc}-${row.niin}` : row.niin,
        header: "NSN",
        cell: ({ row }) => (
          <span className="font-mono text-muted">
            {row.original.fsc && row.original.niin
              ? `${row.original.fsc}-${formatNiin(row.original.niin)}`
              : formatNiin(row.original.niin) || "—"}
          </span>
        ),
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
          <span className="text-right block">
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
          <span className="text-right block">
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
          <span className="font-medium text-right block">
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
          <span className="text-muted">{row.original.agency_code || "—"}</span>
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
        <h3 className="text-sm font-medium text-foreground mb-1">Error Loading Awards</h3>
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
      <h3 className="text-sm font-medium text-foreground mb-1">No Awards Found</h3>
      <p className="text-xs text-muted">No recent contract awards are available for this vendor</p>
    </div>
  );

  return (
    <DataTable
      data={awards}
      columns={columns}
      isLoading={isLoading}
      emptyComponent={emptyComponent}
      exportFilename="vendor-awards"
      showToolbar={awards.length > 0}
        config={{
          features: {
            sorting: true,
            multiSort: false,
            rowSelection: false,
            copyRow: true,
            export: true,
            exportFormats: ["csv"],
            columnResize: false,
            columnVisibility: false,
          },
        }}
      />
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
          <span className="font-medium whitespace-nowrap">
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
            <div>{row.original.dscp_booked > 0 ? formatCurrency(row.original.dscp_booked) : "—"}</div>
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
            <div>{row.original.dscr_booked > 0 ? formatCurrency(row.original.dscr_booked) : "—"}</div>
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
            <div>{row.original.dscc_booked > 0 ? formatCurrency(row.original.dscc_booked) : "—"}</div>
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
            <div>{row.original.other_booked > 0 ? formatCurrency(row.original.other_booked) : "—"}</div>
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
          <span className="font-medium text-right block">
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
        <h3 className="text-sm font-medium text-foreground mb-1">Error Loading Bookings</h3>
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
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <h3 className="text-sm font-medium text-foreground mb-1">No Booking Data</h3>
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
              <p className="text-sm font-medium text-foreground">{formatCurrency(totals.dscp_total)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase">DSCR</p>
              <p className="text-sm font-medium text-foreground">{formatCurrency(totals.dscr_total)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase">DSCC</p>
              <p className="text-sm font-medium text-foreground">{formatCurrency(totals.dscc_total)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase">Other</p>
              <p className="text-sm font-medium text-foreground">{formatCurrency(totals.other_total)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase">Grand Total</p>
              <p className="text-sm font-bold text-primary">{formatCurrency(totals.grand_total)}</p>
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
        showToolbar={months.length > 0}
        config={{
          features: {
            sorting: true,
            multiSort: false,
            rowSelection: false,
            copyRow: true,
            export: true,
            exportFormats: ["csv"],
            columnResize: false,
            columnVisibility: false,
          },
        }}
      />
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

function SolicitationsPanel({ solicitations, totalCount, isLoading, error, onRetry }: SolicitationsPanelProps) {
  // Define columns for solicitations table
  const columns = useMemo<ColumnDef<VendorSolicitation>[]>(
    () => [
      {
        id: "close_date",
        accessorKey: "close_date",
        header: "Close Date",
        cell: ({ row }) => {
          const closeDate = new Date(row.original.close_date);
          const isExpired = closeDate.getTime() < Date.now();
          return (
            <span className={`whitespace-nowrap ${isExpired ? 'text-muted italic' : ''}`}>
              {formatAwardDate(row.original.close_date)}
              {isExpired && <span className="ml-1 text-[10px] not-italic">(closed)</span>}
            </span>
          );
        },
      },
      {
        id: "solicitation_number",
        accessorKey: "solicitation_number",
        header: "Solicitation #",
        cell: ({ row }) => (
          <span className="font-mono">{row.original.solicitation_number}</span>
        ),
      },
      {
        id: "nsn",
        accessorFn: (row) => row.fsc && row.niin ? `${row.fsc}-${row.niin}` : row.niin,
        header: "NSN",
        cell: ({ row }) => (
          <span className="font-mono text-muted">
            {row.original.fsc && row.original.niin
              ? `${row.original.fsc}-${formatNiin(row.original.niin)}`
              : formatNiin(row.original.niin) || "—"}
          </span>
        ),
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
        id: "quantity",
        accessorKey: "quantity",
        header: () => <span className="w-full text-right block">Qty</span>,
        cell: ({ row }) => (
          <span className="text-right block">
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
          <span className="text-right block">
            {row.original.estimated_value ? formatCurrency(row.original.estimated_value) : "—"}
          </span>
        ),
        meta: { className: "hidden md:table-cell text-right" },
      },
      {
        id: "set_aside",
        accessorKey: "set_aside",
        header: "Set-Aside",
        cell: ({ row }) => (
          row.original.set_aside ? (
            <Badge variant="info" size="sm">{row.original.set_aside}</Badge>
          ) : (
            <span className="text-muted">—</span>
          )
        ),
        meta: { className: "hidden sm:table-cell" },
      },
      {
        id: "agency_code",
        accessorKey: "agency_code",
        header: "Agency",
        cell: ({ row }) => {
          const sol = row.original;
          if (sol.solicitation_number && sol.agency_code) {
            return (
              <a
                href={`https://www.dibbs.bsm.dla.mil/Rfp/RfpRec.aspx?sn=${sol.solicitation_number.replace(/-/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {sol.agency_code}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            );
          }
          return <span className="text-muted">{sol.agency_code || "—"}</span>;
        },
        meta: { className: "hidden lg:table-cell" },
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
        <h3 className="text-sm font-medium text-foreground mb-1">Error Loading Solicitations</h3>
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
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <h3 className="text-sm font-medium text-foreground mb-1">No Open Solicitations</h3>
      <p className="text-xs text-muted">No open solicitations are available for this vendor&apos;s parts</p>
    </div>
  );

  return (
    <DataTable
      data={solicitations}
      columns={columns}
      isLoading={isLoading}
      emptyComponent={emptyComponent}
      exportFilename="vendor-solicitations"
      showToolbar={solicitations.length > 0}
      getRowId={(row) => String(row.solicitation_id)}
      config={{
        features: {
          sorting: true,
          multiSort: false,
          rowSelection: false,
          copyRow: true,
          export: true,
          exportFormats: ["csv"],
          columnResize: false,
          columnVisibility: false,
        },
      }}
    />
  );
}
