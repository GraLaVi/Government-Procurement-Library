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
  PartTabCounts,
  formatNSN,
  formatNiin,
  formatCurrency,
  formatNumber,
  formatContractDate,
  formatSamStatus,
} from "@/lib/library/types";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { RfqComposeModal } from "@/components/rfq/RfqComposeModal";
import type { RfqManufacturerSelection } from "@/lib/rfq/types";
import { resolvePartsTier, tierMeets, type LibraryTier } from "@/lib/library/tier";
import { ExportCsvButton, CustomReportLink, type CsvColumn } from "@/components/library/ExportCsvButton";
import { useAmendmentSummaries } from "@/lib/hooks/useAmendmentSummaries";
import { AmendmentTimelineModal } from "@/components/bidmatching/AmendmentTimelineModal";
import { SamDocumentsButton } from "@/components/library/SamDocumentsButton";

// Module-scope CSV column specs for the part-detail tab exports. Kept
// outside the component bodies so the parent-level export button
// (rendered next to the tab strip) can reach them without prop-drilling
// the column lists. Mirrors the on-screen columns; values are pre-
// formatted strings/numbers so the resulting CSV is safe to open in
// Excel/Sheets without further work.
const PROCUREMENT_CSV_COLUMNS: CsvColumn<PartProcurementRecord>[] = [
  { header: "Contract #", value: (r) => r.contract_number ?? "" },
  { header: "Date", value: (r) => r.contract_date ?? "" },
  { header: "CAGE", value: (r) => r.cage_code ?? "" },
  { header: "Vendor", value: (r) => r.vendor_name ?? "" },
  { header: "Qty", value: (r) => r.quantity ?? "" },
  { header: "Unit Price", value: (r) => r.unit_price ?? "" },
  { header: "Total", value: (r) => r.total_value ?? "" },
];

// "Buyer Contact" is rendered as a composite cell on screen (email +
// phone). For CSV we split them so spreadsheets can filter on either.
// DoD PIID formatter: many SAM.gov solicitation numbers arrive without the
// canonical dashes (e.g. "FA821326R3048"). When a value has no dashes AND matches
// the PIID shape — 6-char office code, 2-digit fiscal year, 1-letter instrument
// type, then a serial — insert dashes ("FA8213-26-R-3048"). Anything already
// dashed, or that doesn't match the shape (order numbers, all-zero placeholders,
// free-form ids), is returned unchanged so we never mangle non-PIID values.
const PIID_PATTERN = /^([A-Z][A-Z0-9]{5})(\d{2})([A-Z])([A-Z0-9]{3,})$/;
function formatSolicitationNumber(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.includes("-")) return value;
  const m = PIID_PATTERN.exec(value);
  return m ? `${m[1]}-${m[2]}-${m[3]}-${m[4]}` : value;
}

