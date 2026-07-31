"use client";

import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
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
  SolicitationAward,
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
  SDDTBlock,
  PartTabCounts,
  PartDemand,
  formatNSN,
  formatNiin,
  formatCurrency,
  formatNumber,
  formatContractDate,
  formatSamStatus,
  partKey,
  formatPartIdentity,
  isPartNumberOnly,
} from "@/lib/library/types";
import { DetailSections, DetailToolbar } from "@/components/library/DetailSections";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { KPICard } from "@/components/analytics/KPICard";
import { CHART_COLORS } from "@/components/analytics/ChartColors";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { RfqComposeModal } from "@/components/rfq/RfqComposeModal";
import type { RfqManufacturerSelection } from "@/lib/rfq/types";
import { resolvePartsTier, tierMeets, type LibraryTier } from "@/lib/library/tier";
import { ExportCsvButton, CustomReportLink, type CsvColumn } from "@/components/library/ExportCsvButton";
import { usePreferences } from "@/lib/hooks/usePreferences";
import { resolveResultsLayout } from "@/lib/preferences/resultsLayout";
import { buildCsv, buildCombinedCsv, triggerDownload, todayIsoDate } from "@/lib/library/csv";
import { useAmendmentSummaries } from "@/lib/hooks/useAmendmentSummaries";
import { AmendmentTimelineModal } from "@/components/bidmatching/AmendmentTimelineModal";
import { SamDocumentsButton } from "@/components/library/SamDocumentsButton";
import { DpasRatingTooltip } from "@/components/library/DpasRatingTooltip";

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
  { header: "Contract #", value: (r) => r.award?.contract_number ?? "" },
  { header: "Awardee", value: (r) => r.award?.awardee_name ?? "" },
  { header: "Award Total", value: (r) => r.award?.total_value ?? "" },
  { header: "Rating", value: (r) => r.rating ?? "" },
  { header: "Agency", value: (r) => r.agency_code ?? "" },
  { header: "Set-Aside", value: (r) => r.set_aside_label ?? r.set_aside ?? "" },
  { header: "Buyer Name", value: (r) => r.buyer_name ?? "" },
  { header: "Buyer Email", value: (r) => r.buyer_email ?? "" },
  { header: "Buyer Phone", value: (r) => r.buyer_phone ?? "" },
];

// ---- Demand Intelligence (DLA forecast + stock) display helpers -----------
// Format a monthly DLA release/snapshot date for the freshness line, e.g.
// "Jun 30, 2026". Dates arrive as ISO "YYYY-MM-DD"; parse as UTC so the day
// never shifts across timezones.
function formatDemandDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

// Short month label for the forecast chart x-axis, e.g. "Aug '26".
function formatForecastMonth(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(" ", " '");
}

