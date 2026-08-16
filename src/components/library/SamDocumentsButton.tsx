"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  SamOpportunityDocument,
  SamOpportunityDocumentsResponse,
  formatSolicitationNumber,
} from "@/lib/library/types";
import { Modal } from "@/components/ui/Modal";
import { RowBadge } from "@/components/library/RowBadge";

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n >= 10 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

// NECO — the Navy Electronic Commerce Online portal — is where Navy solicitation
// packages actually live. SAM.gov notices for them carry a link out to NECO
// rather than the documents themselves, so these entries leave SAM entirely and
// land on a different portal; the badge says so before the click.
const NECO_HOST = /(^|\.)neco\.navy\.mil$/i;

// What a NECO link is really addressing, read off its query string. The `soln`
// parameter carries the solicitation number the link opens — including the
// revision suffix (…FE380001), which is how one notice can link to several
// amendments of the same solicitation. It is far more use than the URL, whose
// filename half ("840-v5soln.aspx?soln=…") is what the row would otherwise show
// for these items, since SAM sends them to us with no name at all.
function describeLink(url: string | null | undefined): { isNeco: boolean; soln: string | null } {
  if (!url) return { isNeco: false, soln: null };
  try {
    const parsed = new URL(url);
    return {
      isNeco: NECO_HOST.test(parsed.hostname),
      soln: parsed.searchParams.get("soln"),
    };
  } catch {
    // Not a parseable absolute URL — nothing to read, and the raw name stands.
    return { isNeco: false, soln: null };
  }
}

// Documents affordance for a SAM.gov opportunity row. A SAM opportunity can carry
// many attachments, so instead of the single-PDF modal used for DLA solicitations
// this opens a dropdown listing every viewable document. PDFs open in an inline
// viewer, other stored files download, and external links open in a new tab. The
// dropdown is portaled to <body> so the surrounding table's overflow can't clip it.
//
// Shared by the parts "Recent Solicitations" and vendor "Open Solicitations" tabs.
export function SamDocumentsButton({ oppId, count, label }: { oppId: number; count: number; label: string }) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<SamOpportunityDocument[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<{ url: string; name: string } | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/library/sam-opportunities/${oppId}/documents`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load documents");
      setDocs((data as SamOpportunityDocumentsResponse).documents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [oppId]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) setCoords({ top: rect.bottom + 4, left: rect.left });
      if (docs === null && !loading) fetchDocs();
    }
  };

  // Close on outside click or Escape while the dropdown is open.
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

  const openDoc = (doc: SamOpportunityDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const fileUrl = `/api/library/sam-opportunities/${oppId}/documents/${doc.item_id}`;
    if (doc.kind === "link" && doc.link_url) {
      window.open(doc.link_url, "_blank", "noopener,noreferrer");
      setOpen(false);
    } else if (doc.is_pdf) {
      setPdfDoc({ url: fileUrl, name: doc.name });
      setOpen(false);
    } else {
      // Non-PDF stored file: let the browser download it (server sends attachment).
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title={`${count} document${count === 1 ? "" : "s"}`}
        className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-semibold text-primary hover:bg-primary/10 cursor-pointer shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
        </svg>
        {count}
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-80 max-h-80 overflow-y-auto rounded-md border border-border bg-background shadow-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted border-b border-border/60">
            Documents · {label}
          </div>
          {loading && <div className="px-3 py-3 text-xs text-muted">Loading documents…</div>}
          {error && <div className="px-3 py-3 text-xs text-error">{error}</div>}
          {!loading && !error && docs && docs.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted">No viewable documents.</div>
          )}
          {!loading && !error && docs && docs.map((doc) => {
            const { isNeco, soln } = describeLink(doc.link_url);
            // A link that names the solicitation it opens beats the tail of its
            // own URL, which is all these rows have otherwise.
            const title = soln ? formatSolicitationNumber(soln) : doc.name;
            return (
            <button
              key={doc.item_id}
              type="button"
              onClick={(e) => openDoc(doc, e)}
              title={doc.link_url ?? doc.name}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/10 cursor-pointer"
            >
              <span className="shrink-0 text-muted">
                {doc.kind === "link" ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-medium text-foreground truncate">{title}</span>
                  {isNeco && (
                    <RowBadge tone="indigo" title="Opens on NECO, the Navy's own solicitation portal">
                      NECO
                    </RowBadge>
                  )}
                </span>
                <span className="block text-[10px] text-muted">
                  {doc.kind === "link" ? "External link" : (doc.is_pdf ? "PDF" : "Download")}
                  {formatBytes(doc.size) ? ` · ${formatBytes(doc.size)}` : ""}
                </span>
              </span>
            </button>
            );
          })}
        </div>,
        document.body
      )}
      {pdfDoc && (
        <Modal isOpen={true} onClose={() => setPdfDoc(null)} title={pdfDoc.name} size="full">
          <div className="flex flex-col gap-2">
            <a href={pdfDoc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              Open in new tab
            </a>
            <iframe src={pdfDoc.url} title={pdfDoc.name} className="w-full border border-border rounded min-h-[70vh]" />
          </div>
        </Modal>
      )}
    </>
  );
}
