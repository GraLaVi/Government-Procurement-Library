"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRecentActions } from "@/lib/hooks/useRecentActions";
import type { RecentActionEntry } from "@/lib/preferences/types";

const MAX_ROWS = 8;

interface ResolvedSearch {
  id: number;
  kind: "parts" | "vendor";
  queryType: string;
  query: string;
  href: string;
  actionedAt: string;
}

function buildPartsHref(queryType: string, query: string): string {
  // Older recent_actions rows may carry the legacy 'nsn' or 'niin' value;
  // the parts page only accepts the normalized 'nsn_niin' search_type.
  const normalized = queryType === "nsn" || queryType === "niin" ? "nsn_niin" : queryType;
  return `/library/parts?search_type=${encodeURIComponent(normalized)}&q=${encodeURIComponent(query)}`;
}

function buildVendorHref(queryType: string, query: string): string {
  if (queryType === "cage") return `/library/vendor-search?cage_code=${encodeURIComponent(query)}`;
  if (queryType === "uei") return `/library/vendor-search?uei=${encodeURIComponent(query)}`;
  return `/library/vendor-search?q=${encodeURIComponent(query)}`;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function prettifyQueryType(kind: "parts" | "vendor", queryType: string): string {
  const upper = queryType.toUpperCase();
  if (kind === "parts") {
    if (queryType === "nsn_niin" || queryType === "nsn" || queryType === "niin") return "NSN/NIIN";
    if (queryType === "mfg_part_number") return "Mfg P/N";
    if (queryType === "contract_number") return "Contract #";
    if (queryType === "solicitation") return "Solicitation";
    if (queryType === "description") return "Description";
    return upper;
  }
  if (queryType === "cage") return "CAGE";
  if (queryType === "uei") return "UEI";
  if (queryType === "entity_name") return "Name";
  return upper;
}

function resolve(
  entries: RecentActionEntry[],
  kind: "parts" | "vendor",
): ResolvedSearch[] {
  return entries
    .map((e) => {
      const queryType = String(e.action_data?.query_type ?? "").toLowerCase();
      const query = String(e.action_data?.query ?? "");
      if (!queryType || !query) return null;
      return {
        id: e.id,
        kind,
        queryType,
        query,
        href: kind === "parts" ? buildPartsHref(queryType, query) : buildVendorHref(queryType, query),
        actionedAt: e.actioned_at,
      };
    })
    .filter((x): x is ResolvedSearch => x !== null);
}

export function RecentSearches() {
  const parts = useRecentActions("parts_search");
  const vendors = useRecentActions("vendor_search");

  const merged = useMemo(() => {
    const all = [...resolve(parts.actions, "parts"), ...resolve(vendors.actions, "vendor")];
    all.sort((a, b) => new Date(b.actionedAt).getTime() - new Date(a.actionedAt).getTime());
    return all.slice(0, MAX_ROWS);
  }, [parts.actions, vendors.actions]);

  if (parts.isLoading || vendors.isLoading) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-5">
        <h2 className="text-base font-semibold text-foreground mb-3">Recent searches</h2>
        <div className="text-sm text-muted">Loading…</div>
      </div>
    );
  }

  if (merged.length === 0) return null;

  return (
    <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Recent searches</h2>
      </div>
      <ul className="divide-y divide-border">
        {merged.map((row) => (
          <li
            key={`${row.kind}-${row.id}`}
            className="px-5 py-3 flex items-center gap-3 hover:bg-muted-light/30 transition-colors"
          >
            <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
              {row.kind === "parts" ? "Parts" : "Vendor"}
            </span>
            <span className="text-xs text-muted shrink-0">
              {prettifyQueryType(row.kind, row.queryType)}
            </span>
            <span className="font-mono text-sm text-foreground truncate flex-1 min-w-0">
              {row.query}
            </span>
            <span className="text-xs text-muted shrink-0 whitespace-nowrap">
              {relativeTime(row.actionedAt)}
            </span>
            <Link
              href={row.href}
              className="text-primary text-xs font-medium hover:underline shrink-0"
            >
              Re-run →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