// CSV export: one row per forecast month (the tabular part of the demand data).
const DEMAND_CSV_COLUMNS: CsvColumn<{ forecast_date: string; forecast_qty: number }>[] = [
  { header: "Forecast Month", value: (r) => r.forecast_date ?? "" },
  { header: "Forecast Qty", value: (r) => r.forecast_qty ?? "" },
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
  const { preferences } = usePreferences();
  const layout = resolveResultsLayout(preferences);

  // Print-the-whole-record support (used from both layouts). In tabs mode we
  // load + expand every section before printing so the printout is complete.
  const [expandForPrint, setExpandForPrint] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);
  const [preparingPrint, setPreparingPrint] = useState(false);

  // URL key for addressing this part in the read API: its NSN, or "ID-<part_id>"
  // for NSN-less (DIBBS part-number-only) parts whose nsn comes back as "".
  const partReqKey = partKey(part);
  const partNumberOnly = isPartNumberOnly(part);

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

  // Demand intelligence state (DLA forecast + stock; Advanced tier)
  const [demand, setDemand] = useState<PartDemand | null>(null);
  const [isLoadingDemand, setIsLoadingDemand] = useState(false);
  const [demandError, setDemandError] = useState<string | null>(null);
  const [demandFetched, setDemandFetched] = useState(false);

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
      const response = await fetch(`/api/library/parts/${encodeURIComponent(partReqKey)}/procurement-history?limit=50`);
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
  }, [partReqKey, procurementFetched, isLoadingProcurement]);

  // Fetch solicitations when tab is clicked (lazy loading)
  const fetchSolicitations = useCallback(async () => {
    if (solicitationsFetched || isLoadingSolicitations) return;

    setIsLoadingSolicitations(true);
    setSolicitationsError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(partReqKey)}/solicitations`);
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
  }, [partReqKey, solicitationsFetched, isLoadingSolicitations]);

  // Fetch manufacturers when tab is clicked (lazy loading)
  const fetchManufacturers = useCallback(async () => {
    if (manufacturersFetched || isLoadingManufacturers) return;

    setIsLoadingManufacturers(true);
    setManufacturersError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(partReqKey)}/manufacturers`);
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
  }, [partReqKey, manufacturersFetched, isLoadingManufacturers]);

  // Fetch demand intelligence when tab is clicked (lazy loading, Advanced tier)
  const fetchDemand = useCallback(async () => {
    if (demandFetched || isLoadingDemand) return;

    setIsLoadingDemand(true);
    setDemandError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(partReqKey)}/demand`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load demand intelligence');
      }

      setDemand(data as PartDemand);
      setDemandFetched(true);
    } catch (error) {
      console.error('Demand intelligence fetch error:', error);
      setDemandError(error instanceof Error ? error.message : 'Failed to load demand intelligence');
    } finally {
      setIsLoadingDemand(false);
    }
  }, [partReqKey, demandFetched, isLoadingDemand]);

  // Fetch technical characteristics when tab is clicked (lazy loading)
  const fetchTechnicalCharacteristics = useCallback(async () => {
    if (technicalFetched || isLoadingTechnical) return;

    setIsLoadingTechnical(true);
    setTechnicalError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(partReqKey)}/technical-characteristics`);
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
  }, [partReqKey, technicalFetched, isLoadingTechnical]);

  // Fetch end use descriptions when tab is clicked (lazy loading)
  const fetchEndUseDescriptions = useCallback(async () => {
    if (endUseFetched || isLoadingEndUse) return;

    setIsLoadingEndUse(true);
    setEndUseError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(partReqKey)}/end-use-description`);
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
  }, [partReqKey, endUseFetched, isLoadingEndUse]);

  // Fetch packaging information when tab is clicked (lazy loading)
  const fetchPackaging = useCallback(async () => {
    if (packagingFetched || isLoadingPackaging) return;

    setIsLoadingPackaging(true);
    setPackagingError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(partReqKey)}/packaging`);
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
  }, [partReqKey, packagingFetched, isLoadingPackaging]);

  // Fetch procurement item description when tab is clicked (lazy loading)
  const fetchProcurementItemDescription = useCallback(async () => {
    if (procurementItemDescFetched || isLoadingProcurementItemDesc) return;

    setIsLoadingProcurementItemDesc(true);
    setProcurementItemDescError(null);

    try {
      const response = await fetch(`/api/library/parts/${encodeURIComponent(partReqKey)}/procurement-item-description`);
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
  }, [partReqKey, procurementItemDescFetched, isLoadingProcurementItemDesc]);

  // Fetch lightweight tab counts so labels show record counts before clicking
  useEffect(() => {
    if (!partReqKey) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/library/parts/${encodeURIComponent(partReqKey)}/tab-counts`
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
  }, [partReqKey]);

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
    if (view && partReqKey) {
      fetch(`/api/library/parts/${encodeURIComponent(partReqKey)}/track-view?view=${view}`, {
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
  }, [partReqKey, procurementFetched, fetchProcurementHistory, solicitationsFetched, fetchSolicitations, manufacturersFetched, fetchManufacturers, technicalFetched, fetchTechnicalCharacteristics, endUseFetched, fetchEndUseDescriptions, packagingFetched, fetchPackaging, procurementItemDescFetched, fetchProcurementItemDescription]);

  // Demand & Stock now lives on the Overview tab (Maximum tier), so fetch it
  // eagerly on mount rather than on a tab click. fetchDemand self-guards
  // against duplicate calls; the endpoint 403s below Maximum so we skip them.
  useEffect(() => {
    if (partReqKey && tierMeets(tier, "maximum")) {
      fetchDemand();
    }
  }, [partReqKey, tier, fetchDemand]);

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

  // Tab visibility by tier:
  //   free     → Overview + (light) Solicitations teaser
  //   basic    → adds Technical, End Use, Procurement Item Description,
  //              and Manufacturers (Solicitations is NOT shown at Basic —
  //              it trades up to Advanced instead).
  //   advanced → adds Procurement, Solicitations (full), Packaging
  // Solicitations is the only non-monotonic case (visible at Free as a
  // teaser, hidden at Basic, visible again at Advanced+), so it gets its
  // own `visible` expression rather than a simple minimum-tier check.
  const solicitationsLabelForTier = isFreeOnly
    ? (tabCounts?.solicitations_count_30d != null
        ? `Solicitations (${tabCounts.solicitations_count_30d})`
        : "Solicitations")
    : solicitationsLabel;
  const allTabs: Array<{ id: TabId; label: string; disabled: boolean; visible: boolean }> = [
    { id: "overview", label: "Overview", disabled: false, visible: true },
    { id: "procurement", label: procurementLabel, disabled: false, visible: tierMeets(tier, "advanced") },
    { id: "solicitations", label: solicitationsLabelForTier, disabled: false, visible: isFreeOnly || tierMeets(tier, "advanced") },
    { id: "manufacturers", label: manufacturersLabel, disabled: false, visible: tierMeets(tier, "basic") },
    { id: "technical", label: technicalLabel, disabled: false, visible: tierMeets(tier, "basic") },
    { id: "enduse", label: endUseLabel, disabled: false, visible: tierMeets(tier, "basic") },
    { id: "packaging", label: packagingLabel, disabled: false, visible: tierMeets(tier, "advanced") },
    { id: "procurementitemdesc", label: pidLabel, disabled: false, visible: tierMeets(tier, "basic") },
  ];
  const tabs = allTabs.filter((t) => t.visible);

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab("overview");
    }
  }, [tier, activeTab, tabs]);

  // One-pager: when the linear layout is active, load every tier-permitted
  // section up front (each fetch guards against duplicate calls) and fire the
  // same view-audit the tab clicks would. Overview + free-tier solicitations
  // need no fetch.
  useEffect(() => {
    if (layout !== "linear" || !partReqKey) return;
    const trackView = (view: string) =>
      fetch(
        `/api/library/parts/${encodeURIComponent(partReqKey)}/track-view?view=${view}`,
        { method: "POST" },
      ).catch(() => { /* audit must never break UX */ });
    if (tierMeets(tier, "advanced") && !procurementFetched) {
      trackView("procurement_history");
      fetchProcurementHistory();
    }
    if (tierMeets(tier, "advanced") && !solicitationsFetched) {
      trackView("solicitations");
      fetchSolicitations();
    }
    if (tierMeets(tier, "basic") && !manufacturersFetched) {
      trackView("manufacturers");
      fetchManufacturers();
    }
    if (tierMeets(tier, "basic") && !technicalFetched) {
      trackView("technical_characteristics");
      fetchTechnicalCharacteristics();
    }
    if (tierMeets(tier, "basic") && !endUseFetched) {
      trackView("end_use_description");
      fetchEndUseDescriptions();
    }
    if (tierMeets(tier, "advanced") && !packagingFetched) {
      trackView("packaging");
      fetchPackaging();
    }
    if (tierMeets(tier, "basic") && !procurementItemDescFetched) {
      trackView("procurement_item_description");
      fetchProcurementItemDescription();
    }
  }, [
    layout, tier, isFreeOnly, partReqKey,
    procurementFetched, solicitationsFetched, manufacturersFetched, technicalFetched,
    endUseFetched, packagingFetched, procurementItemDescFetched,
    fetchProcurementHistory, fetchSolicitations, fetchManufacturers,
    fetchTechnicalCharacteristics, fetchEndUseDescriptions, fetchPackaging,
    fetchProcurementItemDescription,
  ]);

  // Section content + per-section export actions, shared by both layouts.
  const sectionContent: Record<TabId, ReactNode> = {
    overview: (
      <OverviewPanel
        part={part}
        codeDefinitions={codeDefinitions}
        codeTypeNames={codeTypeNames}
        showDemand={tierMeets(tier, "maximum")}
        demand={demand}
        isLoadingDemand={isLoadingDemand}
        demandError={demandError}
        onRetryDemand={fetchDemand}
      />
    ),
    procurement: (
      <ProcurementPanel
        records={procurementRecords}
        totalCount={procurementTotal}
        isLoading={isLoadingProcurement}
        error={procurementError}
        onRetry={fetchProcurementHistory}
      />
    ),
    solicitations: isFreeOnly ? (
      <FreeSolicitationsView count={tabCounts?.solicitations_count_30d ?? null} />
    ) : (
      <SolicitationsPanel
        solicitations={solicitations}
        totalCount={solicitationsTotal}
        isLoading={isLoadingSolicitations}
        error={solicitationsError}
        onRetry={fetchSolicitations}
        demand={demand}
        onEnsureDemand={tierMeets(tier, "maximum") ? fetchDemand : undefined}
        onViewDemand={tierMeets(tier, "maximum") ? () => handleTabChange("overview") : undefined}
      />
    ),
    manufacturers: (
      <ManufacturersPanel
        nsn={part.nsn}
        partId={part.id}
        partDescription={part.description}
        manufacturers={manufacturers}
        totalCount={manufacturersTotal}
        isLoading={isLoadingManufacturers}
        error={manufacturersError}
        onRetry={fetchManufacturers}
      />
    ),
    technical: (
      <TechnicalCharacteristicsPanel
        characteristics={technicalCharacteristics}
        totalCount={technicalTotal}
        isLoading={isLoadingTechnical}
        error={technicalError}
        onRetry={fetchTechnicalCharacteristics}
      />
    ),
    enduse: (
      <EndUseDescriptionPanel
        descriptions={endUseDescriptions}
        totalCount={endUseTotal}
        isLoading={isLoadingEndUse}
        error={endUseError}
        onRetry={fetchEndUseDescriptions}
      />
    ),
    packaging: (
      <PackagingPanel
        packaging={packaging}
        codeDefinitions={packagingCodeDefinitions}
        markingDefinitions={packagingMarkingDefinitions}
        supplemental={packagingSupplemental}
        isLoading={isLoadingPackaging}
        error={packagingError}
        onRetry={fetchPackaging}
      />
    ),
    procurementitemdesc: (
      <ProcurementItemDescriptionPanel
        description={procurementItemDescription}
        isLoading={isLoadingProcurementItemDesc}
        error={procurementItemDescError}
        onRetry={fetchProcurementItemDescription}
      />
    ),
  };
  const sectionAction: Partial<Record<TabId, ReactNode>> = {
    procurement: (
      <ExportCsvButton
        tier={tier}
        rows={procurementRecords}
        columns={PROCUREMENT_CSV_COLUMNS}
        filename={`procurement-history-${partReqKey}`}
        compact
      />
    ),
    solicitations: !isFreeOnly ? (
      <ExportCsvButton
        tier={tier}
        rows={solicitations}
        columns={SOLICITATIONS_CSV_COLUMNS}
        filename={`solicitations-${partReqKey}`}
        compact
      />
    ) : undefined,
  };
  const sections = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    content: sectionContent[t.id],
    action: sectionAction[t.id],
  }));

  // Advanced-tier one-pager toolbar: a single combined CSV of the tabular
  // sections that carry column specs (empty sections are skipped).
  const handleExportAll = () => {
    const csv = buildCombinedCsv([
      { title: "Procurement History", csv: buildCsv(procurementRecords, PROCUREMENT_CSV_COLUMNS) },
      { title: "Recent Solicitations", csv: buildCsv(solicitations, SOLICITATIONS_CSV_COLUMNS) },
      { title: "DLA Demand Forecast", csv: buildCsv(demand?.forecast_curve ?? [], DEMAND_CSV_COLUMNS) },
    ]);
    triggerDownload(csv, `part-${partReqKey}-${todayIsoDate()}.csv`);
  };

  // ---- Print the whole record (works from tabs and linear) ----
  const loadAllSections = useCallback(async () => {
    const jobs: Promise<unknown>[] = [];
    if (tierMeets(tier, "advanced")) jobs.push(fetchProcurementHistory());
    if (tierMeets(tier, "advanced")) jobs.push(fetchSolicitations());
    if (tierMeets(tier, "basic")) jobs.push(fetchManufacturers());
    if (tierMeets(tier, "maximum")) jobs.push(fetchDemand());
    if (tierMeets(tier, "basic")) jobs.push(fetchTechnicalCharacteristics());
    if (tierMeets(tier, "basic")) jobs.push(fetchEndUseDescriptions());
    if (tierMeets(tier, "advanced")) jobs.push(fetchPackaging());
    if (tierMeets(tier, "basic")) jobs.push(fetchProcurementItemDescription());
    await Promise.all(jobs);
  }, [
    tier, isFreeOnly,
    fetchProcurementHistory, fetchSolicitations, fetchManufacturers, fetchDemand,
    fetchTechnicalCharacteristics, fetchEndUseDescriptions, fetchPackaging,
    fetchProcurementItemDescription,
  ]);

  const handlePrint = useCallback(async () => {
    setPreparingPrint(true);
    try {
      await loadAllSections();
    } finally {
      setPreparingPrint(false);
    }
    setExpandForPrint(true);
    setPrintRequested(true);
  }, [loadAllSections]);

  // Fire the print dialog once the expanded (all-sections) render has painted.
  useEffect(() => {
    if (!expandForPrint || !printRequested) return;
    setPrintRequested(false);
    const id = window.requestAnimationFrame(() => window.print());
    return () => window.cancelAnimationFrame(id);
  }, [expandForPrint, printRequested]);

  // Return to the on-screen layout after the print dialog closes.
  useEffect(() => {
    const done = () => setExpandForPrint(false);
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  // While preparing/printing, render every section stacked (linear) so the
  // whole record prints even from the tabbed layout.
  const effectiveLayout = expandForPrint ? "linear" : layout;

  const toolbar =
    tier === "advanced" ? (
      <DetailToolbar
        onPrint={handlePrint}
        onExportAll={layout === "linear" ? handleExportAll : undefined}
        printPreparing={preparingPrint}
      />
    ) : undefined;

  return (
    <div className="print-root bg-card-bg rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted-light">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
              <span className="truncate">{formatPartIdentity(part)}</span>
              {partNumberOnly && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-card-bg border border-border text-muted whitespace-nowrap shrink-0"
                  title="This DIBBS solicitation has no NSN — the part is identified by manufacturer CAGE and part number."
                >
                  P/N only — no NSN
                </span>
              )}
            </h2>
            {part.description && (
              <p className="text-xs text-muted truncate">{part.description}</p>
            )}
          </div>
        </div>
      </div>

      <DetailSections
        layout={effectiveLayout}
        sections={sections}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        toolbar={toolbar}
      />
    </div>
  );
}

// Overview Panel
interface OverviewPanelProps {
  part: PartDetailType;
  codeDefinitions: Record<string, string>;
  codeTypeNames: Record<string, string>;
  // Demand & Stock (Advanced tier) renders as a section on this tab. Data is
  // fetched eagerly by the parent on mount; these props feed the panel.
  showDemand?: boolean;
  demand?: PartDemand | null;
  isLoadingDemand?: boolean;
  demandError?: string | null;
  onRetryDemand?: () => void;
}

function OverviewPanel({ part, codeDefinitions, codeTypeNames, showDemand, demand, isLoadingDemand, demandError, onRetryDemand }: OverviewPanelProps) {
  // NSN-less (DIBBS part-number-only) parts have no NSN/NIIN/FSC; identify them
  // by manufacturer CAGE + part number instead (mirrors the legacy 'M'-class view).
  const identifiers = [
    { label: "NSN", value: formatNSN(part.nsn), mono: true, tooltip: null as string | null },
    { label: "NIIN", value: formatNiin(part.niin), mono: true, tooltip: null as string | null },
    { label: "FSC", value: part.fsc, mono: true, tooltip: part.fsc_description },
    ...(isPartNumberOnly(part)
      ? [
          { label: "CAGE", value: part.mfg_cage, mono: true, tooltip: null as string | null },
          { label: "Part Number", value: part.mfg_part_number, mono: true, tooltip: null as string | null },
        ]
      : []),
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
                <span className="font-mono font-medium text-primary">{formatPartIdentity(part)}</span>
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

      {/* Demand & Stock section (Advanced tier). Collapsible so the Overview
          tab stays scannable; auto-opens when there's an urgent buy signal. */}
      {showDemand && (
        <DemandOverviewSection
          demand={demand ?? null}
          isLoading={!!isLoadingDemand}
          error={demandError ?? null}
          onRetry={onRetryDemand ?? (() => {})}
        />
      )}
    </div>
  );
}

// ============================================================================
// Demand & Stock Panel (DLA forecast + inventory position; Advanced tier)
// ============================================================================
interface DemandPanelProps {
  demand: PartDemand | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

// Collapsible wrapper for the Overview tab: a compact header (signal chips +
// months-of-supply + freshness) that expands to the full DemandPanel. Auto-opens
// when the part carries an urgent buy signal (backorder / below reorder point)
// so those never hide behind a click; otherwise starts collapsed to keep the
// Overview tab tidy.
function DemandOverviewSection({ demand, isLoading, error, onRetry }: DemandPanelProps) {
  // `open` defaults to "follow the signal" (auto-open on an urgent buy signal)
  // until the user clicks, after which their explicit choice wins. Deriving it
  // this way avoids a setState-in-effect and still auto-opens when demand loads.
  const [override, setOverride] = useState<boolean | null>(null);
  const hasSignal = !!demand && (demand.on_backorder || demand.below_reorder_point === true);
  const open = override ?? hasSignal;
  const hasData = !!demand && (demand.has_stock || demand.has_forecast);

  return (
    <div className="pt-1 border-t border-border/60">
      <button
        type="button"
        onClick={() => setOverride(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 py-2 text-left group"
      >
        <svg
          className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-foreground">Demand &amp; Stock</span>

        {/* Collapsed summary (hidden once expanded to avoid duplication). */}
        {!open && (
          <span className="flex flex-wrap items-center gap-2 min-w-0">
            {isLoading && !demand ? (
              <span className="text-xs text-muted">Loading…</span>
            ) : hasData ? (
              <>
                {demand!.on_backorder && <DemandSignalChip kind="on_backorder" />}
                {demand!.below_reorder_point === true && <DemandSignalChip kind="below_reorder_point" />}
                {demand!.demand_type === "recurring" && <DemandSignalChip kind="recurring" />}
                {demand!.demand_type === "one_off" && <DemandSignalChip kind="one_off" />}
                {demand!.months_of_supply != null && (
                  <span className="text-xs text-muted">~{demand!.months_of_supply} mo of supply</span>
                )}
              </>
            ) : demand ? (
              <span className="text-xs text-muted">No DLA data on file</span>
            ) : null}
          </span>
        )}

        <span className="ml-auto text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          {open ? "Hide" : "View"}
        </span>
      </button>

      {open && (
        <div className="pt-1">
          <DemandPanel demand={demand} isLoading={isLoading} error={error} onRetry={onRetry} />
        </div>
      )}
    </div>
  );
}

// Colored signal chip, reusing the analytics tile palette (rose/amber/emerald/
// slate). Deliberately neutral, descriptive labels — not a pricing directive.
const DEMAND_CHIP_TONES = {
  rose: {
    box: "border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-500/5",
    dot: "bg-rose-500",
  },
  amber: {
    box: "border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-500/5",
    dot: "bg-amber-500",
  },
  emerald: {
    box: "border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-500/5",
    dot: "bg-emerald-500",
  },
  slate: {
    box: "border-slate-300 dark:border-slate-500/40 text-slate-700 dark:text-slate-300 bg-slate-50/60 dark:bg-slate-500/5",
    dot: "bg-slate-500",
  },
} as const;

// Central definition of each demand signal: its tone, label, and a plain-language
// explanation shown on hover (same tooltip affordance as the Part Codes cards).
// Keeping label + tip together here means every place that renders a chip stays
// consistent and self-documenting for the customer.
const DEMAND_SIGNAL_META = {
  on_backorder: {
    tone: "amber",
    label: "On backorder",
    tip: "DLA has orders for this item it hasn't been able to fill. Shortages like this often lead to expedited or priority buys.",
  },
  below_reorder_point: {
    tone: "rose",
    label: "Below reorder point",
    tip: "On-hand stock has dropped below the level at which DLA's system triggers a replenishment buy.",
  },
  recurring: {
    tone: "emerald",
    label: "Recurring demand",
    tip: "DLA has both a standing annual demand and a forward forecast for this item, so it's bought again and again — not a one-time purchase. Winning a recurring NSN can be worth pricing competitively for the repeat business.",
  },
  one_off: {
    tone: "slate",
    label: "One-off buy",
    tip: "DLA shows no ongoing annual demand and no forward forecast for this item, so this looks like a single purchase rather than a repeating stream.",
  },
  stock_falling: {
    tone: "amber",
    label: "Stock trending down",
    tip: "DLA's on-hand quantity has fallen across its recent monthly snapshots.",
  },
} as const;

function DemandSignalChip({ kind }: { kind: keyof typeof DEMAND_SIGNAL_META }) {
  const m = DEMAND_SIGNAL_META[kind];
  const t = DEMAND_CHIP_TONES[m.tone];
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${t.box}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
        {m.label}
      </span>
      {/* Explicit "?" affordance sits OUTSIDE the chip (only it is hoverable),
          mirroring the neutral "?" marker on the KPI tiles. */}
      <Tooltip content={m.tip}>
        <span
          aria-label={`What “${m.label}” means`}
          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-muted/40 text-[9px] font-semibold leading-none text-muted/70 hover:text-muted cursor-pointer"
        >
          ?
        </span>
      </Tooltip>
    </span>
  );
}

function DemandPanel({ demand, isLoading, error, onRetry }: DemandPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted">Loading demand intelligence...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-error mb-2">{error}</p>
        <button onClick={onRetry} className="text-xs text-primary hover:underline">Retry</button>
      </div>
    );
  }

  if (!demand) return null;

  const d = demand;

  if (!d.has_stock && !d.has_forecast) {
    return (
      <div className="text-center py-6 space-y-1">
        <p className="text-xs text-muted">No DLA demand or stock data is on file for this NIIN.</p>
        <p className="text-[11px] text-muted/70">
          Absence of a record is not the same as zero demand — DLA publishes forecasts for a subset of items.
        </p>
      </div>
    );
  }

  // Forecast chart + trend series (computed inline; no hooks after the guards above).
  const chartData = d.forecast_curve.map((p) => ({ label: formatForecastMonth(p.forecast_date), qty: p.forecast_qty }));
  const trendValues = d.trend_series.map((t) => t.total_stock ?? 0);

  // On-hand vs reorder-point bar (only meaningful when DLA publishes a ROP).
  const hasRop = d.reorder_point != null;
  const ropMax = Math.max(d.total_stock ?? 0, d.reorder_point ?? 0, 1);
  const stockPct = Math.min(((d.total_stock ?? 0) / ropMax) * 100, 100);
  const ropPct = Math.min(((d.reorder_point ?? 0) / ropMax) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Signal chips */}
      <div className="flex flex-wrap items-center gap-2">
        {d.on_backorder && <DemandSignalChip kind="on_backorder" />}
        {d.below_reorder_point === true && <DemandSignalChip kind="below_reorder_point" />}
        {d.demand_type === "recurring" && <DemandSignalChip kind="recurring" />}
        {d.demand_type === "one_off" && <DemandSignalChip kind="one_off" />}
        {d.stock_trend === "falling" && <DemandSignalChip kind="stock_falling" />}
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Months of supply"
          value={d.months_of_supply != null ? `${d.months_of_supply}` : "—"}
          subtitle="at DLA's annual demand rate"
          tooltip="On-hand stock divided by DLA's monthly demand (annual demand ÷ 12). Blank when DLA has not published an annual demand quantity."
        />
        <KPICard
          label="On hand"
          value={d.has_stock && d.total_stock != null ? formatNumber(d.total_stock) : "—"}
          subtitle="units DLA holds"
          tooltip="Units DLA had on hand at its latest wholesale inventory snapshot."
        />
        <KPICard
          label="Annual demand"
          value={d.annual_demand_qty != null ? formatNumber(d.annual_demand_qty) : "—"}
          subtitle="DLA ADQ (realized)"
          tooltip="DLA's annual demand quantity — the realized (backward-looking) annual usage rate."
        />
        <KPICard
          label="Forecast (12 mo)"
          value={d.has_forecast && d.forecast_next_12mo != null ? formatNumber(d.forecast_next_12mo) : "—"}
          subtitle={d.coverage_ratio != null ? `coverage ${d.coverage_ratio}×` : "projected demand"}
          tooltip="DLA's projected demand over the next 12 months. Coverage = on-hand ÷ forecast; below 1× means DLA holds less than it expects to need."
        />
      </div>

      {/* On-hand vs reorder point */}
      {hasRop && (
        <div className="bg-card-bg rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-card-foreground">On hand vs. reorder point</h3>
            {d.rop_gap != null && d.rop_gap > 0 && (
              <span className="text-xs text-muted">Gap to reorder point: {formatNumber(d.rop_gap)} units</span>
            )}
          </div>
          <div className="relative h-4 rounded-full bg-muted/20 overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 ${d.below_reorder_point ? "bg-rose-500" : "bg-emerald-500"}`}
              style={{ width: `${stockPct}%` }}
            />
            <div className="absolute inset-y-0 w-0.5 bg-foreground/70" style={{ left: `${ropPct}%` }} title="Reorder point" />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-xs text-muted">
            <span>On hand: {formatNumber(d.total_stock)}</span>
            <span>Reorder point: {formatNumber(d.reorder_point)}</span>
          </div>
        </div>
      )}

      {/* Forecast curve */}
      {d.has_forecast && chartData.length > 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-1">DLA demand forecast</h3>
          <p className="text-xs text-muted mb-4">
            Projected monthly demand{d.forecast_total_24mo != null ? ` — ${formatNumber(d.forecast_total_24mo)} units over 24 months` : ""}
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                interval={chartData.length > 12 ? 1 : 0}
                minTickGap={4}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={44}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--card-foreground)",
                  fontSize: "12px",
                }}
                formatter={(value) => formatNumber(Number(value))}
              />
              <Bar dataKey="qty" name="Forecast qty" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-card-bg rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-1">DLA demand forecast</h3>
          <p className="text-xs text-muted">No DLA forecast is on file for this NIIN (absence is not zero demand).</p>
        </div>
      )}

      {/* Stock trend sparkline (only meaningful with multiple snapshots) */}
      {trendValues.length >= 2 && (
        <div className="bg-card-bg rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">Stock trend</h3>
              <p className="text-xs text-muted">On-hand across monthly DLA snapshots</p>
            </div>
            <div className={d.stock_trend === "falling" ? "text-rose-500" : d.stock_trend === "rising" ? "text-emerald-500" : "text-muted"}>
              <DemandSparkline values={trendValues} />
            </div>
          </div>
        </div>
      )}

      {/* Freshness + caveats */}
      <div className="text-[11px] text-muted/80 leading-relaxed space-y-1 pt-1">
        <p>
          {d.has_stock && (
            <>DLA inventory position as of <span className="font-medium">{formatDemandDate(d.stock_as_of_date)}</span>. </>
          )}
          {d.has_forecast && (
            <>Forecast released <span className="font-medium">{formatDemandDate(d.forecast_data_date)}</span>. </>
          )}
          Figures are DLA estimates published monthly and are not a guarantee of a solicitation.
        </p>
        <p>
          <Link href="/help/demand-intelligence" className="text-primary hover:underline">
            How to read demand &amp; stock data →
          </Link>
        </p>
      </div>
    </div>
  );
}

