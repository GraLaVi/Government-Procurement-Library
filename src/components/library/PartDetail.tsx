"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  PartDetail as PartDetailType,
  PartProcurementRecord,
  PartProcurementHistoryResponse,
  PartSolicitation,
  PartSolicitationsResponse,
  PartManufacturer,
  PartManufacturersResponse,
  PartTechnicalCharacteristic,
  PartTechnicalCharacteristicsResponse,
  EndUseDescription,
  PartEndUseDescriptionResponse,
  PartPackaging,
  PartPackagingResponse,
  formatNSN,
  formatCurrency,
  formatNumber,
  formatContractDate,
} from "@/lib/library/types";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";

interface PartDetailProps {
  part: PartDetailType;
}

type TabId = "overview" | "procurement" | "solicitations" | "manufacturers" | "technical" | "enduse" | "packaging";

export function PartDetail({ part }: PartDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Procurement history state
  const [procurementRecords, setProcurementRecords] = useState<PartProcurementRecord[]>([]);
  const [procurementTotal, setProcurementTotal] = useState(0);
  const [isLoadingProcurement, setIsLoadingProcurement] = useState(false);
  const [procurementError, setProcurementError] = useState<string | null>(null);
  const [procurementFetched, setProcurementFetched] = useState(false);

  // Solicitations state
  const [solicitations, setSolicitations] = useState<PartSolicitation[]>([]);
  const [solicitationsTotal, setSolicitationsTotal] = useState(0);
  const [isLoadingSolicitations, setIsLoadingSolicitations] = useState(false);
  const [solicitationsError, setSolicitationsError] = useState<string | null>(null);
  const [solicitationsFetched, setSolicitationsFetched] = useState(false);

  // Manufacturers state
  const [manufacturers, setManufacturers] = useState<PartManufacturer[]>([]);
  const [manufacturersTotal, setManufacturersTotal] = useState(0);
  const [isLoadingManufacturers, setIsLoadingManufacturers] = useState(false);
  const [manufacturersError, setManufacturersError] = useState<string | null>(null);
  const [manufacturersFetched, setManufacturersFetched] = useState(false);

  // Technical characteristics state
  const [technicalCharacteristics, setTechnicalCharacteristics] = useState<PartTechnicalCharacteristic[]>([]);
  const [technicalTotal, setTechnicalTotal] = useState(0);
  const [isLoadingTechnical, setIsLoadingTechnical] = useState(false);
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [technicalFetched, setTechnicalFetched] = useState(false);

  // End use description state
  const [endUseDescriptions, setEndUseDescriptions] = useState<EndUseDescription[]>([]);
  const [endUseTotal, setEndUseTotal] = useState(0);
  const [isLoadingEndUse, setIsLoadingEndUse] = useState(false);
  const [endUseError, setEndUseError] = useState<string | null>(null);
  const [endUseFetched, setEndUseFetched] = useState(false);

  // Packaging information state
  const [packaging, setPackaging] = useState<PartPackaging | null>(null);
  const [packagingCodeDefinitions, setPackagingCodeDefinitions] = useState<Record<string, string>>({});
  const [packagingMarkingDefinitions, setPackagingMarkingDefinitions] = useState<Record<string, string>>({});
  const [isLoadingPackaging, setIsLoadingPackaging] = useState(false);
  const [packagingError, setPackagingError] = useState<string | null>(null);
  const [packagingFetched, setPackagingFetched] = useState(false);

  // Fetch procurement history when tab is clicked (lazy loading)
  const fetchProcurementHistory = useCallback(async () => {
    if (procurementFetched || isLoadingProcurement) return;

    setIsLoadingProcurement(true);
    setProcurementError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(part.nsn)}/procurement-history?limit=50`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load procurement history');
      }

      const procurementResponse = data as PartProcurementHistoryResponse;
      setProcurementRecords(procurementResponse.records);
      setProcurementTotal(procurementResponse.total_count);
      setProcurementFetched(true);
    } catch (error) {
      console.error('Procurement history fetch error:', error);
      setProcurementError(error instanceof Error ? error.message : 'Failed to load procurement history');
    } finally {
      setIsLoadingProcurement(false);
    }
  }, [part.nsn, procurementFetched, isLoadingProcurement]);

  // Fetch solicitations when tab is clicked (lazy loading)
  const fetchSolicitations = useCallback(async () => {
    if (solicitationsFetched || isLoadingSolicitations) return;

    setIsLoadingSolicitations(true);
    setSolicitationsError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(part.nsn)}/solicitations`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load solicitations');
      }

      const solicitationsResponse = data as PartSolicitationsResponse;
      setSolicitations(solicitationsResponse.solicitations);
      setSolicitationsTotal(solicitationsResponse.total_count);
      setSolicitationsFetched(true);
    } catch (error) {
      console.error('Solicitations fetch error:', error);
      setSolicitationsError(error instanceof Error ? error.message : 'Failed to load solicitations');
    } finally {
      setIsLoadingSolicitations(false);
    }
  }, [part.nsn, solicitationsFetched, isLoadingSolicitations]);

  // Fetch manufacturers when tab is clicked (lazy loading)
  const fetchManufacturers = useCallback(async () => {
    if (manufacturersFetched || isLoadingManufacturers) return;

    setIsLoadingManufacturers(true);
    setManufacturersError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(part.nsn)}/manufacturers`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load manufacturers');
      }

      const manufacturersResponse = data as PartManufacturersResponse;
      setManufacturers(manufacturersResponse.manufacturers);
      setManufacturersTotal(manufacturersResponse.total_count);
      setManufacturersFetched(true);
    } catch (error) {
      console.error('Manufacturers fetch error:', error);
      setManufacturersError(error instanceof Error ? error.message : 'Failed to load manufacturers');
    } finally {
      setIsLoadingManufacturers(false);
    }
  }, [part.nsn, manufacturersFetched, isLoadingManufacturers]);

  // Fetch technical characteristics when tab is clicked (lazy loading)
  const fetchTechnicalCharacteristics = useCallback(async () => {
    if (technicalFetched || isLoadingTechnical) return;

    setIsLoadingTechnical(true);
    setTechnicalError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(part.nsn)}/technical-characteristics`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load technical characteristics');
      }

      const technicalResponse = data as PartTechnicalCharacteristicsResponse;
      setTechnicalCharacteristics(technicalResponse.characteristics);
      setTechnicalTotal(technicalResponse.total_count);
      setTechnicalFetched(true);
    } catch (error) {
      console.error('Technical characteristics fetch error:', error);
      setTechnicalError(error instanceof Error ? error.message : 'Failed to load technical characteristics');
    } finally {
      setIsLoadingTechnical(false);
    }
  }, [part.nsn, technicalFetched, isLoadingTechnical]);

  // Fetch end use descriptions when tab is clicked (lazy loading)
  const fetchEndUseDescriptions = useCallback(async () => {
    if (endUseFetched || isLoadingEndUse) return;

    setIsLoadingEndUse(true);
    setEndUseError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(part.nsn)}/end-use-description`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load end use descriptions');
      }

      const endUseResponse = data as PartEndUseDescriptionResponse;
      setEndUseDescriptions(endUseResponse.descriptions);
      setEndUseTotal(endUseResponse.total_count);
      setEndUseFetched(true);
    } catch (error) {
      console.error('End use description fetch error:', error);
      setEndUseError(error instanceof Error ? error.message : 'Failed to load end use descriptions');
    } finally {
      setIsLoadingEndUse(false);
    }
  }, [part.nsn, endUseFetched, isLoadingEndUse]);

  // Fetch packaging information when tab is clicked (lazy loading)
  const fetchPackaging = useCallback(async () => {
    if (packagingFetched || isLoadingPackaging) return;

    setIsLoadingPackaging(true);
    setPackagingError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(part.nsn)}/packaging`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load packaging information');
      }

      const packagingResponse = data as PartPackagingResponse;
      setPackaging(packagingResponse.packaging);
      setPackagingCodeDefinitions(packagingResponse.code_definitions || {});
      setPackagingMarkingDefinitions(packagingResponse.marking_code_definitions || {});
      setPackagingFetched(true);
    } catch (error) {
      console.error('Packaging fetch error:', error);
      setPackagingError(error instanceof Error ? error.message : 'Failed to load packaging information');
    } finally {
      setIsLoadingPackaging(false);
    }
  }, [part.nsn, packagingFetched, isLoadingPackaging]);

  // Handle tab change with lazy loading
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as TabId);
    if (tabId === 'procurement' && !procurementFetched) {
      fetchProcurementHistory();
    } else if (tabId === 'solicitations' && !solicitationsFetched) {
      fetchSolicitations();
    } else if (tabId === 'manufacturers' && !manufacturersFetched) {
      fetchManufacturers();
    } else if (tabId === 'technical' && !technicalFetched) {
      fetchTechnicalCharacteristics();
    } else if (tabId === 'enduse' && !endUseFetched) {
      fetchEndUseDescriptions();
    } else if (tabId === 'packaging' && !packagingFetched) {
      fetchPackaging();
    }
  }, [procurementFetched, fetchProcurementHistory, solicitationsFetched, fetchSolicitations, manufacturersFetched, fetchManufacturers, technicalFetched, fetchTechnicalCharacteristics, endUseFetched, fetchEndUseDescriptions, packagingFetched, fetchPackaging]);

  // Build tabs dynamically with counts
  const tabs = [
    { id: "overview" as TabId, label: "Overview", disabled: false },
    {
      id: "procurement" as TabId,
      label: procurementFetched && procurementTotal > 0 ? `Procurement History (${procurementTotal})` : "Procurement History",
      disabled: false
    },
    {
      id: "solicitations" as TabId,
      label: solicitationsFetched && solicitationsTotal > 0 ? `Recent Solicitations (${solicitationsTotal})` : "Recent Solicitations",
      disabled: false
    },
    {
      id: "manufacturers" as TabId,
      label: manufacturersFetched && manufacturersTotal > 0 ? `Manufacturers (${manufacturersTotal})` : "Manufacturers",
      disabled: false
    },
    {
      id: "technical" as TabId,
      label: technicalFetched && technicalTotal > 0 ? `Technical Characteristics (${technicalTotal})` : "Technical Characteristics",
      disabled: false
    },
    {
      id: "enduse" as TabId,
      label: "End Use Description",
      disabled: false
    },
    {
      id: "packaging" as TabId,
      label: "Packaging Information",
      disabled: false
    },
  ];

  return (
    <div className="bg-card-bg rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted-light">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">
              {formatNSN(part.nsn) || part.nsn}
            </h2>
            {part.description && (
              <p className="text-xs text-muted truncate mt-1">{part.description}</p>
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
        <TabPanel tabId="overview" activeTab={activeTab}>
          <OverviewPanel part={part} />
        </TabPanel>

        <TabPanel tabId="procurement" activeTab={activeTab}>
          <ProcurementPanel
            records={procurementRecords}
            totalCount={procurementTotal}
            isLoading={isLoadingProcurement}
            error={procurementError}
            onRetry={fetchProcurementHistory}
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

        <TabPanel tabId="manufacturers" activeTab={activeTab}>
          <ManufacturersPanel
            manufacturers={manufacturers}
            totalCount={manufacturersTotal}
            isLoading={isLoadingManufacturers}
            error={manufacturersError}
            onRetry={fetchManufacturers}
          />
        </TabPanel>

        <TabPanel tabId="technical" activeTab={activeTab}>
          <TechnicalCharacteristicsPanel
            characteristics={technicalCharacteristics}
            totalCount={technicalTotal}
            isLoading={isLoadingTechnical}
            error={technicalError}
            onRetry={fetchTechnicalCharacteristics}
          />
        </TabPanel>

        <TabPanel tabId="enduse" activeTab={activeTab}>
          <EndUseDescriptionPanel
            descriptions={endUseDescriptions}
            totalCount={endUseTotal}
            isLoading={isLoadingEndUse}
            error={endUseError}
            onRetry={fetchEndUseDescriptions}
          />
        </TabPanel>

        <TabPanel tabId="packaging" activeTab={activeTab}>
          <PackagingPanel
            packaging={packaging}
            codeDefinitions={packagingCodeDefinitions}
            markingDefinitions={packagingMarkingDefinitions}
            isLoading={isLoadingPackaging}
            error={packagingError}
            onRetry={fetchPackaging}
          />
        </TabPanel>
      </div>
    </div>
  );
}

// Overview Panel
interface OverviewPanelProps {
  part: PartDetailType;
}

function OverviewPanel({ part }: OverviewPanelProps) {
  const identifiers = [
    { label: "NSN", value: formatNSN(part.nsn), mono: true },
    { label: "NIIN", value: part.niin, mono: true },
    { label: "FSC", value: part.fsc, mono: true },
  ].filter(item => item.value);

  const partInfo = [
    { label: "Description", value: part.description },
    { label: "Unit of Issue", value: part.unit_of_issue },
    { label: "Unit Price", value: part.unit_price ? formatCurrency(part.unit_price) : null },
  ].filter(item => item.value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left Column: Identifiers */}
      <div className="bg-muted-light rounded-lg p-3">
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

      {/* Right Column: Part Info */}
      <div className="bg-muted-light rounded-lg p-3">
        <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">
          Part Information
        </h3>
        <div className="space-y-1.5">
          {partInfo.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-2">
              <span className="text-xs text-muted flex-shrink-0">{item.label}</span>
              <span className="text-xs font-medium text-foreground text-right">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Procurement History Panel
interface ProcurementPanelProps {
  records: PartProcurementRecord[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function ProcurementPanel({ records, totalCount, isLoading, error, onRetry }: ProcurementPanelProps) {
  const columns = useMemo<ColumnDef<PartProcurementRecord>[]>(
    () => [
      {
        id: "contract_number",
        accessorKey: "contract_number",
        header: "Contract #",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.contract_number || "—"}</span>
        ),
      },
      {
        id: "contract_date",
        accessorKey: "contract_date",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-xs">{formatContractDate(row.original.contract_date)}</span>
        ),
      },
      {
        id: "cage_code",
        accessorKey: "cage_code",
        header: "CAGE",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            {row.original.cage_code || "—"}
          </span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "vendor_name",
        accessorKey: "vendor_name",
        header: "Vendor",
        cell: ({ row }) => (
          <span className="text-xs truncate max-w-[200px]">
            {row.original.vendor_name || "—"}
          </span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "quantity",
        accessorKey: "quantity",
        header: () => <span className="w-full text-right block">Qty</span>,
        cell: ({ row }) => (
          <span className="text-right block text-xs">
            {formatNumber(row.original.quantity)}
          </span>
        ),
      },
      {
        id: "unit_price",
        accessorKey: "unit_price",
        header: () => <span className="w-full text-right block">Unit Price</span>,
        cell: ({ row }) => (
          <span className="text-right block text-xs">
            {formatCurrency(row.original.unit_price)}
          </span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "total_value",
        accessorKey: "total_value",
        header: () => <span className="w-full text-right block">Total</span>,
        cell: ({ row }) => (
          <span className="text-right block text-xs font-medium">
            {formatCurrency(row.original.total_value)}
          </span>
        ),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading procurement history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-error mb-2">{error}</p>
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">No procurement history found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted">
        Showing {records.length} of {totalCount} records
      </div>
      <DataTable
        data={records}
        columns={columns}
        getRowId={(row) => row.id.toString()}
        exportFilename="part-procurement-history"
        config={{
          features: {
            sorting: true,
            multiSort: false,
            rowSelection: false,
            copyRow: true,
            export: false,
          },
        }}
      />
    </div>
  );
}

// Solicitations Panel
interface SolicitationsPanelProps {
  solicitations: PartSolicitation[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function SolicitationsPanel({ solicitations, totalCount, isLoading, error, onRetry }: SolicitationsPanelProps) {
  const columns = useMemo<ColumnDef<PartSolicitation>[]>(
    () => [
      {
        id: "close_date",
        accessorKey: "close_date",
        header: "Close Date",
        cell: ({ row }) => (
          <span className="text-xs">{formatContractDate(row.original.close_date)}</span>
        ),
      },
      {
        id: "solicitation_number",
        accessorKey: "solicitation_number",
        header: "Solicitation #",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.solicitation_number}</span>
        ),
      },
      {
        id: "agency_code",
        accessorKey: "agency_code",
        header: "Agency",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.agency_code || "—"}</span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "quantity",
        accessorKey: "quantity",
        header: () => <span className="w-full text-right block">Qty</span>,
        cell: ({ row }) => (
          <span className="text-right block text-xs">
            {formatNumber(row.original.quantity)}
          </span>
        ),
      },
      {
        id: "estimated_value",
        accessorKey: "estimated_value",
        header: () => <span className="w-full text-right block">Est. Value</span>,
        cell: ({ row }) => (
          <span className="text-right block text-xs font-medium">
            {formatCurrency(row.original.estimated_value)}
          </span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "set_aside",
        accessorKey: "set_aside",
        header: "Set-Aside",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.set_aside || "—"}</span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading solicitations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-error mb-2">{error}</p>
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (solicitations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">No recent solicitations found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted">
        Showing {solicitations.length} of {totalCount} solicitations
      </div>
      <DataTable
        data={solicitations}
        columns={columns}
        getRowId={(row) => row.solicitation_id.toString()}
        exportFilename="part-solicitations"
        config={{
          features: {
            sorting: true,
            multiSort: false,
            rowSelection: false,
            copyRow: true,
            export: false,
          },
        }}
      />
    </div>
  );
}

// Manufacturers Panel
interface ManufacturersPanelProps {
  manufacturers: PartManufacturer[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function ManufacturersPanel({ manufacturers, totalCount, isLoading, error, onRetry }: ManufacturersPanelProps) {
  const columns = useMemo<ColumnDef<PartManufacturer>[]>(
    () => [
      {
        id: "cage_code",
        accessorKey: "cage_code",
        header: "CAGE",
        cell: ({ row }) => (
          <Link
            href={`/library/vendor-search?cage_code=${encodeURIComponent(row.original.cage_code)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono font-semibold text-primary text-xs hover:underline cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.cage_code}
          </Link>
        ),
      },
      {
        id: "vendor_name",
        accessorKey: "vendor_name",
        header: "Vendor Name",
        cell: ({ row }) => (
          <span className="text-xs truncate max-w-[300px]">
            {row.original.vendor_name || "—"}
          </span>
        ),
      },
      {
        id: "part_number",
        accessorKey: "part_number",
        header: "Part Number",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted">
            {row.original.part_number || "—"}
          </span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "rncc",
        accessorKey: "rncc",
        header: "RNCC",
        cell: ({ row }) => (
          <span className="text-xs text-muted">
            {row.original.rncc || "—"}
          </span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "rnvc",
        accessorKey: "rnvc",
        header: "RNVC",
        cell: ({ row }) => (
          <span className="text-xs text-muted">
            {row.original.rnvc || "—"}
          </span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading manufacturers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-error mb-2">{error}</p>
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (manufacturers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">No manufacturers found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted">
        {totalCount} manufacturer{totalCount !== 1 ? "s" : ""} found
      </div>
      <DataTable
        data={manufacturers}
        columns={columns}
        getRowId={(row) => `${row.cage_code}-${row.part_number || ''}`}
        exportFilename="part-manufacturers"
        config={{
          features: {
            sorting: true,
            multiSort: false,
            rowSelection: false,
            copyRow: true,
            export: false,
          },
        }}
      />
    </div>
  );
}

// Technical Characteristics Panel
interface TechnicalCharacteristicsPanelProps {
  characteristics: PartTechnicalCharacteristic[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function TechnicalCharacteristicsPanel({ characteristics, totalCount, isLoading, error, onRetry }: TechnicalCharacteristicsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading technical characteristics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-error mb-2">{error}</p>
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (characteristics.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">No technical characteristics found</p>
      </div>
    );
  }

  return (
    <div className="text-xs text-foreground py-2 px-3 rounded border border-border/50 bg-card">
      {characteristics.map((char, index) => (
        <span key={`${char.name}-${index}`}>
          {char.name} - {char.value || "—"}
          {index < characteristics.length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}

// End Use Description Panel
interface EndUseDescriptionPanelProps {
  descriptions: EndUseDescription[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function EndUseDescriptionPanel({ descriptions, totalCount, isLoading, error, onRetry }: EndUseDescriptionPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading end use descriptions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-error mb-2">{error}</p>
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (descriptions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">No end use descriptions found</p>
      </div>
    );
  }

  return (
    <div className="text-xs text-foreground py-2 px-3 rounded border border-border/50 bg-card">
      {descriptions.map((desc, index) => (
        <span key={`${desc.description}-${index}`}>
          {desc.description}
          {index < descriptions.length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}

// Packaging Information Panel
interface PackagingPanelProps {
  packaging: PartPackaging | null;
  codeDefinitions: Record<string, string>;
  markingDefinitions: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function PackagingPanel({ packaging, codeDefinitions, markingDefinitions, isLoading, error, onRetry }: PackagingPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading packaging information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-error mb-2">{error}</p>
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!packaging) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">No packaging information found</p>
      </div>
    );
  }

  // Helper function to get code definition
  const getCodeDefinition = (code: string | null): string | null => {
    if (!code) return null;
    // Try exact match first, then try trimmed, then try uppercase
    const trimmedCode = code.trim();
    const upperCode = code.toUpperCase().trim();
    return codeDefinitions[code] || 
           codeDefinitions[trimmedCode] || 
           codeDefinitions[upperCode] ||
           markingDefinitions[code] || 
           markingDefinitions[trimmedCode] || 
           markingDefinitions[upperCode] || 
           null;
  };

  // Helper function to render a code with tooltip
  const renderCode = (code: string | null, fieldName: string, uniqueId: number) => {
    if (!code) return "—";
    
    const definition = getCodeDefinition(code);
    const hasDefinition = !!definition;

    if (hasDefinition) {
      return (
        <span
          key={`${fieldName}-code-${uniqueId}`}
          className="text-primary cursor-help underline decoration-dotted hover:decoration-solid"
          title={definition || undefined}
          data-tooltip={definition || undefined}
          aria-label={definition ? `${code}: ${definition}` : code}
        >
          {code}
        </span>
      );
    }
    // Still show as blue/underlined even without definition for consistency
    return (
      <span 
        key={`${fieldName}-code-${uniqueId}`}
        className="text-primary"
      >
        {code}
      </span>
    );
  };

  // Build the packaging information text
  const buildPackagingText = () => {
    const parts: JSX.Element[] = [];
    let lineIndex = 0;
    let codeIndex = 0;

    // Line 1: QUP, PRES MTHD, CLNG/DRY, PRESV MAT
    const line1Parts: (string | JSX.Element)[] = [];
    if (packaging.qup) {
      line1Parts.push("QUP = ", renderCode(packaging.qup, 'qup', codeIndex++), ": ");
    }
    if (packaging.pres_mthd) {
      line1Parts.push("PRES MTHD = ", renderCode(packaging.pres_mthd, 'pres_mthd', codeIndex++), ": ");
    }
    if (packaging.clng_dry) {
      line1Parts.push("CLNG/DRY = ", renderCode(packaging.clng_dry, 'clng_dry', codeIndex++), ": ");
    }
    if (packaging.presv_mat) {
      line1Parts.push("PRESV MAT = ", renderCode(packaging.presv_mat, 'presv_mat', codeIndex++), ": ");
    }
    if (line1Parts.length > 0) {
      parts.push(<span key={`line-${lineIndex++}`}>{line1Parts}</span>);
      parts.push(<br key={`br-${lineIndex++}`} />);
    }

    // Line 2: WRAP MAT, CUSH/DUNN MAT, CUSH/DUNN THKNESS
    const line2Parts: (string | JSX.Element)[] = [];
    if (packaging.wrap_mat) {
      line2Parts.push("WRAP MAT = ", renderCode(packaging.wrap_mat, 'wrap_mat', codeIndex++), ": ");
    }
    if (packaging.cush_dunn_mat) {
      line2Parts.push("CUSH/DUNN MAT = ", renderCode(packaging.cush_dunn_mat, 'cush_dunn_mat', codeIndex++), ": ");
    }
    if (packaging.cush_dunn_thkness) {
      line2Parts.push("CUSH/DUNN THKNESS = ", renderCode(packaging.cush_dunn_thkness, 'cush_dunn_thkness', codeIndex++), ": ");
    }
    if (line2Parts.length > 0) {
      parts.push(<span key={`line-${lineIndex++}`}>{line2Parts}</span>);
      parts.push(<br key={`br-${lineIndex++}`} />);
    }

    // Line 3: UNIT CONT, OPI
    const line3Parts: (string | JSX.Element)[] = [];
    if (packaging.unit_cont) {
      line3Parts.push("UNIT CONT = ", renderCode(packaging.unit_cont, 'unit_cont', codeIndex++), ": ");
    }
    if (packaging.opi) {
      line3Parts.push("OPI = ", renderCode(packaging.opi, 'opi', codeIndex++), ": ");
    }
    if (line3Parts.length > 0) {
      parts.push(<span key={`line-${lineIndex++}`}>{line3Parts}</span>);
      parts.push(<br key={`br-${lineIndex++}`} />);
    }

    // Line 4: INTRMDTE CONT, INTRMDTE CONT QTY
    const line4Parts: (string | JSX.Element)[] = [];
    if (packaging.intrcdte_cont) {
      line4Parts.push("INTRMDTE CONT = ", renderCode(packaging.intrcdte_cont, 'intrcdte_cont', codeIndex++), ": ");
    }
    if (packaging.intrcdte_cont_qty) {
      line4Parts.push("INTRMDTE CONT QTY = ", renderCode(packaging.intrcdte_cont_qty, 'intrcdte_cont_qty', codeIndex++), ": ");
    }
    if (line4Parts.length > 0) {
      parts.push(<span key={`line-${lineIndex++}`}>{line4Parts}</span>);
      parts.push(<br key={`br-${lineIndex++}`} />);
    }

    // Display packaging_data column if it exists
    if (packaging.packaging_data) {
      if (parts.length > 0) {
        parts.push(<br key="br-packaging-data" />);
      }
      parts.push(<span key="packaging-data">{packaging.packaging_data}</span>);
    }

    // Display marking_text column if it exists (with two line breaks before it)
    if (packaging.marking_text) {
      if (parts.length > 0) {
        parts.push(<br key="br-marking-text-1" />);
        parts.push(<br key="br-marking-text-2" />);
      }
      parts.push(<span key="marking-text">{packaging.marking_text}</span>);
    } else if (packaging.special_marking_code) {
      // Fall back to special marking code if marking_text doesn't exist
      if (parts.length > 0) {
        parts.push(<br key="br-marking" />);
      }
      const markingDef = markingDefinitions[packaging.special_marking_code];
      const markingParts: (string | JSX.Element)[] = ["SPECIAL MARKING CODE: ", renderCode(packaging.special_marking_code, 'special_marking_code', codeIndex++)];
      if (markingDef) {
        markingParts.push(" - ", markingDef);
      }
      parts.push(<span key="special-marking">{markingParts}</span>);
    }

    return parts;
  };

  return (
    <div className="text-xs text-foreground py-2 px-3 rounded border border-border/50 bg-card">
      {buildPackagingText()}
    </div>
  );
}
