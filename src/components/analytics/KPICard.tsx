"use client";

import Link from 'next/link';
import { Tooltip } from '@/components/ui/Tooltip';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  source?: string;
  href?: string;
  tooltip?: string;
}

export function KPICard({ label, value, subtitle, source, href, tooltip }: KPICardProps) {
  const labelNode = tooltip ? (
    <div className="text-sm text-muted mb-1 inline-flex items-center gap-1">
      <span>{label}</span>
      <Tooltip content={tooltip}>
        <span
          aria-label="More info"
          className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-muted/40 text-[10px] font-semibold text-muted/70 leading-none"
        >
          ?
        </span>
      </Tooltip>
    </div>
  ) : (
    <div className="text-sm text-muted mb-1">{label}</div>
  );

  const content = (
    <>
      {labelNode}
      <div className="text-2xl font-bold text-card-foreground">{value}</div>
      {subtitle && (
        <div className="text-sm text-muted mt-1">{subtitle}</div>
      )}
      {source && (
        <div className="text-xs text-muted/70 mt-2">{source}</div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block bg-card-bg rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-sm transition-all"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border p-6">
      {content}
    </div>
  );
}