// Inline sparkline for the stock-trend snapshot history (currentColor stroke,
// mirrors the analytics Sparkline recipe).
function DemandSparkline({ values }: { values: number[] }) {
  if (!values.length) return <span className="text-muted text-xs">—</span>;
  const max = Math.max(...values, 1);
  const w = 96;
  const h = 24;
  const stepX = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

// Compact one-line demand-context strip shown above the Recent Solicitations
// table, so the bid decision has DLA demand/stock context in view. Reuses the
// signal chips; renders nothing until demand data (with signals worth noting)
// is available. Neutral labels only — no pricing directive.
function DemandContextStrip({ demand, onViewDemand }: { demand?: PartDemand | null; onViewDemand?: () => void }) {
  if (!demand || (!demand.has_stock && !demand.has_forecast)) return null;
  const d = demand;
  const chips: ReactNode[] = [];
  if (d.on_backorder) chips.push(<DemandSignalChip key="bo" kind="on_backorder" />);
  if (d.below_reorder_point === true) chips.push(<DemandSignalChip key="rop" kind="below_reorder_point" />);
  if (d.demand_type === "recurring") chips.push(<DemandSignalChip key="rec" kind="recurring" />);
  if (d.demand_type === "one_off") chips.push(<DemandSignalChip key="one" kind="one_off" />);
  // Nothing worth surfacing (e.g. unknown demand type, no signals): stay quiet.
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted-light/50 px-3 py-2">
      <span className="text-xs text-muted font-medium">DLA demand context:</span>
      {chips}
      {d.months_of_supply != null && (
        <span className="text-xs text-muted">· ~{d.months_of_supply} mo of supply</span>
      )}
      {onViewDemand && (
        <button type="button" onClick={onViewDemand} className="ml-auto text-xs text-primary hover:underline">
          Demand &amp; stock →
        </button>
      )}
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
  // Demand context for the bid decision (Advanced tier). Reuses the same
  // /demand endpoint the Demand tab uses — the panel ensures it is fetched.
  demand?: PartDemand | null;
  onEnsureDemand?: () => void;
  onViewDemand?: () => void;
}

function SolicitationsPanel({ solicitations, totalCount, isLoading, error, onRetry, demand, onEnsureDemand, onViewDemand }: SolicitationsPanelProps) {
  // Pull demand context once when this tab mounts so the strip can render
  // alongside the opportunities without the user opening the Demand tab.
  useEffect(() => {
    onEnsureDemand?.();
  }, [onEnsureDemand]);
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
  const [contractModal, setContractModal] = useState<SolicitationAward | null>(null);

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
        header: "Status / Contract #",
        cell: ({ row }) => {
          const award = row.original.award;
          return award?.contract_number ? (
            <button
              type="button"
              title="View contract details"
              onClick={(e) => {
                e.stopPropagation();
                setContractModal(award);
              }}
              className="text-xs font-mono font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
            >
              {award.contract_number}
            </button>
          ) : (
            <span className="text-xs font-medium text-foreground">{row.original.status || "—"}</span>
          );
        },
      },
      {
        id: "rating",
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => <DpasRatingTooltip rating={row.original.rating} />,
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
        cell: ({ row }) => {
          const buyer = row.original.buyer_name;
          if (!buyer) return <span className="text-xs text-muted">—</span>;
          // Some SAM buyers aren't a name but a long "how to contact the right
          // person" blurb (up to a few hundred chars). Trim to 25 chars and
          // reveal the full text on hover.
          if (buyer.length <= 25) {
            return <span className="text-xs font-medium text-foreground">{buyer}</span>;
          }
          return (
            <Tooltip content={buyer}>
              <span className="text-xs font-medium text-foreground">{`${buyer.slice(0, 25)}…`}</span>
            </Tooltip>
          );
        },
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
      <DemandContextStrip demand={demand} onViewDemand={onViewDemand} />
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
      {/* Contract-details modal — opened from the contract number in the
          "Status / Contract #" column when the solicitation has been awarded. */}
      {contractModal && (
        <Modal
          isOpen={true}
          onClose={() => setContractModal(null)}
          title={`Contract ${contractModal.contract_number ?? ""}`.trim()}
          size="md"
        >
          <div className="flex flex-col gap-6">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Awardee
              </h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Vendor</dt>
                <dd className="font-medium text-foreground">
                  {contractModal.awardee_name || "—"}
                </dd>
                <dt className="text-muted-foreground">CAGE</dt>
                <dd className="font-mono text-foreground">{contractModal.awardee_cage || "—"}</dd>
              </dl>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Award
              </h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Award date</dt>
                <dd className="text-foreground">{formatContractDate(contractModal.award_date) || "—"}</dd>
                <dt className="text-muted-foreground">Quantity</dt>
                <dd className="text-foreground">
                  {contractModal.quantity != null
                    ? `${contractModal.quantity.toLocaleString()}${contractModal.unit_of_measure ? ` ${contractModal.unit_of_measure}` : ""}`
                    : "—"}
                </dd>
                <dt className="text-muted-foreground">Unit price</dt>
                <dd className="text-foreground">
                  {contractModal.unit_price != null ? formatCurrency(contractModal.unit_price) : "—"}
                </dd>
                <dt className="text-muted-foreground">Total value</dt>
                <dd className="font-semibold text-foreground">
                  {contractModal.total_value != null ? formatCurrency(contractModal.total_value) : "—"}
                </dd>
              </dl>
            </section>
          </div>
        </Modal>
      )}
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
  /** parts.id — travels with an RFQ selection so the line item can link back
   * to this part (rfq_line_items.part_id). NSN-less parts have only this. */
  partId: number;
  /** parts.description — travels with an RFQ selection so vendors see a
   * readable item name, not just a part number. */
  partDescription: string | null;
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

function ManufacturersPanel({ nsn, partId, partDescription, manufacturers, totalCount, isLoading, error, onRetry }: ManufacturersPanelProps) {
  // RFQ is a separate paid product; only surface the entry when the user holds it.
  const { hasProductAccess } = useAuth();
  const canSendRfq = hasProductAccess("request_for_quote");

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
          part_id: partId,
          description: partDescription,
        })),
    [manufacturers, selectedKeys, nsn, partId, partDescription]
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
        const statusLabel = formatSamStatus(row.original.sam_status);
        const expiry = row.original.registration_expiration_date;
        const isExpired =
          expiry !== null && new Date(expiry) < new Date(new Date().toDateString());
        const disabledReason = eligible
          ? ""
          : !statusLabel
            ? "No SAM.gov registration found for this CAGE code — RFQs can only be sent to actively registered vendors."
            : statusLabel.toLowerCase() === "active"
              // sam_status is 'A' but the vendor is still ineligible: the
              // registration lapsed by date, or the vendor is excluded/debarred.
              // Don't claim it's "active" — name the expiry when that's the cause.
              ? isExpired
                ? "Vendor's SAM.gov registration has expired — RFQs can only be sent to actively registered vendors."
                : "Vendor's SAM.gov registration is not active — RFQs can only be sent to actively registered vendors."
              : `Vendor's SAM.gov registration is ${statusLabel.toLowerCase()} — RFQs can only be sent to actively registered vendors.`;
        return (
          <Tooltip content={disabledReason}>
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
              className={!eligible ? "opacity-40 cursor-not-allowed" : undefined}
            />
          </Tooltip>
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
        {canSendRfq ? (
          <button
            type="button"
            disabled={selectedKeys.size === 0}
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create RFQ{selectedKeys.size > 0 ? ` (${selectedKeys.size})` : ""}
          </button>
        ) : (
          // Vendor RFQ is a separate paid add-on; upsell customers who have
          // advanced access (they can see this tab) but not the RFQ product.
          <Link
            href="/pricing"
            title="Add Vendor RFQ to email quote requests to these vendors"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary/40 hover:text-primary"
          >
            <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span>Unlock <span className="font-semibold text-primary">RFQ</span></span>
            <span aria-hidden>→</span>
          </Link>
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

  // The backend concatenates the CTDF description text with SDDT text blocks
  // rendered as <a class="sddt-link"> links to a separate page. We strip those
  // anchors out of the CTDF HTML and render each SDDT block as a click-to-open
  // popover (see SddtPopover) sourced from the structured sddt_blocks data —
  // no navigation to another page.
  const ctdfHtml = stripSddtLinks(description.description);
  const sddtBlocks = description.sddt_blocks ?? [];

  return (
    <div className="text-xs text-foreground py-1.5 px-2.5 rounded border border-border/50 bg-card">
      {ctdfHtml && (
        <div
          className="procurement-description"
          dangerouslySetInnerHTML={{ __html: ctdfHtml }}
        />
      )}
      {sddtBlocks.length > 0 && (
        <div className={`flex flex-col items-start gap-1 ${ctdfHtml ? "mt-2" : ""}`}>
          {sddtBlocks.map((block) => (
            <SddtPopover key={block.id} block={block} />
          ))}
        </div>
      )}
    </div>
  );
}

// Remove the server-rendered SDDT anchor links (and any trailing line breaks
// they leave behind) from the procurement description HTML, leaving just the
// CTDF text. Uses the DOM rather than a regex so titles/attributes containing
// '>' can't break parsing. Falls back to the raw HTML during SSR.
function stripSddtLinks(html: string): string {
  if (typeof document === "undefined") return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll("a.sddt-link").forEach((el) => el.remove());
  // Trim trailing <br> / whitespace text nodes left after removing the links.
  let node: ChildNode | null = container.lastChild;
  while (
    node &&
    ((node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "BR") ||
      (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()))
  ) {
    const prev = node.previousSibling;
    container.removeChild(node);
    node = prev;
  }
  return container.innerHTML.trim();
}

// Click-to-open popover for a single SDDT (Supplemental Data Definition Text)
// block. Replaces the old link that navigated to /library/parts/viewsddt and
// the native title-attribute tooltip. Positioned with fixed coordinates (like
// CodeTooltip) to avoid overflow clipping; closes on outside click or Escape.
function SddtPopover({ block }: { block: SDDTBlock }) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position the popover once it is open and measured.
  useEffect(() => {
    if (!open || !triggerRef.current || !popoverRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = popoverRect.width || 320;
    const height = popoverRect.height || 240;
    const spacing = 6;

    // Left-align to the trigger, clamped to the viewport.
    const left = Math.max(8, Math.min(triggerRect.left, viewportWidth - width - 8));

    // Prefer below the trigger; flip above when there isn't room.
    const spaceBelow = viewportHeight - triggerRect.bottom;
    let top =
      spaceBelow >= height + spacing || spaceBelow >= triggerRect.top
        ? triggerRect.bottom + spacing
        : triggerRect.top - height - spacing;
    top = Math.max(8, Math.min(top, viewportHeight - height - 8));

    setPopoverStyle({ position: "fixed", left: `${left}px`, top: `${top}px`, zIndex: 9999 });
  }, [open]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !popoverRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-left text-primary underline decoration-dotted hover:decoration-solid cursor-pointer"
      >
        {block.title}
      </button>
      {open && (
        <div
          ref={popoverRef}
          style={popoverStyle}
          role="dialog"
          aria-label={block.title}
          className="fixed w-80 max-w-[90vw] rounded shadow-lg bg-card-bg border border-border text-foreground"
        >
          <div className="flex items-start justify-between gap-2 px-2.5 py-1.5 bg-muted-light border-b border-border">
            <span className="font-semibold text-xs">{block.title}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted hover:text-foreground text-sm leading-none shrink-0"
            >
              &times;
            </button>
          </div>
          <div className="p-2.5 max-h-72 overflow-auto">
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-foreground">
              {block.text_content}
            </pre>
          </div>
        </div>
      )}
    </>
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
