"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";

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
  ProcurementItemDescription,
  ProcurementItemDescriptionResponse,
  formatNSN,
  formatNiin,
  formatCurrency,
  formatNumber,
  formatContractDate,
} from "@/lib/library/types";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";

// ============================================================================
// CodeTooltip Component - Shared tooltip for code definitions
// ============================================================================
// This component provides consistent tooltip styling across the application.
// It matches the look and feel of tooltips on the packaging information tab.
//
// Usage:
//   <CodeTooltip
//     code="20"
//     title="Acquisition Method Code (AMC)"
//     content="Description of the code..."
//     codeType="AMC"
//   >
//     <span>20</span>
//   </CodeTooltip>
//
// Props:
//   - code: The code value (e.g., "20", "1", "A")
//   - title: The tooltip title/header (e.g., "Acquisition Method Code (AMC)")
//   - content: The tooltip content/description
//   - codeType: The code type (e.g., "AMC", "SLC", "PIC") - used to build "learn more" link
//   - children: The element that triggers the tooltip (typically the code value)
//
// Features:
//   - Smart positioning (above/below, left/right/center based on available space)
//   - Content truncation at 150 characters with "Click to learn more" link
//   - Clickable link to code definitions page when codeType is provided
//   - Styled with header section and content section
//   - Fixed positioning to avoid overflow clipping
// ============================================================================

interface CodeTooltipProps {
  code: string;
  title: string;
  content: string;
  codeType: string | null;
  children: React.ReactNode;
}

function CodeTooltip({ code, title, content, codeType, children }: CodeTooltipProps) {
  // Truncate content at 150 characters
  const TRUNCATE_LENGTH = 150;
  const shouldTruncate = content.length > TRUNCATE_LENGTH;
  const truncatedContent = shouldTruncate 
    ? content.substring(0, TRUNCATE_LENGTH) + '...'
    : content;

  // Build learn more URL if we have codeType
  const learnMoreUrl = codeType 
    ? `/library/code-definitions?code_type=${encodeURIComponent(codeType)}&code_value=${encodeURIComponent(code)}`
    : null;

  // Format tooltip text for native title attribute (plain text, no HTML)
  // Format: "Title\nContent" (newline separates title and content)
  const tooltipText = title && content
    ? `${title}\n${truncatedContent}`
    : title || truncatedContent || '';

  // Use state for hover-based tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  // Calculate tooltip position based on available space (using fixed positioning to avoid overflow clipping)
  useEffect(() => {
    if (showTooltip && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipWidth = tooltipRect.width || 288; // w-72 = 18rem = 288px
      const tooltipHeight = tooltipRect.height || 200;
      const spacing = 8; // mb-2 = 0.5rem = 8px
      
      // Calculate space on left and right
      const spaceOnLeft = triggerRect.left;
      const spaceOnRight = viewportWidth - triggerRect.right;
      const spaceOnTop = triggerRect.top;
      const spaceOnBottom = viewportHeight - triggerRect.bottom;
      
      // Calculate horizontal position
      let left: number;
      if (spaceOnLeft < tooltipWidth && spaceOnRight >= tooltipWidth) {
        // Not enough space on left, use right alignment
        left = triggerRect.right - tooltipWidth;
      } else if (spaceOnRight < tooltipWidth && spaceOnLeft >= tooltipWidth) {
        // Not enough space on right, use left alignment
        left = triggerRect.left;
      } else if (spaceOnLeft >= tooltipWidth / 2 && spaceOnRight >= tooltipWidth / 2) {
        // Center the tooltip
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
      } else {
        // Default to left if we can't determine, but ensure it doesn't overflow
        left = spaceOnRight > spaceOnLeft 
          ? Math.max(8, triggerRect.right - tooltipWidth) // Right align with margin
          : Math.min(triggerRect.left, viewportWidth - tooltipWidth - 8); // Left align with margin
      }
      
      // Ensure tooltip doesn't go off-screen horizontally
      left = Math.max(8, Math.min(left, viewportWidth - tooltipWidth - 8));
      
      // Calculate vertical position - prefer above, fallback to below if not enough space
      let top: number;
      if (spaceOnTop >= tooltipHeight + spacing) {
        // Show above the trigger
        top = triggerRect.top - tooltipHeight - spacing;
      } else if (spaceOnBottom >= tooltipHeight + spacing) {
        // Show below the trigger
        top = triggerRect.bottom + spacing;
      } else {
        // Not enough space above or below, show above but adjust to fit
        top = Math.max(8, triggerRect.top - tooltipHeight - spacing);
      }
      
      setTooltipStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 9999,
      });
    }
  }, [showTooltip]);

  // If no tooltip content at all, just return children without styling
  if (!tooltipText) {
    return <>{children}</>;
  }

  // Render children as link if codeType is available, otherwise just the children
  const codeElement = codeType && learnMoreUrl ? (
    <Link
      href={learnMoreUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary cursor-pointer underline decoration-dotted hover:decoration-solid"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  ) : (
    children
  );

  return (
    <span
      ref={triggerRef}
      className={`relative inline-block ${codeType && learnMoreUrl ? '' : 'text-primary cursor-help underline decoration-dotted hover:decoration-solid'}`}
      aria-label={title ? `${title}: ${truncatedContent}` : truncatedContent}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {codeElement}
      {/* Custom tooltip on hover - show if we have content */}
      {showTooltip && tooltipText && (
        <span 
          ref={tooltipRef}
          style={tooltipStyle}
          className="fixed w-72 max-w-[90vw] text-xs rounded shadow-lg pointer-events-auto whitespace-normal break-words overflow-hidden bg-card-bg border border-border text-foreground"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {title && (
            <div className="font-bold px-2 py-1.5 bg-muted-light text-foreground">
              {title}
            </div>
          )}
          <div className="p-2">
            {truncatedContent}
            {shouldTruncate && codeType && (
              <div className="mt-2 pt-2 border-t border-border text-muted text-[11px]">
                Click to learn more
              </div>
            )}
          </div>
        </span>
      )}
    </span>
  );
}