const SOLICITATIONS_CSV_COLUMNS: CsvColumn<PartSolicitation>[] = [
  { header: "Source", value: (r) => r.source ?? "DLA" },
  { header: "Close Date", value: (r) => r.close_date ?? "" },
  { header: "Solicitation #", value: (r) => formatSolicitationNumber(r.solicitation_number) },
  { header: "Notice Type", value: (r) => r.notice_type ?? "" },
  { header: "Qty", value: (r) => r.quantity ?? "" },
  { header: "Qty Unit", value: (r) => r.quantity_unit ?? "" },
  { header: "Unit Price", value: (r) => r.unit_price ?? "" },
  { header: "Estimated Value", value: (r) => r.estimated_value ?? "" },
  { header: "Status", value: (r) => r.status ?? "" },
  { header: "Rating", value: (r) => r.rating ?? "" },
  { header: "Agency", value: (r) => r.agency_code ?? "" },
  { header: "Set-Aside", value: (r) => r.set_aside_label ?? r.set_aside ?? "" },
  { header: "Buyer Name", value: (r) => r.buyer_name ?? "" },
  { header: "Buyer Email", value: (r) => r.buyer_email ?? "" },
  { header: "Buyer Phone", value: (r) => r.buyer_phone ?? "" },
];

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
          <div className="p-2 whitespace-pre-line">
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
  const { hasAnyProductAccess } = useAuth();
  const tier = resolvePartsTier(hasAnyProductAccess);
  const isFreeOnly = tier === "free";

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
  const [packagingSupplemental, setPackagingSupplemental] = useState<{ text: string; title: string; source: string } | null>(null);
  const [isLoadingPackaging, setIsLoadingPackaging] = useState(false);
  const [packagingError, setPackagingError] = useState<string | null>(null);
  const [packagingFetched, setPackagingFetched] = useState(false);

  // Procurement item description state
  const [procurementItemDescription, setProcurementItemDescription] = useState<ProcurementItemDescription | null>(null);
  const [isLoadingProcurementItemDesc, setIsLoadingProcurementItemDesc] = useState(false);
  const [procurementItemDescError, setProcurementItemDescError] = useState<string | null>(null);
  const [procurementItemDescFetched, setProcurementItemDescFetched] = useState(false);

  // Tab counts state (fetched eagerly for tab labels, no full data download)
  const [tabCounts, setTabCounts] = useState<PartTabCounts | null>(null);

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

              // The library_code_definitions table stores AQM/AMS sub-codes
              // under code_type='AMC' with code_value like "AQM 3" or "AMS H".
              // Strip the prefix and re-file under the real sub-type so the
              // renderer's AMC split fallback (looking up AQM:X / AMS:X) works.
              if (codeType.code_type === 'AMC') {
                const subMatch = codeValue.match(/^(AQM|AMS)\s+(.+)$/i);
                if (subMatch) {
                  const subType = subMatch[1].toUpperCase();
                  const subValue = subMatch[2];
                  definitions[`${subType}:${subValue}`] = code.description;
                  definitions[`${subType}:${subValue.toUpperCase()}`] = code.description;
                  definitions[`${subType}:${subValue.toLowerCase()}`] = code.description;
                }
              }

              // Forward-compat: if the data ever gets cleaned up to store proper
              // 2-char AMC codes (e.g. "3H"), split first char as AQM, second as AMS.
              if (codeType.code_type === 'AMC' && codeValue.length === 2) {
                definitions[`AQM:${codeValue[0]}`] = code.description;
                definitions[`AMS:${codeValue[1]}`] = code.description;
              }
            });
          });

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
      setPackagingSupplemental(
        packagingResponse.supplemental_text
          ? {
              text: packagingResponse.supplemental_text,
              title: packagingResponse.supplemental_title || 'Packaging Requirements',
              source: packagingResponse.supplemental_source || 'solicitation',
            }
          : null
      );
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

  // Fetch lightweight tab counts so labels show record counts before clicking
  useEffect(() => {
    if (!part?.nsn) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/library/parts/${encodeURIComponent(part.nsn)}/tab-counts`
        );
        if (!cancelled && response.ok) {
          const data = (await response.json()) as PartTabCounts;
          setTabCounts(data);
        }
      } catch {
        // Counts are best-effort; tabs still work without them
      }
    })();

    return () => { cancelled = true; };
  }, [part?.nsn]);

  // Map UI tabId -> audit `view` name (matches FastAPI _VALID_TAB_VIEWS)
  const TAB_VIEW_MAP: Record<string, string> = {
    overview: 'detail',
    procurement: 'procurement_history',
    solicitations: 'solicitations',
    manufacturers: 'manufacturers',
    technical: 'technical_characteristics',
    enduse: 'end_use_description',
    packaging: 'packaging',
    procurementitemdesc: 'procurement_item_description',
  };

  // Handle tab change with lazy loading
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as TabId);

    // Record user intent (fire-and-forget; don't block UI on audit).
    const view = TAB_VIEW_MAP[tabId];
    if (view && part?.nsn) {
      fetch(`/api/library/parts/${encodeURIComponent(part.nsn)}/track-view?view=${view}`, {
        method: 'POST',
      }).catch(() => { /* audit must never break UX */ });
    }

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
  }, [part?.nsn, procurementFetched, fetchProcurementHistory, solicitationsFetched, fetchSolicitations, manufacturersFetched, fetchManufacturers, technicalFetched, fetchTechnicalCharacteristics, endUseFetched, fetchEndUseDescriptions, packagingFetched, fetchPackaging, procurementItemDescFetched, fetchProcurementItemDescription]);

  // Build tabs dynamically with counts.
  // Prefer data-fetched totals once loaded; fall back to lightweight tabCounts.
  const procurementLabel = procurementFetched
    ? `Procurement History (${procurementTotal})`
    : tabCounts
      ? `Procurement History (${tabCounts.procurement_history_count})`
      : "Procurement History";

  const solicitationsLabel = solicitationsFetched
    ? `Recent Solicitations (${solicitationsTotal})`
    : tabCounts
      ? `Recent Solicitations (${tabCounts.solicitations_count})`
      : "Recent Solicitations";

  const manufacturersLabel = manufacturersFetched
    ? `Manufacturers (${manufacturersTotal})`
    : tabCounts
      ? `Manufacturers (${tabCounts.manufacturers_count})`
      : "Manufacturers";

  const technicalLabel = technicalFetched
    ? `Technical Characteristics (${technicalTotal})`
    : tabCounts
      ? `Technical Characteristics (${tabCounts.technical_characteristics_count})`
      : "Technical Characteristics";

  const endUseLabel = endUseFetched
    ? `End Use Description (${endUseTotal})`
    : tabCounts
      ? `End Use Description (${tabCounts.end_use_description_count})`
      : "End Use Description";

  // Count reflects what actually renders: a part_packaging row with at least one
  // non-empty displayable field, OR a supplemental (e.g. solicitation) block.
  const packagingHasStructuredContent = !!packaging && [
    packaging.qup, packaging.pres_mthd, packaging.clng_dry, packaging.presv_mat,
    packaging.wrap_mat, packaging.cush_dunn_mat, packaging.cush_dunn_thkness,
    packaging.unit_cont, packaging.opi, packaging.intrcdte_cont, packaging.intrcdte_cont_qty,
    packaging.special_marking_code, packaging.marking_text, packaging.packaging_data,
  ].some((v) => !!v);
  const packagingCount = (packagingHasStructuredContent || !!packagingSupplemental) ? 1 : 0;

  const packagingLabel = packagingFetched
    ? `Packaging Information (${packagingCount})`
    : tabCounts
      ? `Packaging Information (${tabCounts.has_packaging ? 1 : 0})`
      : "Packaging Information";

  const pidLabel = procurementItemDescFetched
    ? `Procurement Item Description (${procurementItemDescription?.has_description && procurementItemDescription?.description?.trim() ? 1 : 0})`
    : tabCounts
      ? `Procurement Item Description (${tabCounts.has_procurement_item_description ? 1 : 0})`
      : "Procurement Item Description";

  // `minTier` declares the lowest tier that can see each tab:
  //   free     → Overview + (light) Solicitations
  //   basic    → adds Technical, End Use, Procurement Item Description
  //   advanced → adds Procurement, Manufacturers, Packaging
  // The Solicitations tab content branches by tier internally — Free
  // sees a count + upgrade CTA; Basic+ sees the full list.
  const solicitationsLabelForTier = isFreeOnly
    ? (tabCounts?.solicitations_count_30d != null
        ? `Solicitations (${tabCounts.solicitations_count_30d})`
        : "Solicitations")
    : solicitationsLabel;
  const allTabs: Array<{ id: TabId; label: string; disabled: boolean; minTier: "free" | "basic" | "advanced" }> = [
    { id: "overview", label: "Overview", disabled: false, minTier: "free" },
    { id: "procurement", label: procurementLabel, disabled: false, minTier: "advanced" },
    { id: "solicitations", label: solicitationsLabelForTier, disabled: false, minTier: "free" },
    { id: "manufacturers", label: manufacturersLabel, disabled: false, minTier: "advanced" },
    { id: "technical", label: technicalLabel, disabled: false, minTier: "basic" },
    { id: "enduse", label: endUseLabel, disabled: false, minTier: "basic" },
    { id: "packaging", label: packagingLabel, disabled: false, minTier: "advanced" },
    { id: "procurementitemdesc", label: pidLabel, disabled: false, minTier: "basic" },
  ];
  const tabs = allTabs.filter((t) => tierMeets(tier, t.minTier));

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab("overview");
    }
  }, [tier, activeTab, tabs]);

  return (
    <div className="bg-card-bg rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted-light">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold text-foreground truncate">
              {formatNSN(part.nsn) || part.nsn}
            </h2>
            {part.description && (
              <p className="text-xs text-muted truncate">{part.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs — paired with a right-side export button so the action
          sits inline with the tab labels and doesn't push the table
          content down. Only the procurement and solicitations tabs
          export today; other tabs render nothing on the right. */}
      <div className="px-4 pt-3 flex items-end justify-between gap-3">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        {activeTab === "procurement" && (
          <ExportCsvButton
            tier={tier}
            rows={procurementRecords}
            columns={PROCUREMENT_CSV_COLUMNS}
            filename={`procurement-history-${part.nsn}`}
            compact
          />
        )}
        {activeTab === "solicitations" && !isFreeOnly && (
          <ExportCsvButton
            tier={tier}
            rows={solicitations}
            columns={SOLICITATIONS_CSV_COLUMNS}
            filename={`solicitations-${part.nsn}`}
            compact
          />
        )}
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
          {isFreeOnly ? (
            <FreeSolicitationsView count={tabCounts?.solicitations_count_30d ?? null} />
          ) : (
            <SolicitationsPanel
              solicitations={solicitations}
              totalCount={solicitationsTotal}
              isLoading={isLoadingSolicitations}
              error={solicitationsError}
              onRetry={fetchSolicitations}
            />
          )}
        </TabPanel>

        <TabPanel tabId="manufacturers" activeTab={activeTab}>
          <ManufacturersPanel
            nsn={part.nsn}
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
            supplemental={packagingSupplemental}
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
    { label: "NSN", value: formatNSN(part.nsn), mono: true, tooltip: null as string | null },
    { label: "NIIN", value: formatNiin(part.niin), mono: true, tooltip: null as string | null },
    { label: "FSC", value: part.fsc, mono: true, tooltip: part.fsc_description },
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
          definition = parts.join('\n\n');
        }
      }

      // Legacy 1-char AMC values (e.g. "G", "D") are the AMS portion of an
      // AMC code stored without the AQM half. Show the AMS definition.
      if (!definition && codeType === 'AMC' && codeStr.length === 1) {
        definition = codeDefinitions[`AMS:${codeStr.toUpperCase()}`] ||
                     codeDefinitions[`AMS:${codeStr.toLowerCase()}`] || '';
      }

      // For DLA/IDS, also try 'DLA' code type as fallback
      if (!definition && codeType === 'IDS') {
        const dlaKey = `DLA:${codeStr}`;
        definition = codeDefinitions[dlaKey] || '';
      }
      
      if (!definition) {
        definition = 'Code definition not available';
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
    { label: "Standard Price", value: part.gac != null ? formatCurrency(part.gac) : null },
  ].filter(item => item.value != null && item.value !== "");

  return (
    <div className="space-y-4">
      {/* Hero Card - Part Description */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/15">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m18 0A2.25 2.25 0 0119.5 19.5h-15A2.25 2.25 0 012.25 17.25m18 0V9a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 002.25 9v8.25" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-semibold text-foreground mb-2 leading-tight">
              {part.description || "Part Description Not Available"}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs">
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
          <div className="p-3 space-y-2">
            {identifiers.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted font-medium">{item.label}</span>
                <span className="text-xs font-mono font-semibold text-primary bg-primary/5 px-2 py-1 rounded">
                  {item.tooltip ? (
                    <CodeTooltip
                      code={String(item.value)}
                      title="FSC - Federal Supply Classification"
                      content={item.tooltip}
                      codeType={null}
                    >
                      {item.value}
                    </CodeTooltip>
                  ) : (
                    item.value
                  )}
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
          <div className="p-3 space-y-2">
            {partInfo.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted font-medium">{item.label}</span>
                <span className="text-xs font-medium text-foreground text-right max-w-[160px] break-words">
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
          <div className="p-3 space-y-2">
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
              {rec.contract_number ? (
                <Link
                  href={`/library/parts?search_type=contract_number&q=${encodeURIComponent(rec.contract_number)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {rec.contract_number}
                </Link>
              ) : (
                <span className="text-xs font-mono font-semibold">—</span>
              )}
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
        cell: ({ row }) => {
          const cage = row.original.cage_code;
          if (!cage) return <span className="text-xs font-mono font-semibold text-muted">—</span>;
          return (
            <Link
              href={`/library/vendor-search?cage_code=${encodeURIComponent(cage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {cage}
            </Link>
          );
        },
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
      {/* Custom-reports upsell — sits below the table so it doesn't push
          the data the user is looking at down the page. */}
      <div className="flex justify-end">
        <CustomReportLink />
      </div>
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

  // Amendment indicator: one batch fetch covers every visible sol; the
  // cell renders the pill only when the sol has at least one amendment.
  // Only DLA rows have amendments; SAM opportunity IDs must not be sent to the
  // DLA amendment endpoint (their IDs live in a different table/namespace).
  const solIds = useMemo(
    () => solicitations.filter((s) => (s.source ?? "DLA") === "DLA").map((s) => s.solicitation_id),
    [solicitations]
  );
  const amendmentSummaries = useAmendmentSummaries(solIds);
  const [amendmentModal, setAmendmentModal] = useState<{ id: number; number: string | null } | null>(null);

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
          const isSam = (sol.source ?? "DLA") === "SAM";
          const summary = amendmentSummaries.get(sol.solicitation_id);
          const hasNumber = sol.solicitation_number && sol.solicitation_number !== "—";
          const displayNumber = formatSolicitationNumber(sol.solicitation_number);
          return (
            <span className="inline-flex items-center gap-1">
              {hasNumber ? (
                isSam ? (
                  // SAM rows link out to the public SAM.gov opportunity page. The
                  // trailing external-link glyph both marks the row as a SAM.gov
                  // opportunity (in lieu of a Source column / bulky badge) and
                  // signals the link opens off-site.
                  sol.sam_url ? (
                    <a
                      href={sol.sam_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                      title={sol.notice_type ? `View on SAM.gov · ${sol.notice_type}` : "View on SAM.gov"}
                    >
                      {displayNumber}
                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  ) : (
                    // No public URL — keep a compact muted marker so the SAM.gov
                    // source is still visible.
                    <Tooltip content={sol.notice_type ? `SAM.gov · ${sol.notice_type}` : "SAM.gov opportunity"}>
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-foreground">
                        {displayNumber}
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">SAM.gov</span>
                      </span>
                    </Tooltip>
                  )
                ) : sol.has_pdf ? (
                  // DLA rows with a PDF: the solicitation number itself opens the
                  // viewer. Opens a modal (not navigation), so this is a button
                  // styled as a link, not an <a>. The trailing glyph signals that
                  // the target is a document.
                  <button
                    type="button"
                    title={`Open solicitation ${displayNumber} (PDF)`}
                    aria-label={`Open solicitation ${displayNumber} (PDF)`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPdfModal({ id: sol.solicitation_id, number: sol.solicitation_number });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
                  >
                    {displayNumber}
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </button>
                ) : (
                  // No PDF — plain text (a solicitation-search link here would just
                  // reload the same view, so it's redundant).
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {displayNumber}
                  </span>
                )
              ) : (
                <span className="text-xs font-mono font-semibold">—</span>
              )}
              {isSam && (sol.document_count ?? 0) > 0 && (
                <SamDocumentsButton
                  oppId={sol.solicitation_id}
                  count={sol.document_count ?? 0}
                  label={displayNumber}
                />
              )}
              {summary && summary.amendment_count > 0 && (
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
        id: "rating",
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.rating || "—"}</span>
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
        id: "set_aside",
        accessorKey: "set_aside_label",
        header: "Set-Aside",
        cell: ({ row }) => {
          // Display the canonical short code in a badge with the
          // human-readable label on hover. Falls back to the legacy raw
          // set_aside string for rows that pre-date the normalization.
          const code = row.original.set_aside_code ?? row.original.set_aside;
          const label = row.original.set_aside_label ?? code;
          if (!code) return <span className="text-muted">—</span>;
          return (
            <Tooltip content={label ?? code}>
              <Badge variant="info" size="sm">{code}</Badge>
            </Tooltip>
          );
        },
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
        id: "estimated_value",
        accessorKey: "estimated_value",
        header: () => <span className="w-full text-right block">Est. Value</span>,
        cell: ({ row }) => (
          <span className="text-right block text-xs font-semibold text-foreground">
            {formatCurrency(row.original.estimated_value)}
          </span>
        ),
        meta: { className: "hidden md:table-cell text-right" },
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
        cell: ({ row }) => {
          const email = row.original.buyer_email?.toLowerCase();
          const phone = row.original.buyer_phone;
          const [copied, setCopied] = useState(false);

          const handleCopyEmail = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (email) {
              navigator.clipboard.writeText(email);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          };

          if (!email && !phone) return <span className="text-muted">—</span>;

          return (
            <div className="flex items-center gap-2 group">
              {phone && <span className="text-xs font-medium text-foreground whitespace-nowrap">{phone}</span>}
              {email && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className={`inline-flex items-center gap-1 p-1 rounded transition-colors ${
                    copied ? "text-success bg-success/10" : "text-primary hover:bg-primary/10"
                  }`}
                  title={copied ? "Email copied!" : `Copy email: ${email}`}
                >
                  {copied ? (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[10px] font-bold">Copied!</span>
                    </>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          );
        },
        meta: { className: "hidden lg:table-cell" },
      },
    ],
    // Re-build columns when amendment summaries load so the per-row
    // closure picks up the fresh Map.
    [amendmentSummaries]
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
      <DataTable
        data={solicitations}
        columns={columns}
        getRowId={(row) => `${row.source ?? "DLA"}-${row.solicitation_id}`}
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
      {/* Amendment timeline modal — opened from the "Amended" pill on a
          solicitation row. */}
      <AmendmentTimelineModal
        solicitationId={amendmentModal?.id ?? null}
        solicitationNumber={amendmentModal?.number ?? null}
        onClose={() => setAmendmentModal(null)}
      />
      {/* Custom-reports upsell — below the table so the data stays at
          the top of the panel. */}
      <div className="flex justify-end">
        <CustomReportLink />
      </div>
    </div>
  );
}

// Manufacturers Panel
interface ManufacturersPanelProps {
  nsn: string | null;
  manufacturers: PartManufacturer[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

// Stable per-row key (matches DataTable getRowId below) used for RFQ selection.
function manufacturerRowKey(m: PartManufacturer): string {
  return `${m.cage_code}-${m.part_number || ""}`;
}

function ManufacturersPanel({ nsn, manufacturers, totalCount, isLoading, error, onRetry }: ManufacturersPanelProps) {
  // RFQ is a separate paid product; only surface the entry when the user holds it.
  const { hasProductAccess } = useAuth();
  const canSendRfq = hasProductAccess("vendor_rfq");

  // Local selection state (the shared DataTable keeps its own selection
  // internal and doesn't surface it, so we track our own via a checkbox column).
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Only vendors with an Active, non-expired SAM registration may receive an
  // RFQ, so selection (including "select all") is scoped to eligible rows.
  const eligibleKeys = useMemo(
    () => new Set(manufacturers.filter((m) => m.is_active).map(manufacturerRowKey)),
    [manufacturers]
  );
  const allSelected = eligibleKeys.size > 0 && [...eligibleKeys].every((k) => selectedKeys.has(k));

  const toggleRow = useCallback(
    (key: string) => {
      if (!eligibleKeys.has(key)) return; // ineligible (inactive/expired) vendor
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [eligibleKeys]
  );

  const toggleAll = useCallback(() => {
    setSelectedKeys((prev) => (prev.size >= eligibleKeys.size ? new Set() : new Set(eligibleKeys)));
  }, [eligibleKeys]);

  const selections: RfqManufacturerSelection[] = useMemo(
    () =>
      manufacturers
        .filter((m) => selectedKeys.has(manufacturerRowKey(m)))
        .map((m) => ({
          cage_code: m.cage_code,
          vendor_name: m.vendor_name,
          part_number: m.part_number,
          nsn,
        })),
    [manufacturers, selectedKeys, nsn]
  );

  const selectColumn = useMemo<ColumnDef<PartManufacturer>>(
    () => ({
      id: "rfq_select",
      header: () => (
        <input
          type="checkbox"
          aria-label="Select all manufacturers"
          checked={allSelected}
          onChange={toggleAll}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => {
        const key = manufacturerRowKey(row.original);
        const eligible = row.original.is_active;
        return (
          <input
            type="checkbox"
            aria-label={
              eligible
                ? `Select ${row.original.cage_code}`
                : `${row.original.cage_code} is inactive and cannot be sent an RFQ`
            }
            checked={eligible && selectedKeys.has(key)}
            disabled={!eligible}
            onChange={() => toggleRow(key)}
            onClick={(e) => e.stopPropagation()}
            title={
              eligible
                ? undefined
                : "Vendor registration is inactive or expired — cannot send RFQ"
            }
            className={!eligible ? "opacity-40 cursor-not-allowed" : undefined}
          />
        );
      },
    }),
    [allSelected, toggleAll, selectedKeys, toggleRow]
  );

  const dataColumns = useMemo<ColumnDef<PartManufacturer>[]>(
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
            className="text-xs font-mono font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
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
        id: "sam_status",
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
          const label = formatSamStatus(row.original.sam_status) || "Unknown";
          return row.original.is_active ? (
            <Badge variant="success" size="sm">{label}</Badge>
          ) : (
            <Badge variant="warning" size="sm">{label}</Badge>
          );
        },
      },
      {
        id: "approved_source",
        accessorKey: "is_approved_source",
        header: "Source",
        cell: ({ row }) =>
          row.original.is_approved_source ? (
            <Badge variant="success" size="sm">Approved</Badge>
          ) : (
            <span className="text-xs text-muted">—</span>
          ),
      },
      {
        id: "part_number",
        accessorKey: "part_number",
        header: "Part Number",
        cell: ({ row }) =>
          row.original.part_number ? (
            <Link
              href={`/library/parts?search_type=mfg_part_number&q=${encodeURIComponent(row.original.part_number)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.part_number}
            </Link>
          ) : (
            <span className="text-xs font-mono font-semibold text-muted">—</span>
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

  const columns = useMemo<ColumnDef<PartManufacturer>[]>(
    () => (canSendRfq ? [selectColumn, ...dataColumns] : dataColumns),
    [canSendRfq, selectColumn, dataColumns]
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted">
          {totalCount} manufacturer{totalCount !== 1 ? "s" : ""} found
        </div>
        {canSendRfq && (
          <button
            type="button"
            disabled={selectedKeys.size === 0}
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create RFQ{selectedKeys.size > 0 ? ` (${selectedKeys.size})` : ""}
          </button>
        )}
      </div>
      {toast && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-xs text-success">
          {toast}
        </div>
      )}
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
      {canSendRfq && (
        <RfqComposeModal
          isOpen={composeOpen}
          onClose={() => setComposeOpen(false)}
          nsn={nsn}
          selections={selections}
          onSent={(result) => {
            setSelectedKeys(new Set());
            setToast(
              `Sent ${result.rfq_count} RFQ${result.rfq_count !== 1 ? "s" : ""} to ${result.vendor_count} vendor${result.vendor_count !== 1 ? "s" : ""}.`
            );
          }}
          onStaged={(count) => {
            setSelectedKeys(new Set());
            setToast(`Added ${count} item${count !== 1 ? "s" : ""} to the batch.`);
          }}
        />
      )}
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
  supplemental: { text: string; title: string; source: string } | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function PackagingPanel({ packaging, codeDefinitions, markingDefinitions, supplemental, isLoading, error, onRetry }: PackagingPanelProps) {

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

  if (!packaging && !supplemental) {
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

    if (!packaging) return parts;

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

    // Only render Section 1 when the structured record actually has content
    // (a part_packaging row can exist with every field empty).
    const packagingParts = buildPackagingText();
    const hasStructured = packagingParts.length > 0;

    if (!hasStructured && !supplemental) {
      return (
        <div className="text-center py-6">
          <p className="text-xs text-muted">No packaging information found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Section 1: structured part_packaging record (only when it has content) */}
        {hasStructured && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">
              Packaging Data
            </h4>
            <div className="text-xs text-foreground py-1.5 px-2.5 rounded border border-border/50 bg-card">
              {packagingParts}
            </div>
          </div>
        )}

        {/* Section 2: supplemental free-text block (e.g. solicitation packaging_data) */}
        {supplemental && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">
              {supplemental.title}
            </h4>
            <div className="text-xs text-foreground py-1.5 px-2.5 rounded border border-border/50 bg-card whitespace-pre-wrap">
              {supplemental.text}
            </div>
          </div>
        )}
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

// Free-tier Solicitations view — just a count of the last 30 days plus
// an upgrade CTA. Basic/Advanced tiers see the full table via
// SolicitationsPanel.
function FreeSolicitationsView({ count }: { count: number | null }) {
  const message =
    count === null
      ? "Loading recent solicitation activity…"
      : count === 0
        ? "No solicitations posted for this part in the last 30 days."
        : count === 1
          ? "1 solicitation posted for this part in the last 30 days."
          : `${count} solicitations posted for this part in the last 30 days.`;
  return (
    <div className="text-center py-8 px-4">
      <p className="text-sm text-foreground mb-2">{message}</p>
      <Link
        href="/pricing"
        className="text-xs text-primary hover:underline"
      >
        Upgrade to see details
      </Link>
    </div>
  );
}
