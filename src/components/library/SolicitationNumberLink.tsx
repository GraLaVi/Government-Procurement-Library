"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import {
  PartSearchResult,
  PartSearchResponse,
  formatNSN,
  formatCurrency,
} from "@/lib/library/types";

interface SolicitationNumberLinkProps {
  solicitationNumber: string;
  className?: string;
  children?: React.ReactNode;
}

function buildSearchPageUrl(solicitationNumber: string): string {
  const params = new URLSearchParams({
    search_type: "solicitation",
    q: solicitationNumber,
  });
  return `/library/parts?${params.toString()}`;
}

export function SolicitationNumberLink({
  solicitationNumber,
  className,
  children,
}: SolicitationNumberLinkProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PartSearchResult[]>([]);
  const [total, setTotal] = useState(0);

  // Track whether we've already fetched for this modal open so reopening reuses state
  const lastFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (lastFetchedRef.current === solicitationNumber) return;

    const controller = new AbortController();

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          solicitation: solicitationNumber,
          limit: "50",
          offset: "0",
        });
        const res = await fetch(`/api/library/parts/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const data: PartSearchResponse = await res.json();
        setResults(data.results);
        setTotal(data.total);
        lastFetchedRef.current = solicitationNumber;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load parts");
        setResults([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [isOpen, solicitationNumber]);

  const searchPageUrl = buildSearchPageUrl(solicitationNumber);
  const displayText = children ?? solicitationNumber;
  const buttonClass =
    className ??
    "text-primary hover:text-primary/80 hover:underline cursor-pointer";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClass}
        title={`View parts matching solicitation ${solicitationNumber}`}
      >
        {displayText}
      </button>

      {isOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsOpen(false)}
          title={`Parts matching solicitation ${solicitationNumber}`}
          size="full"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted">
                {isLoading
                  ? "Loading…"
                  : error
                  ? ""
                  : total === 0
                  ? "No matching parts found"
                  : `${total.toLocaleString()} match${total === 1 ? "" : "es"}`}
              </div>
              <Link
                href={searchPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 hover:underline"
              >
                Open in new tab
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Link>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-lg border border-border">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="p-4 text-sm text-error">{error}</div>
              ) : results.length === 0 ? (
                <div className="p-6 text-sm text-muted text-center">
                  No parts found for this solicitation.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted-light/50 sticky top-0">
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wider">
                        NSN
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wider">
                        Description
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap">
                        Qty / Unit
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted uppercase tracking-wider">
                        Unit Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results.map((p) => (
                      <tr key={p.id} className="hover:bg-muted-light/30">
                        <td className="px-4 py-2 font-mono font-semibold text-primary whitespace-nowrap">
                          {formatNSN(p.nsn) || p.nsn}
                        </td>
                        <td
                          className="px-4 py-2 text-foreground truncate max-w-[280px] md:max-w-[480px]"
                          title={p.description || undefined}
                        >
                          {p.description || "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-foreground whitespace-nowrap">
                          {p.quantity != null
                            ? `${p.quantity.toLocaleString()}${p.unit_of_issue ? `/${p.unit_of_issue}` : ""}`
                            : p.unit_of_issue || "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-foreground whitespace-nowrap">
                          {formatCurrency(p.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!isLoading && !error && total > results.length && (
              <div className="text-xs text-muted text-center">
                Showing first {results.length.toLocaleString()} of {total.toLocaleString()}. Open in
                new tab to paginate.
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