interface PartDetailProps {
  part: PartDetailType;
}

type TabId = "overview" | "procurement" | "solicitations" | "manufacturers" | "technical" | "enduse" | "packaging" | "procurementitemdesc";

export function PartDetail({ part }: PartDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  
  // Code definitions for tooltips
  const [codeDefinitions, setCodeDefinitions] = useState<Record<string, string>>({});
  // Code type names mapping (e.g., "AMC" -> "Acquisition Method Code")
  const [codeTypeNames, setCodeTypeNames] = useState<Record<string, string>>({});

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

  // Procurement item description state
  const [procurementItemDescription, setProcurementItemDescription] = useState<ProcurementItemDescription | null>(null);
  const [isLoadingProcurementItemDesc, setIsLoadingProcurementItemDesc] = useState(false);
  const [procurementItemDescError, setProcurementItemDescError] = useState<string | null>(null);
  const [procurementItemDescFetched, setProcurementItemDescFetched] = useState(false);

  // Fetch code definitions on component mount for overview tooltips
  useEffect(() => {
    const fetchCodeDefinitions = async () => {
      try {
        const response = await fetch('/api/library/code-definitions');
        if (response.ok) {
          const data = await response.json();
          
          // Build a flat dictionary of code definitions
          const definitions: Record<string, string> = {};
          // Build a mapping of code types to their display names
          const typeNames: Record<string, string> = {};
          
          // Fallback to hardcoded names - set these first as defaults
          const CODE_TYPE_NAMES_FALLBACK: Record<string, string> = {
            'AMC': 'Acquisition Method Code',
            'IDS': 'Item Description Segment',
            'PIC': 'Procurement Info Code',
            'SLC': 'Shelf Life Code',
            'PMC': 'Preservation Method Codes',
            'CPMC': 'Contact Preservative Material Codes',
            'WMC': 'Wrapping Material Codes',
            'CDMC': 'Critical Design Manufacturing Code',
            'TCDC': 'Thickness of Cushioning or Dunnage Codes',
            'UICC': 'Unit and Intermediate Container Codes',
            'OPIC': 'Optional Procedure Indicator Codes',
            'CPC': 'Cleaning Procedure Codes',
            'QUPC': 'Quantity Per Unit Pack Codes',
          };
          
          // Initialize with fallback names
          Object.assign(typeNames, CODE_TYPE_NAMES_FALLBACK);
          
          data.code_types.forEach((codeType: any) => {
            // Store code type name (e.g., "AMC" -> "Acquisition Method Code")
            // Use code_name from API if available, otherwise keep fallback
            if (codeType.code_name) {
              typeNames[codeType.code_type] = codeType.code_name;
            }
            // If no code_name from API, the fallback name is already set
            
            codeType.codes.forEach((code: any) => {
              // Create keys like "AMC:20", "SLC:1", etc. for easy lookup
              // code.code_value is already extracted (without type prefix) by backend
              const codeValue = String(code.code_value || '').trim();
              if (!codeValue) return;
              
              const key = `${codeType.code_type}:${codeValue}`;
              definitions[key] = code.description;
              
              // Also add uppercase/lowercase variations for case-insensitive lookup
              definitions[`${codeType.code_type}:${codeValue.toUpperCase()}`] = code.description;
              definitions[`${codeType.code_type}:${codeValue.toLowerCase()}`] = code.description;
              
              // For AMC codes, also create AQM and AMS keys (AMC codes are 2 chars: first=AQM, second=AMS)
              if (codeType.code_type === 'AMC' && codeValue.length === 2) {
                definitions[`AQM:${codeValue[0]}`] = code.description;
                definitions[`AMS:${codeValue[1]}`] = code.description;
              }
            });
          });
          
          console.log('Code definitions loaded. Total keys:', Object.keys(definitions).length);
          console.log('Code type names:', typeNames);
          
          setCodeDefinitions(definitions);
          setCodeTypeNames(typeNames);
        }
      } catch (error) {
        console.error('Failed to fetch code definitions:', error);
      }
    };

    fetchCodeDefinitions();
  }, []);

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

  // Fetch procurement item description when tab is clicked (lazy loading)
  const fetchProcurementItemDescription = useCallback(async () => {
    if (procurementItemDescFetched || isLoadingProcurementItemDesc) return;

    setIsLoadingProcurementItemDesc(true);
    setProcurementItemDescError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(part.nsn)}/procurement-item-description`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load procurement item description');
      }

      const descriptionResponse = data as ProcurementItemDescriptionResponse;
      setProcurementItemDescription(descriptionResponse.description);
      setProcurementItemDescFetched(true);
    } catch (error) {
      console.error('Procurement item description fetch error:', error);
      setProcurementItemDescError(error instanceof Error ? error.message : 'Failed to load procurement item description');
    } finally {
      setIsLoadingProcurementItemDesc(false);
    }
  }, [part.nsn, procurementItemDescFetched, isLoadingProcurementItemDesc]);

  // Eager-load all tab data when part is selected so counts show on tabs before click
  useEffect(() => {
    if (!part?.nsn) return;
    fetchProcurementHistory();
    fetchSolicitations();
    fetchManufacturers();
    fetchTechnicalCharacteristics();
    fetchEndUseDescriptions();
    fetchPackaging();
    fetchProcurementItemDescription();
  }, [part?.nsn, fetchProcurementHistory, fetchSolicitations, fetchManufacturers, fetchTechnicalCharacteristics, fetchEndUseDescriptions, fetchPackaging, fetchProcurementItemDescription]);

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
    } else if (tabId === 'procurementitemdesc' && !procurementItemDescFetched) {
      fetchProcurementItemDescription();
    }
  }, [procurementFetched, fetchProcurementHistory, solicitationsFetched, fetchSolicitations, manufacturersFetched, fetchManufacturers, technicalFetched, fetchTechnicalCharacteristics, endUseFetched, fetchEndUseDescriptions, packagingFetched, fetchPackaging, procurementItemDescFetched, fetchProcurementItemDescription]);

  // Build tabs dynamically with counts (show count when fetched, including 0)
  const tabs = [
    { id: "overview" as TabId, label: "Overview", disabled: false },
    {
      id: "procurement" as TabId,
      label: procurementFetched ? `Procurement History (${procurementTotal})` : "Procurement History",
      disabled: false
    },
    {
      id: "solicitations" as TabId,
      label: solicitationsFetched ? `Recent Solicitations (${solicitationsTotal})` : "Recent Solicitations",
      disabled: false
    },
    {
      id: "manufacturers" as TabId,
      label: manufacturersFetched ? `Manufacturers (${manufacturersTotal})` : "Manufacturers",
      disabled: false
    },
    {
      id: "technical" as TabId,
      label: technicalFetched ? `Technical Characteristics (${technicalTotal})` : "Technical Characteristics",
      disabled: false
    },
    {
      id: "enduse" as TabId,
      label: endUseFetched ? `End Use Description (${endUseTotal})` : "End Use Description",
      disabled: false
    },
    {
      id: "packaging" as TabId,
      label: packagingFetched ? `Packaging Information (${packaging ? 1 : 0})` : "Packaging Information",
      disabled: false
    },
    {
      id: "procurementitemdesc" as TabId,
      label: procurementItemDescFetched ? `Procurement Item Description (${procurementItemDescription?.has_description && procurementItemDescription?.description?.trim() ? 1 : 0})` : "Procurement Item Description",
      disabled: false
    },
  ];

  return (
    <div className="bg-card-bg rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted-light">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold text-foreground">
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
      <div className="p-3">
        <TabPanel tabId="overview" activeTab={activeTab}>
          <OverviewPanel part={part} codeDefinitions={codeDefinitions} codeTypeNames={codeTypeNames} />
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

        <TabPanel tabId="procurementitemdesc" activeTab={activeTab}>
          <ProcurementItemDescriptionPanel
            description={procurementItemDescription}
            isLoading={isLoadingProcurementItemDesc}
            error={procurementItemDescError}
            onRetry={fetchProcurementItemDescription}
          />
        </TabPanel>
      </div>
    </div>
  );
}

// Overview Panel
interface OverviewPanelProps {
  part: PartDetailType;
  codeDefinitions: Record<string, string>;
  codeTypeNames: Record<string, string>;
}

function OverviewPanel({ part, codeDefinitions, codeTypeNames }: OverviewPanelProps) {
  const identifiers = [
    { label: "NSN", value: formatNSN(part.nsn), mono: true },
    { label: "NIIN", value: formatNiin(part.niin), mono: true },
    { label: "FSC", value: part.fsc, mono: true },
  ].filter(item => item.value);


  // Helper function to render code with tooltip (handles null values)
  const renderCodeWithTooltip = (code: string | null, codeType: string, label: string) => {
    let definition = 'No code available';
    let definitionKey = null;
    
    if (code) {
      // Try multiple lookup formats to match PHP logic
      const codeStr = code.trim();
      
      // Primary lookup: "CODE_TYPE:code_value"
      definitionKey = `${codeType}:${codeStr}`;
      definition = codeDefinitions[definitionKey] || '';
      
      // Try uppercase/lowercase variations
      if (!definition) {
        definition = codeDefinitions[`${codeType}:${codeStr.toUpperCase()}`] || 
                     codeDefinitions[`${codeType}:${codeStr.toLowerCase()}`] || '';
      }
      
      // For AMC codes, try splitting (AMC codes are 2 characters, first char = AQM, second = AMS)
      // PHP logic: splits AMC code and looks up "AQM {first}" and "AMS {second}"
      if (!definition && codeType === 'AMC' && codeStr.length === 2) {
        const aqmKey = `AQM:${codeStr[0]}`;
        const amsKey = `AMS:${codeStr[1]}`;
        const aqmDef = codeDefinitions[aqmKey];
        const amsDef = codeDefinitions[amsKey];
        if (aqmDef || amsDef) {
          const parts = [];
          if (aqmDef) parts.push(`AQM ${codeStr[0]}: ${aqmDef}`);
          if (amsDef) parts.push(`AMS ${codeStr[1]}: ${amsDef}`);
          definition = parts.join(' / ');
        }
      }
      
      // For DLA/IDS, also try 'DLA' code type as fallback
      if (!definition && codeType === 'IDS') {
        const dlaKey = `DLA:${codeStr}`;
        definition = codeDefinitions[dlaKey] || '';
      }
      
      if (!definition) {
        definition = 'Code definition not available';
        console.log(`No definition found for ${codeType}:${codeStr}. Available keys:`, 
          Object.keys(codeDefinitions).filter(k => k.startsWith(codeType)).slice(0, 10));
      }
    }
    
    // Build title in format: "CODE_TYPE - Code Name" (e.g., "AMC - Acquisition Method Code")
    const codeTypeName = codeTypeNames[codeType] || codeType;
    const title = `${codeType} - ${codeTypeName}`;
    const content = definition;
    const displayValue = code || '—';
    
    return (
      <div key={codeType} className="flex items-center justify-between">
        <span className="text-xs text-muted font-medium">{label}</span>
        <span className="text-xs font-mono font-semibold">
          {code ? (
            <CodeTooltip
              code={code}
              title={title}
              content={content}
              codeType={codeType}
            >
              <span className="text-primary underline decoration-dotted hover:decoration-solid">
                {displayValue}
              </span>
            </CodeTooltip>
          ) : (
            <span className="text-muted">{displayValue}</span>
          )}
        </span>
      </div>
    );
  };

  // Always show these 4 codes, even if null
  // Code types match library_code_definitions table
  const codesToDisplay = [
    { code: part.idsind ?? part.ids_indicator ?? null, type: 'IDS', label: 'DLA' },  // ids_indicator uses 'IDS' code type
    { code: part.amcode ?? part.acquisition_method_code ?? null, type: 'AMC', label: 'AMC' },  // acquisition_method_code uses 'AMC' code type
    { code: part.picode ?? part.pi_code ?? null, type: 'PIC', label: 'PIC' },  // pi_code uses 'PIC' code type
    { code: part.slc ?? part.shelf_life_code ?? null, type: 'SLC', label: 'SLC' },     // shelf_life_code uses 'SLC' code type
  ];

  const partInfo = [
    { label: "Description", value: part.description },
    { label: "Unit of Issue", value: part.unit_of_issue },
    { label: "Standard Cost", value: part.gac != null ? formatCurrency(part.gac) : null },
  ].filter(item => item.value != null && item.value !== "");

  return (
    <div className="space-y-4">
      {/* Hero Card - Part Description */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/10">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m18 0A2.25 2.25 0 0119.5 19.5h-15A2.25 2.25 0 012.25 17.25m18 0V9a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 002.25 9v8.25" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground mb-2 leading-tight">
              {part.description || "Part Description Not Available"}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span className="font-mono font-medium text-primary">{formatNSN(part.nsn)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {/* Identifiers Card */}
        <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted-light border-b border-border">
            <h3 className="text-xs font-medium text-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.627 2.707-3.227V6.741c0-1.6-1.123-2.994-2.707-3.227A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.514C3.373 3.747 2.25 5.141 2.25 6.741v6.018z" />
              </svg>
              Identifiers
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {identifiers.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted font-medium">{item.label}</span>
                <span className="text-xs font-mono font-semibold text-primary bg-primary/5 px-2 py-1 rounded">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Part Details Card */}
        <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted-light border-b border-border">
            <h3 className="text-xs font-medium text-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              Part Details
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {partInfo.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted font-medium">{item.label}</span>
                <span className="text-xs font-medium text-foreground text-right max-w-[200px] break-words">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Codes Card - Always show the 4 required codes */}
        <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted-light border-b border-border">
            <h3 className="text-xs font-medium text-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
              Part Codes
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {codesToDisplay.map((item) => 
              renderCodeWithTooltip(item.code, item.type, item.label)
            )}
          </div>
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
  const [pdfModal, setPdfModal] = useState<{ id: number; contract: string } | null>(null);
  const pdfUrl = pdfModal ? `/api/library/awards/${pdfModal.id}/pdf` : null;

  const columns = useMemo<ColumnDef<PartProcurementRecord>[]>(
    () => [
      {
        id: "contract_number",
        accessorKey: "contract_number",
        header: "Contract #",
        cell: ({ row }) => {
          const rec = row.original;
          return (
            <span className="inline-flex items-center gap-1">
              <span className="text-xs font-mono font-semibold">{rec.contract_number || "—"}</span>
              {rec.has_pdf && rec.order_detail_id && (
                <button
                  type="button"
                  title="View award PDF"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPdfModal({ id: rec.order_detail_id!, contract: rec.contract_number || "" });
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
        id: "contract_date",
        accessorKey: "contract_date",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{formatContractDate(row.original.contract_date)}</span>
        ),
      },
      {
        id: "cage_code",
        accessorKey: "cage_code",
        header: "CAGE",
        cell: ({ row }) => (
          <span className="text-xs font-mono font-semibold text-primary">
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
          <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
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
          <span className="text-right block text-xs font-medium text-foreground">
            {formatNumber(row.original.quantity)}
          </span>
        ),
      },
      {
        id: "unit_price",
        accessorKey: "unit_price",
        header: () => <span className="w-full text-right block">Unit Price</span>,
        cell: ({ row }) => (
          <span className="text-right block text-xs font-medium text-foreground">
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
          <span className="text-right block text-xs font-semibold text-foreground">
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
          <span className="text-xs text-muted">Loading procurement history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-error mb-2">{error}</p>
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
      <div className="text-center py-6">
        <p className="text-xs text-muted">No procurement history found</p>
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
  const [pdfModal, setPdfModal] = useState<{ id: number; number: string } | null>(null);
  const pdfUrl = pdfModal ? `/api/library/solicitations/${pdfModal.id}/pdf` : null;

  const columns = useMemo<ColumnDef<PartSolicitation>[]>(
    () => [
      {
        id: "close_date",
        accessorKey: "close_date",
        header: "Close Date",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{formatContractDate(row.original.close_date)}</span>
        ),
      },
      {
        id: "solicitation_number",
        accessorKey: "solicitation_number",
        header: "Solicitation #",
        cell: ({ row }) => {
          const sol = row.original;
          return (
            <span className="inline-flex items-center gap-1">
              <span className="text-xs font-mono font-semibold">{sol.solicitation_number}</span>
              {sol.has_pdf && (
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
            </span>
          );
        },
      },
      {
        id: "buyer_name",
        accessorKey: "buyer_name",
        header: "Buyer",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.buyer_name || "—"}</span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "buyer_contact",
        accessorKey: "buyer_contact",
        header: "Buyer contact",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.buyer_contact || "—"}</span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "quantity",
        accessorKey: "quantity",
        header: () => <span className="w-full text-right block">Qty</span>,
        cell: ({ row }) => {
          const qty = row.original.quantity;
          const uom = row.original.quantity_unit;
          const display = qty != null
            ? (uom ? `${formatNumber(qty)}/${uom}` : formatNumber(qty))
            : "—";
          return (
            <span className="text-right block text-xs">
              {display}
            </span>
          );
        },
      },
      {
        id: "purchase_req",
        accessorKey: "purchase_req",
        header: "Purchase req",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.purchase_req || "—"}</span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.status || "—"}</span>
        ),
      },
      {
        id: "agency_code",
        accessorKey: "agency_code",
        header: "Agency",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.agency_code || "—"}</span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "estimated_value",
        accessorKey: "estimated_value",
        header: () => <span className="w-full text-right block">Est. Value</span>,
        cell: ({ row }) => (
          <span className="text-right block text-xs font-semibold text-foreground">
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
          <span className="text-xs font-medium text-foreground">{row.original.set_aside || "—"}</span>
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
          <span className="text-xs text-muted">Loading solicitations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-error mb-2">{error}</p>
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
      <div className="text-center py-6">
        <p className="text-xs text-muted">No recent solicitations found</p>
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
            className="text-xs font-mono font-semibold text-primary hover:underline cursor-pointer"
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
          <span className="text-xs font-medium text-foreground truncate max-w-[300px]">
            {row.original.vendor_name || "—"}
          </span>
        ),
      },
      {
        id: "part_number",
        accessorKey: "part_number",
        header: "Part Number",
        cell: ({ row }) => (
          <span className="text-xs font-mono font-semibold text-muted">
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
          <span className="text-xs font-medium text-muted">
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
          <span className="text-xs font-medium text-muted">
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
          <span className="text-xs text-muted">Loading manufacturers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-error mb-2">{error}</p>
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
      <div className="text-center py-6">
        <p className="text-xs text-muted">No manufacturers found</p>
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
            exportFormats: ["csv"],
            columnResize: false,
            columnVisibility: false,
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
          <span className="text-xs text-muted">Loading technical characteristics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-error mb-2">{error}</p>
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
      <div className="text-center py-6">
        <p className="text-xs text-muted">No technical characteristics found</p>
      </div>
    );
  }

  return (
    <div className="text-xs text-foreground py-1.5 px-2.5 rounded border border-border/50 bg-card">
      {characteristics.map((char, index) => (
        <span key={`${char.name}-${index}`}>
          <span className="font-medium text-muted">{char.name}</span> - <span className="font-medium text-foreground">{char.value || "—"}</span>
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
          <span className="text-xs text-muted">Loading end use descriptions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-error mb-2">{error}</p>
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
      <div className="text-center py-6">
        <p className="text-xs text-muted">No end use descriptions found</p>
      </div>
    );
  }

  return (
    <div className="text-xs text-foreground py-1.5 px-2.5 rounded border border-border/50 bg-card">
      {descriptions.map((desc, index) => (
        <span key={`${desc.description}-${index}`} className="font-medium">
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
  // Debug: Log received definitions
  useEffect(() => {
    if (Object.keys(codeDefinitions).length > 0) {
      console.log('PackagingPanel received codeDefinitions:', Object.keys(codeDefinitions).slice(0, 20));
      console.log('Sample definitions:', Object.entries(codeDefinitions).slice(0, 5));
    }
    if (Object.keys(markingDefinitions).length > 0) {
      console.log('PackagingPanel received markingDefinitions:', Object.keys(markingDefinitions));
    }
  }, [codeDefinitions, markingDefinitions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted">Loading packaging information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-error mb-2">{error}</p>
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
      <div className="text-center py-6">
        <p className="text-xs text-muted">No packaging information found</p>
      </div>
    );
  }

  // Map field names to code types (matching PHP production code)
  const CODE_TYPE_MAP: Record<string, string> = {
    'pres_mthd': 'PMC',  // Preservation Method Codes
    'presv_mat': 'CPMC',  // Contact Preservative Material Codes
    'wrap_mat': 'WMC',  // Wrapping Material Codes
    'cush_dunn_mat': 'CDMC',  // Cushioning and Dunnage Material Codes
    'cush_dunn_thkness': 'TCDC',  // Thickness of Cushioning or Dunnage Codes
    'unit_cont': 'UICC',  // Unit and Intermediate Container Codes
    'intrcdte_cont': 'UICC',  // Unit and Intermediate Container Codes
    'opi': 'OPIC',  // Optional Procedure Indicator Codes
    'clng_dry': 'CPC',  // Cleaning Procedure Codes
    'qup': 'QUPC',  // Quantity Per Unit Pack Codes
    'intrcdte_cont_qty': 'QUPC',  // Quantity Per Unit Pack Codes
  };

  // Map code types to their display titles (matching PHP production code)
  const CODE_TYPE_TITLES: Record<string, string> = {
    'CPC': 'Cleaning Procedure Codes (CPC)',
    'QUPC': 'Quantity Per Unit Pack Codes (QUPC)',
    'PMC': 'Preservation Method Codes (PMC)',
    'CPMC': 'Contact Preservative Material Codes (CPMC)',
    'WMC': 'Wrapping Material Codes (WMC)',
    'CDMC': 'Cushioning and Dunnage Material Codes (CDMC)',
    'TCDC': 'Thickness of Cushioning or Dunnage Codes (TCDC)',
    'UICC': 'Unit and Intermediate Container Codes (UICC)',
    'OPIC': 'Optional Procedure Indicator Codes (OPIC)',
  };

  // Helper function to get code definition using code_type:code format
  // NOTE: Do NOT fallback to markingDefinitions for regular codes - only use for special_marking_code field
  const getCodeDefinition = (code: string | null, codeType: string | null): string | null => {
    if (!code) return null;
    
    const codeStr = String(code).trim();
    const codeUpper = codeStr.toUpperCase();
    const codeLower = codeStr.toLowerCase();
    
    // Try composite key first: "code_type:code" with various case variations
    if (codeType) {
      const keys = [
        `${codeType}:${codeStr}`,
        `${codeType}:${codeUpper}`,
        `${codeType}:${codeLower}`,
        `${codeType}:${codeStr.padStart(2, '0')}`,  // Try zero-padded (e.g., "1" -> "01")
        `${codeType}:${codeStr.padStart(3, '0')}`,  // Try zero-padded (e.g., "1" -> "001")
      ];
      
      for (const key of keys) {
        if (codeDefinitions[key]) {
          return codeDefinitions[key];
        }
      }
      
      // Debug logging for missing definitions
      if (Object.keys(codeDefinitions).length > 0) {
        console.log(`[PackagingTooltip] Looking for code: ${code}, type: ${codeType}, tried keys:`, keys);
        console.log(`[PackagingTooltip] Available keys (first 20):`, Object.keys(codeDefinitions).slice(0, 20));
      }
    }
    
    // Fallback: try without code_type (for backward compatibility) - but NOT markingDefinitions
    const fallbackKeys = [codeStr, codeUpper, codeLower, codeStr.padStart(2, '0'), codeStr.padStart(3, '0')];
    for (const key of fallbackKeys) {
      if (codeDefinitions[key]) return codeDefinitions[key];
      // Do NOT check markingDefinitions here - only for special_marking_code field
    }
    
    return null;
  };

  // Helper function to get marking code definition (only for special_marking_code field)
  const getMarkingDefinition = (code: string | null): string | null => {
    if (!code) return null;
    const codeStr = String(code).trim();
    return markingDefinitions[codeStr] || markingDefinitions[codeStr.toUpperCase()] || markingDefinitions[codeStr.toLowerCase()] || null;
  };

  // CodeTooltip is defined at the top level of the file - use the shared component

  // Helper function to render a code with tooltip
  const renderCode = (code: string | null, fieldName: string, uniqueId: number) => {
    if (!code) return "—";
    
    const codeType = CODE_TYPE_MAP[fieldName] || null;
    const definition = getCodeDefinition(code, codeType);
    const title = codeType ? CODE_TYPE_TITLES[codeType] || '' : '';
    // Format content as: "{code_type} {code_value}: {definition}" (matching production format)
    const content = definition && codeType 
      ? `${codeType} ${code}: ${definition}`
      : definition || '';

    if (definition) {
      return (
        <CodeTooltip
          key={`${fieldName}-code-${uniqueId}`}
          code={code}
          title={title}
          content={content}
          codeType={codeType}
        >
          <span>{code}</span>
        </CodeTooltip>
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

  // Helper to check if QUP should have tooltip
  // PHP logic: if ( ($qupValue > 0) && ($qupValue <= 999) ) -> NO tooltip, else -> tooltip
  // So show tooltip when: non-numeric (like "AAA"), or value <= 0, or value > 999
  const shouldShowQUPTooltip = (qupValue: string | null): boolean => {
    if (!qupValue) return false;
    const numValue = parseInt(qupValue, 10);
    // If not a valid number (NaN), show tooltip (e.g., "AAA")
    if (isNaN(numValue)) return true;
    // If value is <= 0 or > 999, show tooltip
    return numValue <= 0 || numValue > 999;
  };

  // Build the packaging information text
  const buildPackagingText = () => {
    const parts: React.ReactElement[] = [];
    let lineIndex = 0;
    let codeIndex = 0;

    // Line 1: QUP, PRES MTHD, CLNG/DRY, PRESV MAT
    const line1Parts: (string | React.ReactElement)[] = [];
    if (packaging.qup) {
      // QUP: only show tooltip if > 999 (per PHP logic)
      const qupCodeType = shouldShowQUPTooltip(packaging.qup) ? 'QUPC' : null;
      const qupDefinition = qupCodeType ? getCodeDefinition(packaging.qup, qupCodeType) : null;
      const qupTitle = qupCodeType ? CODE_TYPE_TITLES[qupCodeType] || '' : '';
      const qupContent = qupDefinition && qupCodeType 
        ? `${qupCodeType} ${packaging.qup}: ${qupDefinition}`
        : qupDefinition || '';
      
      if (qupDefinition) {
        line1Parts.push("QUP = ", 
          <CodeTooltip
            key={`qup-code-${codeIndex++}`}
            code={packaging.qup}
            title={qupTitle}
            content={qupContent}
            codeType={qupCodeType}
          >
            <span>{packaging.qup}</span>
          </CodeTooltip>, 
          ": ");
      } else {
        line1Parts.push("QUP = ", <span key={`qup-code-${codeIndex++}`} className="text-primary">{packaging.qup}</span>, ": ");
      }
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
    const line2Parts: (string | React.ReactElement)[] = [];
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
    const line3Parts: (string | React.ReactElement)[] = [];
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
    const line4Parts: (string | React.ReactElement)[] = [];
    if (packaging.intrcdte_cont) {
      line4Parts.push("INTRMDTE CONT = ", renderCode(packaging.intrcdte_cont, 'intrcdte_cont', codeIndex++), ": ");
    }
    if (packaging.intrcdte_cont_qty) {
      // INTRCDTE CONT QTY: only show tooltip if > 999 (per PHP logic)
      const intqtyCodeType = shouldShowQUPTooltip(packaging.intrcdte_cont_qty) ? 'QUPC' : null;
      const intqtyDefinition = intqtyCodeType ? getCodeDefinition(packaging.intrcdte_cont_qty, intqtyCodeType) : null;
      const intqtyTitle = intqtyCodeType ? CODE_TYPE_TITLES[intqtyCodeType] || '' : '';
      const intqtyContent = intqtyDefinition && intqtyCodeType 
        ? `${intqtyCodeType} ${packaging.intrcdte_cont_qty}: ${intqtyDefinition}`
        : intqtyDefinition || '';
      
      if (intqtyDefinition) {
        line4Parts.push("INTRMDTE CONT QTY = ", 
          <CodeTooltip
            key={`intrcdte_cont_qty-code-${codeIndex++}`}
            code={packaging.intrcdte_cont_qty}
            title={intqtyTitle}
            content={intqtyContent}
            codeType={intqtyCodeType}
          >
            <span>{packaging.intrcdte_cont_qty}</span>
          </CodeTooltip>, 
          ": ");
      } else {
        line4Parts.push("INTRMDTE CONT QTY = ", <span key={`intrcdte_cont_qty-code-${codeIndex++}`} className="text-primary">{packaging.intrcdte_cont_qty}</span>, ": ");
      }
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
      // Special marking code with definition - use markingDefinitions, not codeDefinitions
      const markingDef = getMarkingDefinition(packaging.special_marking_code);
      const markingParts: (string | React.ReactElement)[] = [];
      if (markingDef) {
        markingParts.push("SPECIAL MARKING CODE: ", 
          <CodeTooltip
            key={`marking-code-${codeIndex++}`}
            code={packaging.special_marking_code}
            title="Special Marking Code"
            content={markingDef}
            codeType={null}
          >
            <span className="text-primary cursor-help underline decoration-dotted hover:decoration-solid">{packaging.special_marking_code}</span>
          </CodeTooltip>,
          " - ",
          <span key={`marking-text-${codeIndex++}`}>{markingDef}</span>
        );
      } else {
        markingParts.push("SPECIAL MARKING CODE: ", <span key={`marking-code-${codeIndex++}`} className="text-primary">{packaging.special_marking_code}</span>);
      }
      parts.push(<span key="special-marking">{markingParts}</span>);
    }

    return parts;
  };

    return (
      <div className="text-xs text-foreground py-1.5 px-2.5 rounded border border-border/50 bg-card">
        {buildPackagingText()}
      </div>
    );
  }

// Procurement Item Description Panel
interface ProcurementItemDescriptionPanelProps {
  description: ProcurementItemDescription | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function ProcurementItemDescriptionPanel({ description, isLoading, error, onRetry }: ProcurementItemDescriptionPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted">Loading procurement item description...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-error mb-2">{error}</p>
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!description || !description.has_description || !description.description) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-muted">No procurement item description found</p>
      </div>
    );
  }

  return (
    <div className="text-xs text-foreground py-1.5 px-2.5 rounded border border-border/50 bg-card">
      <div
        className="procurement-description [&_a.sddt-link]:text-primary [&_a.sddt-link]:underline [&_a.sddt-link]:decoration-dotted [&_a.sddt-link]:hover:decoration-solid [&_a.sddt-link]:cursor-pointer"
        dangerouslySetInnerHTML={{ __html: description.description }}
      />
    </div>
  );
}
