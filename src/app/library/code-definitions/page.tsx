"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";

interface CodeDefinitionItem {
  code_value: string;
  code_value_full: string;
  description: string;
  code_name: string | null;
  extended_text: string | null;
}

interface CodeDefinitionsByType {
  code_type: string;
  code_name: string | null;
  codes: CodeDefinitionItem[];
}

interface AllCodeDefinitionsResponse {
  code_types: CodeDefinitionsByType[];
  total_count: number;
}

// Code type display names mapping
// Fallback only - the API sends the authoritative name from
// library_code_definitions.code_name. Keep these in sync with that table.
const CODE_TYPE_NAMES: Record<string, string> = {
  'AMC': 'Acquisition Method Code',
  'CDMC': 'Cushioning and Dunnage Material Codes',
  'CPC': 'Cleaning Procedure Codes',
  'CPMC': 'Contact Preservative Material Codes',
  'DDC': 'Document Data Code',
  'FLIS': 'FLIS NSN Status Codes',
  'FSC': 'Federal Supply Classification',
  'IDS': 'Product Item Description Indicator',
  'OPIC': 'Optional Procedure Indicator Codes',
  'PIC': 'Place of Inspection Code',
  'PKGC': 'DLA Packaging Class',
  'PMC': 'Preservation Method Codes',
  'QUPC': 'Quantity Per Unit Pack Codes',
  'RNCC': 'Reference Number Category Code',
  'RNVC': 'Reference Number Variation Code',
  'SLC': 'Shelf Life Code',
  'TCDC': 'Thickness of Cushioning or Dunnage Codes',
  'UICC': 'Unit and Intermediate Container Codes',
  'WMC': 'Wrapping Material Codes',
};

export default function CodeDefinitionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading…</div>}>
      <CodeDefinitionsPageContent />
    </Suspense>
  );
}

function CodeDefinitionsPageContent() {
  const searchParams = useSearchParams();
  const targetCodeType = searchParams.get('code_type');
  const targetCodeValue = searchParams.get('code_value');
  
  const [codeDefinitions, setCodeDefinitions] = useState<AllCodeDefinitionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const targetRef = useRef<HTMLDivElement>(null);

  // Fetch code definitions
  useEffect(() => {
    const fetchCodeDefinitions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth('/api/library/code-definitions');
        
        // Check if response is ok before trying to parse JSON
        if (!response.ok) {
          let errorMessage = 'Failed to load code definitions';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.detail || errorMessage;
          } catch (parseError) {
            // If response is not JSON, use status text
            errorMessage = response.statusText || `Error ${response.status}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setCodeDefinitions(data as AllCodeDefinitionsResponse);
      } catch (err) {
        console.error('Code definitions error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load code definitions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCodeDefinitions();
  }, []);

  // Scroll to target code when query params are present
  useEffect(() => {
    if (targetCodeType && targetCodeValue && codeDefinitions && targetRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  }, [targetCodeType, targetCodeValue, codeDefinitions]);

  // Prefer the name the API returns; fall back to the local map when it sends none
  const getCodeTypeDisplayName = (group: CodeDefinitionsByType): string => {
    return group.code_name || CODE_TYPE_NAMES[group.code_type] || group.code_type;
  };

  const isTargetCode = (codeType: string, codeValue: string): boolean => {
    return targetCodeType === codeType && targetCodeValue === codeValue;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Code Definitions</h1>
        <p className="text-muted">
          Complete reference for all library code definitions used in packaging and procurement information.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted">Loading code definitions...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {codeDefinitions && !isLoading && (
        <div className="space-y-4">
          {codeDefinitions.code_types.map((codeTypeGroup) => (
            <div key={codeTypeGroup.code_type} className="bg-card-bg rounded-lg border border-border p-4">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {getCodeTypeDisplayName(codeTypeGroup)}
                {codeTypeGroup.code_type !== getCodeTypeDisplayName(codeTypeGroup) && (
                  <span className="text-sm font-normal text-muted ml-2">
                    ({codeTypeGroup.code_type})
                  </span>
                )}
              </h2>
              
              <div className="space-y-1">
                {codeTypeGroup.codes.map((code, index) => {
                  const isTarget = isTargetCode(codeTypeGroup.code_type, code.code_value);
                  return (
                    <div
                      key={`${codeTypeGroup.code_type}-${code.code_value}-${index}`}
                      ref={isTarget ? targetRef : null}
                      className={`pl-4 py-1 rounded ${
                        isTarget 
                          ? 'bg-primary/10 border-l-4 border-primary' 
                          : 'hover:bg-muted-light'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-medium text-primary">
                          {code.code_value_full || `${codeTypeGroup.code_type} ${code.code_value}`}
                        </span>
                        <span className="text-foreground">:</span>
                        <span className="text-foreground flex-1">{code.description}</span>
                      </div>
                      {code.extended_text && (
                        <div className="mt-1 pl-6 text-sm text-muted">
                          {code.extended_text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          <div className="text-center text-sm text-muted pt-4">
            Total: {codeDefinitions.total_count} code definitions across {codeDefinitions.code_types.length} code types
          </div>
        </div>
      )}
    </div>
  );
}
